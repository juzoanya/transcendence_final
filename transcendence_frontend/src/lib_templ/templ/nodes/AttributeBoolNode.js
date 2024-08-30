import BaseNode from './BaseNode.js';

export default class AttributeBoolNode extends BaseNode {
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
     * @param {any} value
     */
    setValue(value) {
        const b = Boolean(value);
        if (b === this.#active) return;
        this.#active = b;
        if (!b) {
            this.element.removeAttribute(this.#attrName);
        } else {
            this.element.setAttribute(this.#attrName, '');
        }
    }

    /** @type {boolean} */
    #active = false;

    #attrName;
}
