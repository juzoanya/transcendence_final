import BaseReactive from './BaseReactive.js';

/**
 * @template T
 * @extends {BaseReactive<T>}
 */
export default class PubSubConsumer extends BaseReactive {
    /** @type {import('./PubSub.js').default} */
    #pubSubInst;

    /** @type {boolean} */
    #force;

    /**
     * @param {import('./PubSub.js').default} pubSubInst The PubSub instance.
     * @param {any} initialValue The initial value.
     * @param {boolean} force The force flag.
     * @param {import('../BaseBase').default | ((value: T) => void)} [host] The host object.
     */
    constructor(pubSubInst, initialValue, force = false, host = undefined) {
        super(initialValue, host);
        this.host = host;

        // console.log('PubSubConsumer: constructor: host: ', this.host,', pubsub: ', pubSubInst, ', initial value: ', initialValue, ', force: ', force);
        this.#pubSubInst = pubSubInst;
        if (host == undefined) force = true;
        this.#force = force;

        this.#handler = (event) => {
            console.log('PubSubConsumer: eventHandler: host: ', this.host, ': event.detail: ',event.detail);
            this.onNewValue(event.detail, this.#force);
        };

        if (!host || force) this.onConnected();
    }

    #handler;

    #connected = false;

    onConnected() {
        // console.log('PubSubConsumer: onConnected: host: ', this.host, ', is Connected?: ', this.#connected);
        
        if (this.#connected) return;
        // console.log('PubSubConsumer: onConnected: host: ', this.host, ', add eventListener to pubsub: ', this.#pubSubInst);
        this.#pubSubInst.addEventListener(
            this.#pubSubInst.eventType,
            this.#handler,
        );
        this.#connected = true;
    }

    cleanupEventlistener() {
        this.onDisconnected();
    }

    onDisconnected() {
        if (!this.#connected) return;
        console.log("on Disconnected pubSubConsumer, remove eventListener!");
        this.#pubSubInst.removeEventListener(
            this.#pubSubInst.eventType,
            this.#handler,
        );
        this.#connected = false;
    }
}
