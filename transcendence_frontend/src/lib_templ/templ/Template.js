/* eslint-disable no-bitwise */
// eslint-disable-next-line import/no-cycle

import useTemplateTreeWalker, {
    commentMarker,
    attributeMarker,
    valueMarker,
} from './templateWalker.js';
import LiveTemplate from './LiveTemplate';

export const htmlPos = {
    innerFirst: 'innerFirst',
    inner: 'inner',
    outer: 'outer',
};

export const templExpressions = {
    htmlAttribute: 'htmlAttribute',
    selfAttribute: 'selfAttribute',
    htmlAttributeMulti: 'htmlAttributeMulti',
    htmlNode: 'htmlNode',
};

/**
 * @returns {(str: string) => {pos: string, i: number}}
 */
export const useHtmlPosition = () => {
    let lastPos = htmlPos.outer;
    /**
     * @param {string} str
     * @returns {{pos: string, i: number}}
     */
    const getHtmlPosition = (str) => {
        for (let i = str.length; i >= 0; i--) {
            if (str[i] === '>' && str.slice(i - 2, i + 1) !== '-->') {
                lastPos = htmlPos.outer;
                return { pos: lastPos, i };
            }
            if (str[i] === '<' && str.slice(i, i + 4) !== '<!--') {
                lastPos = htmlPos.inner;
                return { pos: lastPos, i };
            }
        }
        return { pos: lastPos, i: -1 };
    };
    return getHtmlPosition;
};

/**
 * @param {string} strLeft
 * @param {string} strRight
 * @param {number} equalPos
 * @param {number} tagOpenPos
 * @returns {{isSingleNoQuote: boolean, isSingleQuoted: boolean, isSingle: boolean, isMulti: boolean, hasLeadingQuote: boolean, hasClosingQuote: boolean}}
 */
function getCond(strLeft, strRight, equalPos, tagOpenPos) {
    const quoteLeftIndex = strLeft.lastIndexOf('"');
    const quoteRightIndex = strRight.indexOf('"');
    const hasEqual = equalPos > -1 && equalPos > tagOpenPos;
    const hasLeadingQuote =
        strLeft.charAt(equalPos + 1) === '"' && equalPos + 1 === quoteLeftIndex;
    const hasClosingQuote =
        quoteRightIndex !== -1 && strRight.charAt(quoteRightIndex - 1) !== '=';
    const isSingleNoQuote =
        hasEqual &&
        !hasLeadingQuote &&
        !hasClosingQuote &&
        strLeft.slice(equalPos).trim() === '=';
    const isSingleQuoted = hasEqual && hasLeadingQuote && hasClosingQuote;
    const isMulti = hasEqual && hasLeadingQuote && !hasClosingQuote;
    return {
        isSingleNoQuote,
        isSingleQuoted,
        isSingle: isSingleNoQuote || isSingleQuoted,
        isMulti,
        hasLeadingQuote,
        hasClosingQuote,
    };
}

/**
 * @returns {(strLeft: string, strRight: string) => {res: string, lastType: string}}
 */
export function useInnerHtmlMarker() {
    let selfMarkers = 0;
    let lastType;
    const getHtmlPosition = useHtmlPosition();

    /**
     * @param {string} strLeft
     * @param {string} strRight
     * @returns {{res: string, lastType: string}}
     */
    const addMarker = (strLeft, strRight) => {
        const equalPos = strLeft.lastIndexOf('=');
        let tmpRes = '';
        const pos = getHtmlPosition(strLeft);
        const cond = getCond(strLeft, strRight, equalPos, pos.i);
        if (pos.pos === htmlPos.outer) {
            lastType = templExpressions.htmlNode;
            tmpRes = `${strLeft}${commentMarker}`;
        } else if (cond.isMulti || cond.isSingle) {
            if (cond.isSingle) lastType = templExpressions.htmlAttribute;
            else lastType = templExpressions.htmlAttributeMulti;
            tmpRes = `${strLeft.slice(0, equalPos)}${attributeMarker}${strLeft.slice(equalPos, strLeft.length)}${valueMarker}`;
        } else if (lastType === templExpressions.htmlAttributeMulti) {
            if (cond.hasClosingQuote) lastType = templExpressions.htmlAttribute;
            else lastType = templExpressions.htmlAttributeMulti;
            tmpRes = `${strLeft}${valueMarker}`;
        } else {
            selfMarkers++;
            lastType = templExpressions.selfAttribute;
            tmpRes = `${strLeft}${selfMarkers.toString()}${attributeMarker}="${valueMarker}"`;
        }
        return {
            res: tmpRes,
            lastType,
        };
    };
    return addMarker;
}

/**
 * @param {TemplateStringsArray} strings
 * @returns {string}
 */
export function fillTemplateLiteral(strings) {
    const addMarker = useInnerHtmlMarker();
    let res = '';
    for (let i = 0; i < strings.length - 1; i++) {
        res += addMarker(strings[i], strings[i + 1]).res;
    }
    res += strings[strings.length - 1];
    return res;
}

export default class Template {
    /** @type {WeakMap<TemplateStringsArray, Template>} */
    static #cache = new WeakMap();

    /**
     * @param {TemplateStringsArray} strings
     * @returns {Template}
     */
    static getTemplate(strings) {
        let t = Template.#cache.get(strings);
        if (t === undefined) {
            t = new Template(strings);
            Template.#cache.set(strings, t);
        }
        return t;
    }

    /**
     * @param {TemplateStringsArray} strings
     * @returns {import('./LiveTemplate').default}
     */
    static getInstance(strings) {
        const t = this.getTemplate(strings);
        return new LiveTemplate(t);
    }

    /**
     * @param {ChildNode} nodeToInsertBefore
     * @param {import('./TemplateAsLiteral.js').TemplateAsLiteral} data
     * @param {any} [animArr]
     */
    static createLiveInsertBeforeNode(nodeToInsertBefore, data, animArr) {
        const live = Template.getInstance(data.strings);
        if (!(nodeToInsertBefore instanceof Node))
            throw new Error("OuterNode: createLiveInsertBeforeNode: Own Node needs to be a Comment as Marker")
        const parent = nodeToInsertBefore.parentElement
        if (!(parent instanceof HTMLElement))
            throw new Error("OuterNode: createLiveInsertBeforeNode: Element to append the LiveTemplate Data needs to be an HTML Element")
        live.mountMe( parent, nodeToInsertBefore, data.values, animArr );
        return live;
    }
    /**
     * @param {HTMLElement} elementToAppend
     * @param {import('./TemplateAsLiteral.js').TemplateAsLiteral} data
     * @param {any} [animArr]
     */
    static createLiveAppendElement(elementToAppend, data, animArr) {
        const live = Template.getInstance(data.strings);
        if (!(elementToAppend instanceof Node)) {
            console.log('INVALID');
            
            throw new Error("OuterNode: createLiveAppendElement: Element to append the LiveTemplate Data needs to be an HTML Element")
        }
        live.mountMe( elementToAppend, null, data.values, animArr );
        return live;
    }


    static #getStale = useTemplateTreeWalker();

    /**
     * @param {TemplateStringsArray} strings
     */
    constructor(strings) {
        this.#strings = strings;
        this.#valueLen = strings.length - 1;
        // console.log('strings: ', strings);
        this.#strRes = fillTemplateLiteral(strings);
        // console.log('res: ', this.#strRes);
        this.#domTemplate = document.createElement('template');
        this.#domTemplate.innerHTML = this.#strRes;
        this.#getLive = Template.#getStale(
            this.#domTemplate.content,
            this.#valueLen,
        );
    }

    /**
     * @returns {{frag: DocumentFragment, liveNodes: any[]}}
     */
     getLiveNodes() {
        const frag = this.#domTemplate.content.cloneNode(true);
        if (!(frag instanceof DocumentFragment)) throw new Error('Template Content is not a DocumentFragment?');
        const liveNodes = this.#getLive(frag);
        return { frag, liveNodes };
    }

    #strRes = '';

    #valueLen;

    #strings;

    #getLive;

    #domTemplate;

    get literalStrings() {
        return this.#strings;
    }

    get result() {
        return this.#strRes;
    }

    get valueArrLen() {
        return this.#valueLen;
    }
}


// import useTemplateTreeWalker, {
//     commentMarker,
//     attributeMarker,
//     valueMarker,
// } from './templateWalker.js';
// import LiveTemplate from './LiveTemplate';

// export const htmlPos = {
//     innerFirst: 'innerFirst',
//     inner: 'inner',
//     outer: 'outer',
// };

// export const templExpressions = {
//     htmlAttribute: 'htmlAttribute',
//     selfAttribute: 'selfAttribute',
//     htmlAttributeMulti: 'htmlAttributeMulti',
//     htmlNode: 'htmlNode',
// };

// /**
//  * @returns {(str: string) => {pos: string, i: number}}
//  */
// export const useHtmlPosition = () => {
//     let lastPos = htmlPos.outer;
//     /**
//      * @param {string} str
//      * @returns {{pos: string, i: number}}
//      */
//     const getHtmlPosition = (str) => {
//         for (let i = str.length; i >= 0; i--) {
//             if (str[i] === '>' && str.slice(i - 2, i + 1) !== '-->') {
//                 lastPos = htmlPos.outer;
//                 return { pos: lastPos, i };
//             }
//             if (str[i] === '<' && str.slice(i, i + 4) !== '<!--') {
//                 lastPos = htmlPos.inner;
//                 return { pos: lastPos, i };
//             }
//         }
//         return { pos: lastPos, i: -1 };
//     };
//     return getHtmlPosition;
// };

// /**
//  * @param {string} strLeft
//  * @param {string} strRight
//  * @param {number} equalPos
//  * @param {number} tagOpenPos
//  * @returns {{isSingleNoQuote: boolean, isSingleQuoted: boolean, isSingle: boolean, isMulti: boolean, hasLeadingQuote: boolean, hasClosingQuote: boolean}}
//  */
// function getCond(strLeft, strRight, equalPos, tagOpenPos) {
//     const quoteLeftIndex = strLeft.lastIndexOf('"');
//     const quoteRightIndex = strRight.indexOf('"');
//     const hasEqual = equalPos > -1 && equalPos > tagOpenPos;
//     const hasLeadingQuote =
//         strLeft.charAt(equalPos + 1) === '"' && equalPos + 1 === quoteLeftIndex;
//     const hasClosingQuote =
//         quoteRightIndex !== -1 && strRight.charAt(quoteRightIndex - 1) !== '=';
//     const isSingleNoQuote =
//         hasEqual &&
//         !hasLeadingQuote &&
//         !hasClosingQuote &&
//         strLeft.slice(equalPos).trim() === '=';
//     // console.log('!!!!!!!!!!:: ', strLeft.slice(equalPos).trim());
//     const isSingleQuoted = hasEqual && hasLeadingQuote && hasClosingQuote;
//     const isMulti = hasEqual && hasLeadingQuote && !hasClosingQuote;
//     return {
//         isSingleNoQuote,
//         isSingleQuoted,
//         isSingle: isSingleNoQuote || isSingleQuoted,
//         isMulti,
//         hasLeadingQuote,
//         hasClosingQuote,
//     };
// }

// /**
//  * @returns {(strLeft: string, strRight: string) => {res: string, lastType: string}}
//  */
// export function useInnerHtmlMarker() {
//     let selfMarkers = 0;
//     let lastType;
//     const getHtmlPosition = useHtmlPosition();

//     /**
//      * @param {string} strLeft
//      * @param {string} strRight
//      * @returns {{res: string, lastType: string}}
//      */
//     const addMarker = (strLeft, strRight) => {
//         // const equalPos = getRealEqualPos(strLeft);
//         const equalPos = strLeft.lastIndexOf('=');
//         let tmpRes = '';
//         const pos = getHtmlPosition(strLeft);
//         const cond = getCond(strLeft, strRight, equalPos, pos.i);
//         if (pos.pos === htmlPos.outer) {
//             // console.log('outer');
//             lastType = templExpressions.htmlNode;
//             tmpRes = `${strLeft}${commentMarker}`;
//         } else if (cond.isMulti || cond.isSingle) {
//             // console.log('is attribute');
//             // console.log(cond);
//             // console.log('strleft: ', strLeft);
//             // console.log('strright: ', strRight);
//             if (cond.isSingle) lastType = templExpressions.htmlAttribute;
//             else lastType = templExpressions.htmlAttributeMulti;
//             tmpRes = `${strLeft.slice(0, equalPos)}${attributeMarker}${strLeft.slice(equalPos, strLeft.length)}${valueMarker}`;
//         } else if (lastType === templExpressions.htmlAttributeMulti) {
//             // console.log('is inside attribute');
//             // console.log(cond);
//             // console.log('strleft: ', strLeft);
//             // console.log('strright: ', strRight);
//             if (cond.hasClosingQuote) lastType = templExpressions.htmlAttribute;
//             else lastType = templExpressions.htmlAttributeMulti;
//             tmpRes = `${strLeft}${valueMarker}`;
//         } else {
//             // console.log('is self attribute');
//             selfMarkers++;
//             lastType = templExpressions.selfAttribute;
//             tmpRes = `${strLeft}${selfMarkers.toString()}${attributeMarker}="${valueMarker}"`;
//             // console.log('is self attribute: ', tmpRes);
//             // console.log(cond);
//             // console.log('strleft: ', strLeft);
//             // console.log('strright: ', strRight);
//             // throw new Error('unknown type');
//         }
//         return {
//             res: tmpRes,
//             lastType,
//         };
//     };
//     return addMarker;
// }

// // /**
// //  * @returns {(strLeft: string, strRight: string) => {res: string, lastType: string}}
// //  */
// // export function useInnerHtmlMarker() {
// //     let selfMarkers = 0;
// //     let lastType;
// //     const getHtmlPosition = useHtmlPosition();
// //     /**
// //      * @param {string} strLeft
// //      * @param {string} strRight
// //      * @returns {{res: string, lastType: string}}
// //      */
// //     const addMarker = (strLeft, strRight) => {
// //         const quoteRightIndex = strRight.indexOf('"');
// //         const equalPos = getRealEqualPos(strLeft);
// //         let tmpRes = '';
// //         const pos = getHtmlPosition(strLeft);
// //         if (pos === htmlPos.outer) {
// //             lastType = templExpressions.htmlNode;
// //             tmpRes = `${strLeft}${commentMarker}`;
// //         } else if (
// //             equalPos === -1 &&
// //             lastType === templExpressions.htmlAttributeMulti
// //         ) {
// //             if (quoteRightIndex > -1) lastType = templExpressions.htmlAttribute;
// //             tmpRes = `${strLeft}${valueMarker}`;
// //         } else if (equalPos === -1) {
// //             selfMarkers++;
// //             lastType = templExpressions.selfAttribute;
// //             tmpRes = `${strLeft}${selfMarkers.toString()}${attributeMarker}="${valueMarker}"`;
// //             // console.log('is self attribute: ', tmpRes);
// //             // console.log('strleft: ', strLeft);
// //             // console.log('strright: ', strRight);
// //         } else if (strLeft.charAt(equalPos) === strLeft.slice(-1)) {
// //             tmpRes = `${strLeft.slice(0, equalPos)}${attributeMarker}${strLeft.slice(equalPos, strLeft.length)}${valueMarker}`;
// //         } else if (strLeft.charAt(equalPos + 1) === '"') {
// //             if (quoteRightIndex > -1) lastType = templExpressions.htmlAttribute;
// //             else lastType = templExpressions.htmlAttributeMulti;
// //             tmpRes = `${strLeft.slice(0, equalPos)}${attributeMarker}${strLeft.slice(equalPos, strLeft.length)}${valueMarker}`;
// //         } else {
// //             throw new Error('unknown type');
// //         }
// //         return {
// //             res: tmpRes,
// //             lastType,
// //         };
// //     };
// //     return addMarker;
// // }

// /**
//  * @param {TemplateStringsArray} strings
//  * @returns {string}
//  */
// export function fillTemplateLiteral(strings) {
//     const addMarker = useInnerHtmlMarker();
//     let res = '';
//     for (let i = 0; i < strings.length - 1; i++) {
//         res += addMarker(strings[i], strings[i + 1]).res;
//     }
//     res += strings[strings.length - 1];
//     return res;
// }

// export default class Template {
//     /** @type {WeakMap<TemplateStringsArray, Template>} */
//     static #cache = new WeakMap();

//     /**
//      * @param {TemplateStringsArray} strings
//      * @returns {Template}
//      */
//     static getTemplate(strings) {
//         let t = this.#cache.get(strings);
//         if (t === undefined) {
//             t = new Template(strings);
//             this.#cache.set(strings, t);
//         }
//         return t;
//     }

//     /**
//      * @param {TemplateStringsArray} strings
//      * @returns {import('./LiveTemplate').default}
//      */
//     static getInstance(strings) {
//         const t = this.getTemplate(strings);
//         return new LiveTemplate(t);
//     }

//     static #getStale = useTemplateTreeWalker();

//     /**
//      * @param {TemplateStringsArray} strings
//      */
//     constructor(strings) {
//         this.#strings = strings;
//         this.#valueLen = strings.length - 1;
//         // console.log('strings: ', strings);
//         this.#strRes = fillTemplateLiteral(strings);
//         // console.log('res: ', this.#strRes);
//         this.#domTemplate = document.createElement('template');
//         this.#domTemplate.innerHTML = this.#strRes;
//         this.#getLive = Template.#getStale(
//             this.#domTemplate.content,
//             this.#valueLen,
//         );
//     }

//     #strRes = '';

//     #valueLen;

//     #strings;

//     #getLive;

//     #domTemplate;

//     get literalStrings() {
//         return this.#strings;
//     }

//     get result() {
//         return this.#strRes;
//     }

//     get valueArrLen() {
//         return this.#valueLen;
//     }

//     /**
//      * @returns {{frag: DocumentFragment, liveNodes: any[]}}
//      */
//     getLiveNodes() {
//         const frag = this.#domTemplate.content.cloneNode(true);
//         if (!(frag instanceof DocumentFragment)) throw new Error('!!');
//         const liveNodes = this.#getLive(frag);
//         return { frag, liveNodes };
//     }
// }








































// export default class Template {
//     /** @type {WeakMap<TemplateStringsArray, Template>} */
//     static #cache = new WeakMap();

//     /**
//      * @param {TemplateStringsArray} strings
//      * @returns {Template}
//      */
//     static getTemplate(strings) {
//         let t = this.#cache.get(strings);
//         if (t === undefined) {
//             t = new Template(strings);
//             this.#cache.set(strings, t);
//         }
//         return t;
//     }

//     /**
//      * @param {TemplateStringsArray} strings
//      * @returns {import('./LiveTemplate').default}
//      */
//     static getInstance(strings) {
//         const t = this.getTemplate(strings);
//         return new LiveTemplate(t);
//     }

//     static #getStale = useTemplateTreeWalker();

//     /**
//      * @param {TemplateStringsArray} strings
//      */
//     constructor(strings) {
//         this.#strings = strings;
//         this.#valueLen = strings.length - 1;
//         for (let i = 0; i < this.#valueLen; i++)
//             this.#defTemplate(strings[i], strings[i + 1]);
//         this.#strRes += strings[strings.length - 1];
//         // this.#domTemplate = document.createElement('template');
//         // this.#domTemplate.innerHTML = this.#strRes;
//         // this.#getLive = Template.#getStale(
//         //     this.#domTemplate.content,
//         //     this.#valueLen,
//         // );
//     }

//     #valueLen;

//     #strings;

//     #getLive;

//     #domTemplate;

//     get literalStrings() {
//         return this.#strings;
//     }

//     get result() {
//         return this.#strRes;
//     }

//     get valueArrLen() {
//         return this.#valueLen;
//     }

//     /**
//      * @returns {{frag: DocumentFragment, liveNodes: any[]}}
//      */
//     getLiveNodes() {
//         const frag = this.#domTemplate.content.cloneNode(true);
//         if (!(frag instanceof DocumentFragment)) throw new Error('!!');
//         const liveNodes = this.#getLive(frag);
//         return { frag, liveNodes };
//     }

//     #selfMarkers = 0;

//     #prev = 0;

//     #strRes = '';

//     /**
//      * @param {string} strLeft
//      * @param {string} strRight
//      */
//     #defTemplate(strLeft, strRight) {
//         const addInnerMarker = (/** @type {number | undefined} */ qPos) => {
//             const qul = strLeft.lastIndexOf('"');
//             const qur = strRight.indexOf('"');
//             if (
//                 (qPos !== -1 && qPos === strLeft.length - 1) ||
//                 qPos === qul - 1
//             ) {
//                 this.#strRes +=
//                     strLeft.slice(0, qPos) +
//                     attributeMarker +
//                     strLeft.slice(qPos, strLeft.length) +
//                     valueMarker;
//                 this.#prev = qul > qPos && qur === -1 ? 1 : -1;
//             } else if (this.#prev === 1 && qul === -1) {
//                 this.#strRes += strLeft + valueMarker;
//                 if (qur > -1) this.#prev = -1;
//             } else {
//                 this.#selfMarkers++;
//                 this.#strRes += `${
//                     strLeft + this.#selfMarkers.toString() + attributeMarker
//                 }="${valueMarker}"`;
//                 this.#prev = -1;
//             }
//         };

//         /**
//          * @param {string} delim
//          * @param {string} cmp
//          * @param {boolean} rev
//          * @returns {number}
//          */
//         const makeCmp = (delim, cmp, rev) => {
//             let lo = 0;
//             let j = strLeft.length;
//             while (lo !== -1) {
//                 lo = strLeft.lastIndexOf(delim, j);
//                 if (lo !== -1) {
//                     const start = rev ? lo - cmp.length : lo;
//                     const end = rev ? lo + 1 : lo + cmp.length;
//                     const c = strLeft.slice(
//                         Math.max(0, start),
//                         Math.max(0, end),
//                     );
//                     if (c !== cmp) break;
//                 }
//                 j = lo - 1;
//             }
//             return lo;
//         };
//         const lo = makeCmp('<', '<!--', false);
//         const lc = makeCmp('>', '-->', true);

//         if (lo > lc) {
//             this.#prev = 0;
//             const qPos = strLeft.lastIndexOf('=');
//             addInnerMarker(qPos < lo ? -1 : qPos);
//         } else if (lc > lo) {
//             this.#prev = 0;
//             this.#strRes += strLeft + commentMarker;
//             this.#prev = 2;
//         } else if (lc === -1 && lo === -1) {
//             if (this.#prev === 1 || this.#prev === -1) {
//                 addInnerMarker(strLeft.lastIndexOf('='));
//             } else {
//                 this.#strRes += strLeft + commentMarker;
//             }
//         }
//     }
// }
