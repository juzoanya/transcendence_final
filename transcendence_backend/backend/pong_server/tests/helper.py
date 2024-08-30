import asyncio
import types
import functools

from asgiref.sync import async_to_sync

from channels import DEFAULT_CHANNEL_LAYER
from channels.db import database_sync_to_async
from channels.exceptions import StopConsumer
from channels.layers import get_channel_layer


def get_handler_name(message):
    if "type" not in message:
        raise ValueError("Incoming message has no 'type' attribute")
    handler_name = message["type"].replace(".", "_")
    if handler_name.startswith("_"):
        raise ValueError("Malformed type in message (leading underscore)")
    return handler_name


async def await_many_dispatch(consumer_callables, dispatch):
    tasks = [
        asyncio.ensure_future(consumer_callable())
        for consumer_callable in consumer_callables
    ]
    try:
        while True:
            # Wait for any of them to complete
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            # Find the completed one(s), yield results, and replace them
            for i, task in enumerate(tasks):
                if task.done():
                    result = task.result()
                    await dispatch(result)
                    tasks[i] = asyncio.ensure_future(consumer_callables[i]())
    finally:
        # Make sure we clean up tasks on exit
        for task in tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


class SyncConsumer:
    _sync = True
    channel_layer_alias = DEFAULT_CHANNEL_LAYER

    async def __call__(self, scope, receive, send):
        self.scope = scope

        # Initialize channel layer
        self.channel_layer = get_channel_layer(self.channel_layer_alias)
        if self.channel_layer is not None:
            self.channel_name = await self.channel_layer.new_channel()
            self.channel_receive = functools.partial(
                self.channel_layer.receive, self.channel_name
            )
        # Store send function
        if self._sync:
            self.base_send = async_to_sync(send)
        else:
            self.base_send = send
        # Pass messages in from channel layer or client to dispatch method
        try:
            if self.channel_layer is not None:
                await await_many_dispatch([receive, self.channel_receive], self.dispatch)
            else:
                await await_many_dispatch([receive], self.dispatch)
        except StopConsumer:
            # Exit cleanly
            pass


    @database_sync_to_async
    def dispatch(self, message):
        """
        Dispatches incoming messages to type-based handlers asynchronously.
        """
        # Get and execute the handler
        handler = getattr(self, get_handler_name(message), None)
        if handler:
            handler(message)
        else:
            raise ValueError("No handler for message type %s" % message["type"])


    def send(self, message):
        """
        Overrideable/callable-by-subclasses send method.
        """
        self.base_send(message)


    @classmethod
    def as_asgi(cls, **initkwargs):
        """
        Return an ASGI v3 single callable that instantiates a consumer instance
        per scope. Similar in purpose to Django's as_view().

        initkwargs will be used to instantiate the consumer instance.
        """

        async def app(scope, receive, send):
            consumer = cls(**initkwargs)
            return await consumer(scope, receive, send)

        app.consumer_class = cls
        app.consumer_initkwargs = initkwargs

        # take name and docstring from class
        functools.update_wrapper(app, cls, updated=())
        return app

