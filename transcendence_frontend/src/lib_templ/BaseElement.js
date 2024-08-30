// import { sessionService } from '../services/api/API_new.js';
import { Dropdown, Popover, Tooltip } from 'bootstrap';
import BaseBase from './BaseBase.js';
export { BaseBase }
import Template from './templ/Template.js';

export { html, css, TemplateAsLiteral } from './templ/TemplateAsLiteral.js';
export {ref, createRef} from './templ/nodes/FuncNode.js';
export { ifDefined } from './templ/nodes/AttributeNode.js';

/**
 * @template {HTMLElement} T
 * @typedef {import('./templ/nodes/FuncNode.js').Ref<T>} Ref<T>
 */

/**
 * @typedef {object} AttrProp
 * @property {string} camel
 * @property {object} oVal
 */

/**
 * @template {import('./BaseBase.js').BaseBaseProps} K
 * @extends BaseBase<K>
 */
export class BaseElement extends BaseBase {

    /** @type {Map<string, AttrProp>} */
    #attrPropMapRef;


    #initAttrPropMap() {
        
        // @ts-ignore
        const obs = this.constructor.observedAttributes;
        if (this.#attrPropMapRef !== undefined || !(obs instanceof Array)) return;
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.constructor.___attrPropMap___ = new Map();
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.#attrPropMapRef = this.constructor.___attrPropMap___;
        obs.forEach((attr) => {
            const propName = BaseElement.toCamel(attr);

            this.#attrPropMapRef.set(attr, { camel: propName, oVal: null });
        });
    }

    get isConnected() {
        return this.#isConnected;
    }

    #mapMyAttr(name, nVal, oVal) {
        if (this.#attrPropMapRef === undefined) this.#initAttrPropMap();
        const pObj = this.#attrPropMapRef.get(name);
        if (!pObj) return;

        if (nVal === oVal) {
            return;
        }

        pObj.oVal = this[pObj.camel];
        if (typeof this[pObj.camel] === 'boolean') {
            // this[pObj.camel] = nVal !== null;
            this[pObj.camel] = nVal != null;
        } else if (typeof this[pObj.camel] === 'number') {
            this[pObj.camel] = Number(nVal);
        } else if (typeof this[pObj.camel] === 'object') {
            this[pObj.camel] = JSON.parse(nVal);
        } else {
            this[pObj.camel] = String(nVal);
        }

        this.onAttributeChange(name, pObj.oVal, this[pObj.camel]);
        if (this.#isConnected) this.update();
    }

    // eslint-disable-next-line no-unused-vars
    onAttributeChange(attributeName, oldValue, newValue) {}

  



    // lifecycle functions to be implemented by subclass
    shouldUpdate() {return true;}
    firstUpdated() {}
    updated() {}
    willUpdate() {}

    bs_init() {
        let elems = this.querySelectorAll('[data-bs-toggle="tooltip"]');
        elems.forEach((e) => {
            Tooltip.getOrCreateInstance(e);
        });
        elems = this.querySelectorAll('[data-bs-toggle="dropdown"]');
        elems.forEach((e) => {
            Dropdown.getOrCreateInstance(e);
        });
        elems = this.querySelectorAll('[data-bs-toggle="popover"]');
        elems.forEach((e) => {
            Popover.getOrCreateInstance(e);
        });
    }

    bs_dispose() {
        let elems = this.querySelectorAll('[data-bs-toggle="tooltip"]');
        elems.forEach((e) => {
            Tooltip.getOrCreateInstance(e).dispose();
        });
        elems = this.querySelectorAll('[data-bs-toggle="dropdown"]');
        elems.forEach((e) => {
            Dropdown.getOrCreateInstance(e).dispose();
        });
        elems = this.querySelectorAll('[data-bs-toggle="popover"]');
        elems.forEach((e) => {
            Popover.getOrCreateInstance(e).dispose();
        });
    }
    
    performUpdate() {
        // console.log('performUpdate');
        if (!this.isUpdatePending) {
            // console.log('performUpdate: !this.isUpdatePending -> return');
            return;
        }
        try {
            
            if (this.shouldUpdate()) {
                // console.log('performUpdate -> schouldUpdate!');
                this.willUpdate();
                // console.log('performUpdate -> call update');
                this.update();
                // console.log('performUpdate -> update called');
                if (!this.hasUpdated) {
                    // console.log('performUpdate -> not hasUpdated -> first Update');
                    this.hasUpdated = true;
                    this.bs_init()
                    this.firstUpdated();
                }

                this.updated();
            } else {
                // console.log('performUpdate -> schould not update');
                this.isUpdatePending = false;
            }
        } catch (e) {
            // console.log('performUpdate -> catched error: ', e);
            this.isUpdatePending = false;
        }
    }

    /** @returns {void | Promise<unknown>} */
    scheduleUpdate() {
        // console.log('scheduleUpdate');
        const result = this.performUpdate();
        // console.log('scheduleUpdate - result: ', result);
        return result;
    }

    /** @returns {Promise<boolean>} */
    async __enqueueUpdate() {
        // console.log('enqueueUpdate');
        this.isUpdatePending = true;
        try {
            // console.log('enqueueUpdate - await');
            await this.__updatePromise;
            // console.log('enqueueUpdate - awaited!');
        } catch (e) {
            // console.log('enqueueUpdate - catched');
            Promise.reject(e);
        }
        // console.log('enqueueUpdate - call scheduleupdate: ');
        const result = this.scheduleUpdate();
        // console.log('enqueueUpdate - result of scheduleupdate: ', result);
        if (result != null) {
            // console.log('enqueueUpdate - result not None - await');
            await result;
            // console.log('enqueueUpdate - result not None - awaited!');
        }
        return !this.isUpdatePending;
    }

    hasUpdated = false;
    isUpdatePending = false;
    /** @type {Promise<boolean>} */
    __updatePromise;

    requestUpdate() {
        // if (this.updateDirect) {
            // return this.requestUpdateDirect();
        if (this.isUpdatePending === false) {
            // console.log('requestUpdate: isUpdatePending is false -> call enqueueUpdate');
            this.__updatePromise = this.__enqueueUpdate();
            // console.log('requestUpdate: after: this.__enqueueUpdate: updatePromise: ', this.__updatePromise);
        }
    }

    requestUpdateDirect() {
        return this.requestUpdate();
        // console.log("request Update");
        // console.log('request Update');
        if (this.#isConnected) {
            // console.log("is connected! update")
            this.update();
        }
    }

    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {Promise<symbol | void> | symbol | void}
     */
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    onBeforeMount(route, params, url) {}

    /**
     * @param {string} route
     * @returns {void}
     */
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    onAfterMount(route) {}

    /**
     * @param {string} route
     * @param {object} params
     * @returns {Promise<symbol | void> | symbol | void | boolean}
     */
    onRouteChange(route, params, url) {return true;}

    onBeforeUnMount() {}

    onAfterUnMount() {}

    get updateComplete() {
        return this.__updatePromise;
    }

    /**
     * @param {boolean} useBootstrap
     * @param {boolean} useShadow
     * @param {boolean} updateDirect
     */
    constructor(
        // eslint-disable-next-line no-unused-vars
        useBootstrap = false,
        useShadow = false,
        updateDirect = false,
    ) {
        super();
        this.updateDirect = updateDirect;
        /** @type {null | Promise} */
        this.awaitRender = null;
        // console.log('constructor of this: ', this);
        

        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.#attrPropMapRef = this.constructor.___attrPropMap___;
        if (useShadow) {
            const shadow = this.attachShadow( { mode: 'open' } );
            shadow.adoptedStyleSheets = [];
            // @ts-ignore
            if (this.constructor.styles instanceof Array) {
                // @ts-ignore
                shadow.adoptedStyleSheets.push(...this.constructor.styles);
            }

            this.root = shadow;
        } else {
            this.root = this;
        }

        this.__updatePromise = new Promise( (res) => (this.enableUpdating = res) );

        // this._requestUpdate = () => {
        //     console.log('request update after statusChange');
        //     this.requestUpdate();
        // }
        // this.userStatusChange = sessionService.messageSocket?.subscribeUserStatusChange(this, true);
    }

    onSlotChange() {
        this.update();
    }

    #isConnected = false;

    /** @param {boolean} _requestedUpdate  */
    enableUpdating(_requestedUpdate) {}

    connectedCallback() {
        super.connectedCallback();
        if (this.#attrPropMapRef === undefined) this.#initAttrPropMap();
        this.#isConnected = true;
        
        this.shadowRoot?.addEventListener('slotchange', this.onSlotChange.bind(this));
        this.enableUpdating(true);

        // this.requestUpdateDirect();
        // if (this.updateDirect) {
        //     this.requestUpdateDirect();
        // } else {
        // }
        this.requestUpdate();
        // this.update();
    }

    disconnectedCallback() {
        this.bs_dispose();
        super.disconnectedCallback();
        this.#isConnected = false;
        if (this.#templ) {
            this.#templ.unMountMe();
        }
        this.shadowRoot?.removeEventListener('slotchange', this.onSlotChange.bind(this));

       
        // console.log("BASE ELEM DISCONNECT!!!!", this)
    }


    attributeChangedCallback(name, oVal, nVal) {
        this.#mapMyAttr(name, nVal, oVal);
    }

    /** @type {import('./templ/LiveTemplate.js').default | undefined} */
    #templ = undefined;

    update() {
        // console.log('BaseElement - now update, ', this);
        const res = this.render();
        // console.log('update: result: ', res);
        

        if (res === null || res === undefined) return;
        if (this.#templ === undefined) {
            try {
                this.#templ = Template.createLiveAppendElement(this.root, res);
            } catch (error) {
                console.log('error update: ', error);
            }
        } else {

            if (this.awaitRender != null) {
                console.log('await promise');
                this.awaitRender.then(() => {
                    this.awaitRender = null;
                    if (!this.#templ) return;
                    console.log('promise awaited -> update');
                    this.#templ.update(res.values);
                })
            } else {
                this.#templ.update(res.values);
            }


        }

        this.isUpdatePending = false;
    }

    /** @returns {import('./templ/TemplateAsLiteral.js').TemplateAsLiteral | null}  */
    render() {
        return null;
    }

    static toCamel = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());

    static toKebap = (s) =>
        s.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
}

// /**
//  * @template {HTMLElement} T
//  * @typedef {import('./templ/nodes/FuncNode.js').Ref<T>} Ref<T>
//  */

// /**
//  * @typedef {object} AttrProp
//  * @property {string} camel
//  * @property {object} oVal
//  */

// export class BaseElement extends BaseBase {
//     static #colorModeEvent = 'base-elem-toggle-color';

//     static #colorModePubSub = new EventTarget();

//     static #currentColorMode = 'light';

//     static toggleColorMode() {
//         const ht = document.querySelector('html');
//         const newColor = this.#currentColorMode === 'light' ? 'dark' : 'light';
//         if (ht) ht.dataset.bsTheme = newColor;
//         this.#currentColorMode = newColor;
//         const color = BaseElement.#currentColorMode;
//         const revColor = color === 'light' ? 'dark' : 'light';
//         document.querySelectorAll('button').forEach((btn) => {
//             this.#toggleBtnColor(btn, color, revColor);
//         });
//         document.querySelectorAll('input').forEach((btn) => {
//             this.#toggleBtnColor(btn, color, revColor);
//         });
//         document.querySelectorAll('a').forEach((btn) => {
//             this.#toggleBtnColor(btn, color, revColor);
//         });
//         this.#colorModePubSub.dispatchEvent(new CustomEvent(this.#colorModeEvent, { detail: newColor }));
//     }

//     static #changeDocumentBtnColors() {
//         const color = BaseElement.#currentColorMode;
//         const revColor = color === 'light' ? 'dark' : 'light';
//         document.querySelectorAll('button').forEach((btn) => {
//             this.#toggleBtnColor(btn, color, revColor);
//         });
//         document.querySelectorAll('input').forEach((btn) => {
//             this.#toggleBtnColor(btn, color, revColor);
//         });
//         document.querySelectorAll('a').forEach((btn) => {
//             this.#toggleBtnColor(btn, color, revColor);
//         });
//     }

//     #changeBtnColors(color, revColor, toggleTheme) {
//         if (this.shadowRoot) {
//             Array.from(this.shadowRoot.children).forEach((e) => {
//                 if (e instanceof HTMLElement) {
//                     if (toggleTheme) e.dataset.bsTheme = color;
//                     BaseElement.#toggleBtnColor(e, color, revColor);
//                 }
//                 e.querySelectorAll('button').forEach((btn) => {
//                     BaseElement.#toggleBtnColor(btn, color, revColor);
//                 });
//                 e.querySelectorAll('input').forEach((btn) => {
//                     BaseElement.#toggleBtnColor(btn, color, revColor);
//                 });
//                 e.querySelectorAll('a').forEach((btn) => {
//                     BaseElement.#toggleBtnColor(btn, color, revColor);
//                 });
//             });
//         }
//     }

//     static #toggleBtnColor = (elem, color, revColor) => {
//         if (elem.classList.contains(`btn-outline-${color}`)) {
//             elem.classList.remove(`btn-outline-${color}`);
//             elem.classList.add(`btn-outline-${revColor}`);
//         } else if (elem.classList.contains(`btn-${color}`)) {
//             elem.classList.remove(`btn-${color}`);
//             elem.classList.add(`btn-${revColor}`);
//         }
//     };

//     /**
//      * @param {CustomEvent} ev The custom event object.
//      */
//     #changeColorMode(ev) {
//         const color = ev.detail;
//         const revColor = color === 'light' ? 'dark' : 'light';
//         /** @param {HTMLElement} elem */
//         this.#changeBtnColors(color, revColor, true);
//         this.onColorChange();
//     }

//     onColorChange() {}

//     /** @type {Map<string, AttrProp>} */
//     #attrPropMapRef;

//     #initAttrPropMap() {
//         // @ts-ignore
//         const obs = this.constructor.observedAttributes;
//         if (this.#attrPropMapRef !== undefined || !(obs instanceof Array)) return;
//         // @ts-ignore
//         // eslint-disable-next-line no-underscore-dangle
//         this.constructor.___attrPropMap___ = new Map();
//         // @ts-ignore
//         // eslint-disable-next-line no-underscore-dangle
//         this.#attrPropMapRef = this.constructor.___attrPropMap___;
//         obs.forEach((attr) => {
//             const propName = BaseElement.toCamel(attr);

//             this.#attrPropMapRef.set(attr, { camel: propName, oVal: null });
//         });
//     }

//     get isConnected() {
//         return this.#isConnected;
//     }

//     #mapMyAttr(name, nVal, oVal) {
//         if (this.#attrPropMapRef === undefined) this.#initAttrPropMap();
//         const pObj = this.#attrPropMapRef.get(name);
//         if (!pObj) return;

//         if (nVal === oVal) {
//             return;
//         }

//         pObj.oVal = this[pObj.camel];
//         if (typeof this[pObj.camel] === 'boolean') {
//             this[pObj.camel] = nVal !== null;
//         } else if (typeof this[pObj.camel] === 'number') {
//             this[pObj.camel] = Number(nVal);
//         } else if (typeof this[pObj.camel] === 'object') {
//             this[pObj.camel] = JSON.parse(nVal);
//         } else {
//             this[pObj.camel] = String(nVal);
//         }

//         this.onAttributeChange(name);
//         if (this.#isConnected) this.update();
//     }

//     requestUpdate() {
//         // console.log("request Update");
//         // console.log('request Update');
//         if (this.#isConnected) {
//             // console.log("is connected! update")
//             this.update();
//         }
//     }

//     /**
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      * @returns {Promise<symbol | void> | symbol | void}
//      */
//     // @ts-ignore
//     // eslint-disable-next-line no-unused-vars
//     onBeforeMount(route, params, url) {}

//     /**
//      * @param {string} route
//      * @returns {void}
//      */
//     // @ts-ignore
//     // eslint-disable-next-line no-unused-vars
//     onAfterMount(route) {}

//     /**
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      */
//     onRouteChange(route, params, url) {}

//     onBeforeUnMount() {}

//     onAfterUnMount() {}

//     /**
//      * @param {boolean} useBootstrap
//      * @param {boolean} useShadow
//      * @param {object | undefined} [shadowOption]
//      */
//     constructor(
//         // eslint-disable-next-line no-unused-vars
//         useBootstrap = false,
//         useShadow = false,
//         shadowOption = undefined,
//     ) {
//         super();

//         // @ts-ignore
//         // eslint-disable-next-line no-underscore-dangle
//         this.#attrPropMapRef = this.constructor.___attrPropMap___;
//         if (useShadow) {
//             const shadow = this.attachShadow(shadowOption ?? { mode: 'open' });
//             shadow.adoptedStyleSheets = [];
//             // @ts-ignore
//             if (this.constructor.styles instanceof Array) {
//                 // @ts-ignore
//                 shadow.adoptedStyleSheets.push(...this.constructor.styles);
//             }

//             this.root = shadow;
//         } else {
//             this.root = this;
//         }
//     }

//     onSlotChange() {
//         this.update();
//     }

//     #isConnected = false;

//     connectedCallback() {
//         super.connectedCallback();
//         if (this.#attrPropMapRef === undefined) this.#initAttrPropMap();
//         this.#isConnected = true;
        
//         this.shadowRoot?.addEventListener('slotchange', this.onSlotChange.bind(this));
//         BaseElement.#colorModePubSub.addEventListener(
//             BaseElement.#colorModeEvent,
//             this.#changeColorMode.bind(this),
//         );
//         this.update();
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.#isConnected = false;
//         if (this.#templ) {
//             this.#templ.unMountMe();
//         }
//         this.shadowRoot?.removeEventListener('slotchange', this.onSlotChange.bind(this));

//         BaseElement.#colorModePubSub.removeEventListener(
//             BaseElement.#colorModeEvent,
//             this.#changeColorMode.bind(this),
//         );
//         // console.log("BASE ELEM DISCONNECT!!!!", this)
//     }

//     // eslint-disable-next-line no-unused-vars
//     onAttributeChange(attributeName) {}

//     attributeChangedCallback(name, oVal, nVal) {
//         this.#mapMyAttr(name, nVal, oVal);
//     }

//     /** @type {import('./templ/LiveTemplate.js').default | undefined} */
//     #templ = undefined;

//     update() {
//         const res = this.render();

//         if (res === null || res === undefined) return;
//         if (this.#templ === undefined) {
//             this.#templ = Template.getInstance(res.strings);
//             this.#templ.mountMe(this.root, null, res.values);
//         } else {
//             this.#templ.update(res.values);
//             // // console.log("UPDATE COMPLETED: ", this);
//         }
//         // this.#adjustBtnColors();
//         BaseElement.#changeDocumentBtnColors();
//     }

//     /** @returns {import('./templ/TemplateAsLiteral.js').TemplateAsLiteral | null}  */
//     render() {
//         return null;
//     }

//     static toCamel = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());

//     static toKebap = (s) =>
//         s.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
// }
