import BaseBase from '../BaseBase.js';
import PubSubConsumer from './PubSubConsumer.js';


/**
 * @template T
 */
export default class PubSub extends EventTarget {
    static #nbr = 0;

    static #getAvailEventType() {
        this.#nbr++;
        return `my-custom-event-${this.#nbr}`;
    }

    /** @type {string} */ eventType;

    constructor() {
        super();
        this.eventType = PubSub.#getAvailEventType();
    }

    /**
     * @param {any} initialValue initial value
     * @param {BaseBase | ((value: T) => void)} [host] host element, that triggers a rerender
     * @param {boolean} [force] force update, event if values are same
     * @returns {PubSubConsumer<T>} returns new PubSubConsumer instance
     */
    subscribe(initialValue, host = undefined, force = false) {
        return new PubSubConsumer(this, initialValue, force, host);
    }

    /**
     * @param {() => void} cb initial value
     * @returns {PubSubConsumer<T>} returns new PubSubConsumer instance
     */
    subscribeCallback(cb) {
        return new PubSubConsumer(this, cb);
    }

    /** @param {T} data data to publish */
    publish(data) {
        console.log('PubSub: iam: ', this, ' publish data: ', data);
        // console.log('eventType: ', this.eventType);
        this.dispatchEvent(new CustomEvent(this.eventType, { detail: data }));
    }
}
