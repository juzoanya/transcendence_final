export class TemplateAsLiteral {
    constructor(strings, values) {
        this.#strings = strings;
        this.#values = values;
    }

    get strings() {
        return this.#strings;
    }

    get values() {
        return this.#values;
    }

    /** @type {TemplateStringsArray} */
    #strings;

    /** @type {any[]} */
    #values;
}

/**
 * @param {TemplateStringsArray} strArr
 * @param {any[]} Args
 * @returns {TemplateAsLiteral}
 */
export function html(strArr, ...Args) {
    return new TemplateAsLiteral(strArr, Args);
}

/**
 * @param {TemplateStringsArray} strArr
 * @returns {CSSStyleSheet}
 * @param {any[]} _Args
 */
// eslint-disable-next-line no-unused-vars
export function css(strArr, ..._Args) {
    if (strArr.length > 1)
        throw new Error('expressions are in css not allowed');
    const sheet = new CSSStyleSheet({ baseURL: '127.0.0.1:5500' });
    sheet.replaceSync(strArr[0]);
    return sheet;
}
