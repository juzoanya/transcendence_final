// /**
//  * @typedef {null | boolean | number | string | JsonArray | {[property: string]: Json}} Json
//  */

// /**
//  * @typedef {{[property: string]: Json} | {}} JsonObj
//  */

// /**
//  * @typedef {{[property: string]: Json}} JsonObj
//  * @extends Object
//  */

// /**
//  * @typedef {{[property: string]: Json}} JsonObj
//  */

// /** @typedef {Json[]} JsonArray */



/**
 * @typedef {object} RequestData
 * @property {URLSearchParams} [searchParams]
 * @property {string | object | FormData} [bodyData]
 * @property {HeadersInit} [additionalHeaders]
 * @property {string} [csrfHeaderName]
 * @property {string} [csrfCookieName]
 */

export class Fetcher {
    /** @type {URL} */
    #baseUrl;

    /** @type {RequestInit} */
    #requestInit;

    /** @type {number} */
    #timeoutMs;

    #csrf;

    /**
     * @param {string} [baseUrl]
     * @param {RequestInit} [baseRequest]
     * @param {number} [timeoutMs]
     */
    constructor(baseUrl, baseRequest, timeoutMs) {
        this.#baseUrl = new URL(baseUrl ?? '');
        // // console.log('base url: ', this.#baseUrl);
        this.#timeoutMs = timeoutMs ?? 10000;
        if (baseRequest) {
            this.#requestInit = { ...baseRequest };
            console.log('this.#requestInit: ', this.#requestInit);
            
        } else {
            this.#requestInit = {};
        }
        this.#requestInit.headers = new Headers(this.#requestInit.headers);
        console.log('this.#requestInit.headers: ', this.#requestInit.headers);
        
    }

    setCsfr() {

    }

    /**
     * @param {Response} response
     * @returns {Promise<APITypes.ApiResponse>}
     */
    static #handleResponse(response) {
        return response.text()
            .then((text) => {
                console.log(text);
                
                /** @type {APITypes.ApiResponse} */
                const data = text && JSON.parse(text);
                // console.log('fetch response: ', data);
                if (typeof data === "object") {
                    data.statuscode = response.status
                    return data;
                }
                return {
                    success: false,
                    message: data,
                    data: null,
                    statuscode: response.status
                }
            })
    }

    /**
     * @param {Headers} headersOld
     * @param {HeadersInit | undefined} headersAdd
     */
    static #setHeaders(headersOld, headersAdd) {
        if (headersAdd === undefined || headersAdd === null) return;
        if (headersAdd instanceof Headers) {
            headersAdd.forEach((v, k) => {
                headersOld.append(k, v);
            });
        } else if (headersAdd instanceof Array) {
            headersAdd.forEach((arr) => {
                if (typeof arr[0] !== 'string' || typeof arr[1] !== 'string')
                    throw new Error('wrong header format');
                headersOld.append(arr[0], arr[1]);
            });
        } else {
            throw new Error('wrong header format');
        }
    }

    /**
     * @param {RequestInit} usedRequest
     * @param {string | object | FormData | undefined} bodyData
     */
    static #setBody(usedRequest, bodyData) {
        if (bodyData === undefined || bodyData === null) return;
        if (typeof bodyData === 'string') {
            usedRequest.body = bodyData;
            return;
        }
        let object = bodyData;
        // console.log('my fromdata: ');
        if (usedRequest.headers instanceof Headers && bodyData instanceof FormData) {
            usedRequest.body = bodyData;
            // bodyData.forEach((v, k) => {
            // //     console.log(`key: $${k}$ value: $${v}$`);
            // })
            // object = {};
            // bodyData.forEach((value, key) => {
            //     object[key] = value;
            // });
            // usedRequest.headers.set('Content-Type', 'multipart/form-data');
        } else if (usedRequest.headers instanceof Headers) {
            usedRequest.headers.set('Content-Type', 'application/json');
            usedRequest.body = JSON.stringify(object);
        }
    }

    /**
     * @param {string} url
     * @param {string} method
     * @param {RequestData | undefined} data
     * @returns {Promise<APITypes.ApiResponse>}
     */
    $request(url, method, data) {
        const searchParams = data?.searchParams;
        let newUrl = url;
        if (searchParams instanceof URLSearchParams) {
            // // console.log('search params string: ', searchParams.toString());
            newUrl = `${url}?${searchParams.toString()}`;
        }
        const usedUrl = new URL(newUrl, this.#baseUrl);
        // // console.log("used url: ", usedUrl);
        /** @type {RequestInit} */
        const usedRequest = {};
        Object.assign(usedRequest, this.#requestInit);
        // // console.log("base req: ", this.#requestInit);
        // // console.log("used req: ", usedRequest);
        usedRequest.method = method;
        if (
            data &&
            usedRequest.headers &&
            usedRequest.headers instanceof Headers
        ) {
            // usedRequest.body =
            //     typeof data.bodyData === 'string' ?
            //         data.bodyData
            //     :   JSON.stringify(data.bodyData);
            Fetcher.#setHeaders(usedRequest.headers, data.additionalHeaders);
            Fetcher.#setBody(usedRequest, data.bodyData);
        }
        usedRequest.signal = AbortSignal.timeout(this.#timeoutMs);

        // // console.log("fetch this url: ", usedUrl.href);
        // // console.log("fetch headers: ", usedRequest.headers);
        // // console.log("fetch body Data: ", usedRequest.body);

        console.log('fetch url: ', usedUrl);
        return fetch(usedUrl, usedRequest).then(
            Fetcher.#handleResponse.bind(this),
        );
    }

    /**
     * @param {string} url
     * @param {RequestData} [data]
     * @returns {Promise<APITypes.ApiResponse>}
     */
    $get(url, data) {
        return this.$request(url, 'GET', data);
    }

    // /**
    //  * @param {string} url
    //  * @param {RequestData} data
    //  * @returns {Promise<object>}
    //  */
    /**
     * @param {string} url
     * @param {RequestData} [data]
     * @returns {Promise<APITypes.ApiResponse>}
     */
    $post(url, data) {
        return this.$request(url, 'POST', data);
    }

    /**
     * @param {string} url
     * @param {RequestData} data
     * @returns {Promise<APITypes.ApiResponse>}
     */
    $put(url, data) {
        return this.$request(url, 'PUT', data);
    }

    /**
     * @param {string} url
     * @param {RequestData} [data]
     * @returns {Promise<APITypes.ApiResponse>}
     */
    $delete(url, data) {
        return this.$request(url, 'DELETE', data);
    }
}

/**
 * @param {string} name
 * @returns {string | null}
 */
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === `${name}=`) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1),
                );
                break;
            }
        }
    }
    return cookieValue;
}
