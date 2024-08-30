import BaseNode from './BaseNode.js';
// class AttributeBaseNode extends BaseNode {
//     /** @param {Element} element @param {string} name */
//     constructor(element, name, index) {
//         super(element, index);

//     }

// }

// export class AttributeSingleNode extends AttributeBaseNode {
//     constructor(element, name, index) {
//         super(element, name, index);
//     }
//     setValue(value, index) {
//         if (value === null || value === undefined || value === "")
//             this.element.removeAttribute(this.attrName);
//         else if (this.value !== value)
//             this.element.setAttribute(this.attrName, value);
//     }
//     /** @type {string} */
//     value;
// }

const isNotDefinedSymbol = Symbol('TEMPL_ATTRIBUTE_IS_NOT_DEFINED');

/**
 * @template T
 * @param {T} value 
 * @returns {Symbol | T}
 */
export function ifDefined(value) {
    if (value == undefined || value == null) return isNotDefinedSymbol;
    else return value;
}

export default class AttributeMultiNode extends BaseNode {
    /**
     * @param {HTMLElement} element
     * @param {string} name
     * @param {string[]} strings
     * @param {number} index
     */
    constructor(element, name, strings, index) {
        super(element, index);
        this.attrName = name;
        this.strings = strings;
        this.#argsCount = strings.length - 1;
        this.#myArgs = new Array(this.argsCount).fill('');
    }

    /** @type {string} */
    attrName;

    #initialInit = false;

    #toCamel = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());
    /**
     * @param {string} res 
     */
    #setStyleAttribute(res) {
        // console.log('before change: my width: ', this.element.style.width);
        // console.log('before change: my height: ', this.element.style.height);
        const arr = res.split(';');
        // console.log('splitted styles: ', arr);
        // console.log('this elem: ', this.element);
        arr.forEach((style) => {
            const [keydashed, val] = style.split(':')
            // console.log(`try to set style: ${keydashed} to ${val}`);
            if (keydashed && val) {
                // console.log(`key beforetrim: $${keydashed}$`);
                const trimmed = keydashed.trim()
                // console.log(`key after trim: $${trimmed}$`);
                val.trim()
                const key = this.#toCamel(trimmed)
                // console.log(`key after toCamel: $${key}$`);
                if (this.element instanceof HTMLElement) {
                    // if (this.element.style.prototype.hasOwnProperty(key))
                    // this.element.style[key] = val;
                    try {
                        this.element.style[key] = val;
                        // console.log('my width: ', this.element.style.width);
                        // console.log('my height: ', this.element.style.height);
                    } catch (error) {
                        console.error(`unable to set style: ${key} to ${val}`);
                    }
                }
            }
        });
    }

    /**
     * @param {number} changeCount
     */
    #setAttr(changeCount) {
        // // // console.log("SET MULI ATTRIBUTE!!, changeCount: ", changeCount, " | noneCount: ", noneCount);
        // // // console.log(this.element);
        // if (noneCount === this.#argsCount) {
        //     this.element.removeAttribute(this.attrName);
        //     return ;
        // }
        if (changeCount === 0 && this.#initialInit) return;
        let res = '';
        for (let i = 0; i !== this.#argsCount; i++) {
            res += this.strings[i] + this.#myArgs[i];
            // // // console.log("res: ",res);
        }
        res += this.strings[this.strings.length - 1];
        // console.log("AttributeNode: res: ", res);
        if (this.attrName === 'style') {
            this.#setStyleAttribute(res);
        } else if (this.element instanceof HTMLElement) {
            if (res.length > 0) {
                // console.log('set regular attribute: ', this.attrName, ' to: ', res);
                this.element.setAttribute(this.attrName, res);
            } else {
                this.element.removeAttribute(this.attrName)
            }
        }
        this.#initialInit = true;
    }

    #changed = 0;

    #changedC = 0;

    #noneC = 0;

    /**
     * @param {any} value
     * @param {number} index
     */
    setValue(value, index) {
        // // // console.log("SET ATTRIBUTE MULTLI: ATTRNAME: ", this.attrName, " VALUE: ", value)
        // console.log('attr i: ', index, ', v: ', value);
        
        if (value === isNotDefinedSymbol && this.element instanceof HTMLElement) {
            this.element.removeAttribute(this.attrName);
            return;
        }

        const i = index - this.index;
        let val = value;
        if ( val === null || val === undefined || typeof val === 'object' || typeof val === 'function') {
            val = '';
        } else if (typeof val !== 'string') {
            val = String(val);
        }
        if (val !== this.#myArgs[i]) {
            this.#myArgs[i] = val;
            this.#changedC++;
        }
        // // // // console.log("mut attr index: ", index)
        if (this.#myArgs[i] === '') this.#noneC++;
        this.#changed++;
        if (this.#changed === this.#argsCount) {
            this.#changed = 0;
            this.#setAttr(this.#changedC);
        }
    }

    get argsCount() {
        return this.#argsCount;
    }

    /** @type {string[]} */
    strings;

    /** @type {number} */
    #argsCount;

    /** @type {Array<string>} */
    #myArgs;
}
