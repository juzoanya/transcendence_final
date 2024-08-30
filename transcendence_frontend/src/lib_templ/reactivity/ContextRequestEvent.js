/**
 * @template T
 * @typedef {(value: T, unsubscribe?: () => void) => void} ContextCallback
 */

/** @template T */
export default class ContextRequestEvent extends Event {
    static get eventName() {
        return 'context-request';
    }

    /**
     * @param {symbol} context uique symbol to trigger the callback for context
     * @param {ContextCallback<T>} callback callback to be triggered
     * @param {boolean} [subscribe] whether to trigger the callback only once or multiple times
     */
    constructor(context, callback, subscribe) {
        super(ContextRequestEvent.eventName, { bubbles: true, composed: true });
        // console.log("context req event constr")
        /** @type {symbol} */
        this.context = context;
        /** @type {ContextCallback<T>} */
        this.callback = callback;
        /** @type {boolean | undefined} */
        this.subscribe = subscribe;
    }
}
