// import BaseReactive from './BaseReactive.js';

// /**
//  * @param {string} key
//  * @returns {symbol}
//  */
// export const createContext = (key) => {
//     return Symbol(key);
// };

// export class ContextConsumer extends BaseReactive {
//     #force;

//     /** @type {symbol} context  */
//     #context;

//     /**
//      * @param {BaseElem} host @param {Symbol} context
//      * @param context
//      * @param force
//      */
//     constructor(host, context, force = false) {
//         super(host);
//         this.#context = context;
//         this.#force = force;
//     }

//     #onValue(value, quitCb) {
//         this.#quitCb = quitCb;
//         if (quitCb !== undefined) {
//             super.__onNewValue(value, this.#force);
//         }
//     }

//     __onConnected() {
//         const event = new ContextRequestEvent(
//             this.#context,
//             this.#onValue.bind(this),
//             true,
//         );
//         if (this.__host) this.__host.dispatchEvent(event);
//     }

//     #quitCb;

//     __onDisconnected() {
//         if (this.#quitCb) this.#quitCb();
//     }
// }
