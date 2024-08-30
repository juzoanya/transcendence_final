import { TemplateAsLiteral } from './templ/TemplateAsLiteral';

/**
 * @template T
 * @param {T} object
 * @param {BaseBase} host
 * @returns {T}
 */
function getUpdateProxy(object, host) {
    const setFunc = (obj, prop, value) => {
        obj[prop] = value;
        host.requestUpdate();
        return true;
    };
    return new Proxy(object, { set: setFunc });
}


/**
 * @typedef {{
 *  children?: TemplateAsLiteral | TemplateAsLiteral[] | string | number | boolean | undefined
 * }} BaseBaseProps
 */

/**
 * @prop children
 * @template {BaseBaseProps} K
 */
export default class BaseBase extends HTMLElement {
    constructor() {
        super();

        
       
        this._props = /** @type {K} */ ({
            children: '',
        });

        
        this.props = getUpdateProxy(this._props, this);


        this._state = {};
        this.state = getUpdateProxy(this._state, this);
        
    }

    /**
     * @template {keyof K} T
     * @param {T} key
     * @param {K[T]} value
     */
    onPropChange(key, value) {
        return true;
    }

    connectedCallback() {
        // console.log('BaseBase: connectedCallback of: ', this);
        
        Object.keys(this).forEach((prop) => {
            const elem = this[prop];
            if (elem && typeof elem.onConnected === 'function') elem.onConnected();
        });
    }

    disconnectedCallback() {
        Object.keys(this).forEach((prop) => {
            const elem = this[prop];
            if (elem && typeof elem.onDisconnected === 'function')
                elem.onDisconnected();
        });
    }

    /** @type {K} */
    _props;

    _state;

    requestUpdate() { }
}
