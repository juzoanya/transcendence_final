export default class BaseNode {
    /**
     * @param {ChildNode} node
     * @param {number} index
     */
    constructor(node, index) {
        this.index = index;
        this.element = node;
    }

    /**
     * @param {any} [value]
     * @param {number} [index]
     */
    // eslint-disable-next-line class-methods-use-this, no-unused-vars
    setValue(value, index) {}

    // eslint-disable-next-line class-methods-use-this
    destroy() {}

    /** @type {ChildNode | HTMLElement} */
    element;

    index;
}
