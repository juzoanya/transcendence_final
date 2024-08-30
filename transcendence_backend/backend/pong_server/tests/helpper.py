import asyncio
import logging
import time
import traceback
import inspect
from channels.consumer import SyncConsumer
from channels.layers import get_channel_layer

def is_double_callable(application):
    """
    Tests to see if an application is a legacy-style (double-callable) application.
    """
    # Look for a hint on the object first
    if getattr(application, "_asgi_single_callable", False):
        return False
    if getattr(application, "_asgi_double_callable", False):
        return True
    # Uninstanted classes are double-callable
    if inspect.isclass(application):
        return True
    # Instanted classes depend on their __call__
    if hasattr(application, "__call__"):
        # We only check to see if its __call__ is a coroutine function -
        # if it's not, it still might be a coroutine function itself.
        if inspect.iscoroutinefunction(application.__call__):
            return False
    # Non-classes we just check directly
    return not inspect.iscoroutinefunction(application)

def double_to_single_callable(application):
    """
    Transforms a double-callable ASGI application into a single-callable one.
    """

    async def new_application(scope, receive, send):
        instance = application(scope)
        return await instance(receive, send)

    return new_application

def guarantee_single_callable(application):
    """
    Takes either a single- or double-callable application and always returns it
    in single-callable style. Use this to add backwards compatibility for ASGI
    2.0 applications to your server/test harness/etc.
    """
    if is_double_callable(application):
        application = double_to_single_callable(application)
    return application


logger = logging.getLogger(__name__)


"""
Base server class that handles basic concepts like application instance
creation/pooling, exception handling, and similar, for stateless protocols
(i.e. ones without actual incoming connections to the process)

Your code should override the handle() method, doing whatever it needs to,
and calling get_or_create_application_instance with a unique `scope_id`
and `scope` for the scope it wants to get.

If an application instance is found with the same `scope_id`, you are
given its input queue, otherwise one is made for you with the scope provided
and you are given that fresh new input queue. Either way, you should do
something like:

input_queue = self.get_or_create_application_instance(
    "user-123456",
    {"type": "testprotocol", "user_id": "123456", "username": "andrew"},
)
input_queue.put_nowait(message)

If you try and create an application instance and there are already
`max_application` instances, the oldest/least recently used one will be
reclaimed and shut down to make space.

Application coroutines that error will be found periodically (every 100ms
by default) and have their exceptions printed to the console. Override
application_exception() if you want to do more when this happens.

If you override run(), make sure you handle things like launching the
application checker.
"""


class Worker:
    application_checker_interval = 0.1
    def __init__(self, application, channels, channel_layer, max_applications=1000):

        # Parameters
        self.application = application
        self.max_applications = max_applications
        # Initialisation
        self.application_instances = {}
        self.channels = channels
        self.channel_layer = channel_layer
        if self.channel_layer is None:
            raise ValueError("Channel layer is not valid")

    async def handle(self):
        """
        Listens on all the provided channels and handles the messages.
        """
        # For each channel, launch its own listening coroutine
        listeners = []
        for channel in self.channels:
            listeners.append(asyncio.ensure_future(self.listener(channel)))
        # Wait for them all to exit
        await asyncio.wait(listeners)
        # See if any of the listeners had an error (e.g. channel layer error)
        [listener.result() for listener in listeners]

    async def listener(self, channel):
        """
        Single-channel listener
        """
        while True:
            message = await self.channel_layer.receive(channel)
            if not message.get("type", None):
                raise ValueError("Worker received message with no type.")
            # Make a scope and get an application instance for it
            scope = {"type": "channel", "channel": channel}
            instance_queue = self.get_or_create_application_instance(channel, scope)
            # Run the message into the app
            await instance_queue.put(message)

    def run(self):
        """
        Runs the asyncio event loop with our handler loop.
        """
        event_loop = asyncio.get_event_loop()
        asyncio.ensure_future(self.application_checker())
        try:
            event_loop.run_until_complete(self.handle())
        except KeyboardInterrupt:
            logger.info("Exiting due to Ctrl-C/interrupt")

    async def application_send(self, scope, message):
        """
        Receives outbound sends from applications and handles them.
        """
        raise NotImplementedError("You must implement application_send()")

    def get_or_create_application_instance(self, scope_id, scope):
        """
        Creates an application instance and returns its queue.
        """
        if scope_id in self.application_instances:
            self.application_instances[scope_id]["last_used"] = time.time()
            return self.application_instances[scope_id]["input_queue"]
        # See if we need to delete an old one
        while len(self.application_instances) > self.max_applications:
            self.delete_oldest_application_instance()
        # Make an instance of the application
        input_queue = asyncio.Queue()
        application_instance = guarantee_single_callable(self.application)
        # Run it, and stash the future for later checking
        future = asyncio.ensure_future(
            application_instance(
                scope=scope,
                receive=input_queue.get,
                send=lambda message: self.application_send(scope, message),
            ),
        )
        self.application_instances[scope_id] = {
            "input_queue": input_queue,
            "future": future,
            "scope": scope,
            "last_used": time.time(),
        }
        return input_queue

    def delete_oldest_application_instance(self):
        """
        Finds and deletes the oldest application instance
        """
        oldest_time = min(
            details["last_used"] for details in self.application_instances.values()
        )
        for scope_id, details in self.application_instances.items():
            if details["last_used"] == oldest_time:
                self.delete_application_instance(scope_id)
                # Return to make sure we only delete one in case two have
                # the same oldest time
                return

    def delete_application_instance(self, scope_id):
        """
        Removes an application instance (makes sure its task is stopped,
        then removes it from the current set)
        """
        details = self.application_instances[scope_id]
        del self.application_instances[scope_id]
        if not details["future"].done():
            details["future"].cancel()

    async def application_checker(self):
        """
        Goes through the set of current application instance Futures and cleans up
        any that are done/prints exceptions for any that errored.
        """
        while True:
            await asyncio.sleep(self.application_checker_interval)
            for scope_id, details in list(self.application_instances.items()):
                if details["future"].done():
                    exception = details["future"].exception()
                    if exception:
                        await self.application_exception(exception, details)
                    try:
                        del self.application_instances[scope_id]
                    except KeyError:
                        # Exception handling might have already got here before us. That's fine.
                        pass

    async def application_exception(self, exception, application_details):
        """
        Called whenever an application coroutine has an exception.
        """
        logging.error(
            "Exception inside application: %s\n%s%s",
            exception,
            "".join(traceback.format_tb(exception.__traceback__)),
            f"  {exception}",
        )


import importlib
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

def get_default_application():
    """
    Gets the default application, set in the ASGI_APPLICATION setting.
    """
    try:
        path, name = settings.ASGI_APPLICATION.rsplit(".", 1)
    except (ValueError, AttributeError):
        raise ImproperlyConfigured("Cannot find ASGI_APPLICATION setting.")
    try:
        module = importlib.import_module(path)
    except ImportError:
        raise ImproperlyConfigured("Cannot import ASGI_APPLICATION module %r" % path)
    try:
        value = getattr(module, name)
    except AttributeError:
        raise ImproperlyConfigured(
            "Cannot find %r in ASGI_APPLICATION module %s" % (name, path)
        )
    return value

class ProtocolTypeRouter:
    """
    Takes a mapping of protocol type names to other Application instances,
    and dispatches to the right one based on protocol name (or raises an error)
    """

    def __init__(self, application_mapping):
        self.application_mapping = application_mapping

    async def __call__(self, scope, receive, send):
        if scope["type"] in self.application_mapping:
            application = self.application_mapping[scope["type"]]
            return await application(scope, receive, send)
        else:
            raise ValueError(
                "No application configured for scope type %r" % scope["type"]
            )

class ChannelNameRouter:
    """
    Maps to different applications based on a "channel" key in the scope
    (intended for the Channels worker mode)
    """

    def __init__(self, application_mapping):
        self.application_mapping = application_mapping

    async def __call__(self, scope, receive, send):
        if "channel" not in scope:
            raise ValueError(
                "ChannelNameRouter got a scope without a 'channel' key. "
                + "Did you make sure it's only being used for 'channel' type messages?"
            )
        if scope["channel"] in self.application_mapping:
            application = self.application_mapping[scope["channel"]]
            return await application(scope, receive, send)
        else:
            raise ValueError(
                "No application configured for channel name %r" % scope["channel"]
            )

class MyConsumer(SyncConsumer):
    pass

application = ProtocolTypeRouter({
    "channel": ChannelNameRouter({
        "joo": MyConsumer.as_asgi(),
    }),
})

worker = Worker(
    application=get_default_application(),
    channels=["joo"],
    channel_layer=get_channel_layer(),
)
worker.run()