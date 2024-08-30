import BaseNode from './BaseNode.js';

export default class AttributeEventNode extends BaseNode {
    /**
     * @param {Element} element
     * @param {string} name
     * @param {number} index
     */
    constructor(element, name, index) {
        super(element, index);
        this.#attrName = name;
    }

    /**
     * @typedef {object} EvHandler
     * @property {EventListener} cb
     * @property {boolean | AddEventListenerOptions} op
     */

    /**  @param {EvHandler} value */
    setValue(value) {
        if (value === undefined || value === null) {
            this.destroy();
        } else if (typeof value === 'function' && value !== this.#callback) {
            this.#callback = value;
        } else if (typeof value === 'object' && value.cb !== this.#callback) {
            this.#callback = value.cb;
            if (value.op != undefined) this.#options = value.op;

        } else {
            if (value.cb !== this.#callback) this.#callback = value.cb;
            if (value.op !== this.#options || value.cb === undefined) {
                this.destroy();
            }
        }
        if (this.#isOff && this.#callback !== undefined) {
            this.element.addEventListener(
                this.#attrName,
                this.#handlerObj,
                this.#options,
            );
            this.#isOff = false;
        }
    }

    destroy() {
        if (!this.#isOff) {
            this.element.removeEventListener(
                this.#attrName,
                this.#handlerObj,
                this.#options,
            );
            this.#callback = undefined;
            this.#options = undefined;
            this.#isOff = true;
        }
    }

    /** @type {string} */
    #attrName;

    /** @type {EventListener | undefined} */
    #callback;

    /** @type {boolean | AddEventListenerOptions | undefined} */
    #options;

    /** @type {boolean} */
    #isOff = true;

    /** @type {EventListenerObject} */
    #handlerObj = {
        handleEvent: (ev) => {
            if (this.#callback) {
                this.#callback(ev);
            }
        },
    };
}
