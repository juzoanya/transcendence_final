import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts';
import { BaseElement, createRef, html, ref } from '../../lib_templ/BaseElement';

/**
 * @typedef {{
*  canvas: OffscreenCanvas
* }} ImageScalerInit
*/

/**
* @typedef {{
*  image: File;
*  id?: number;
*  size: number;
* }} ScaleImageMessage
*/

/**
* @typedef {{
*  image: Blob;
*  id?: number;
*  width: number;
*  height: number;
* }} ScaledImageMessage
*/

/**
 * @typedef {{
*  error: string;
*  id?:number;
* }} ErrorMessage
*/


/**
 * @typedef {import('../../lib_templ/BaseBase').BaseBaseProps & {
 *  on_image_data: (image: File | Blob) => void
 * }} FileButtonProps
 */


/**
 * @prop on_image_data
 * @attr text
 * @attr icon
 * @extends {BaseElement<FileButtonProps>}
 */
export class FileButton extends BaseElement {

    /** @type {Worker | undefined} */
    static #worker;

    static #count = 0;
    static #getNextId() {
        const i = this.#count++;
        return i;
    }

    /** @type {Map<number, FileButton>} */
    static #lookup = new Map();

    /** @type {WeakMap<FileButton, number[]>} */
    static #revlookup = new WeakMap();

    /** @param {MessageEvent} e */
    static #onMessage(e) {
        console.log('resized static !: ', e);
        
        /** @type {ScaledImageMessage | ErrorMessage} */
        const msg = e.data;
        if (msg.id != undefined) {
            const instance = this.#lookup.get(msg.id);
            if ('error' in msg) {
                instance?.handleError(msg.error);
            } else {
                instance?.onResized(msg);
            }
        }
    };
  

    /** @param {FileButton} instance */
    static closeInstance(instance) {
        const narr = this.#revlookup.get(instance);
        if (narr != undefined) {
            narr.forEach((n) => {
                this.#lookup.delete(n);
            });
        }
        console.log('\ndisposed, new lookup: ', this.#lookup.forEach((k,v) => {console.log(k, ': ', v);
        }));
        console.log('disposed, new revlookup: ', this.#revlookup);
        // if (this.#lookup.size === 0) {

        // }
    }

    /**
     * @param {FileButton} instance
     * @param {ScaleImageMessage} data
     */
    static resizeFile(instance, data) {
        if (this.#worker == undefined) {
            this.#worker = new Worker(new URL('./scaleImageWorker.js', import.meta.url));
            const canvas = new OffscreenCanvas(0, 0);
            /** @type {ImageScalerInit} */
            const initmsg = {canvas};
            this.#worker.onmessage = this.#onMessage.bind(this);
            this.#worker.onmessageerror = (e) => {
                document.dispatchEvent(new ToastNotificationErrorEvent(`${e}`));
            }
            this.#worker.onerror = (e) => {
                document.dispatchEvent(new ToastNotificationErrorEvent(`${e}`));
            }
            
            this.#worker.postMessage(initmsg, [canvas]);
        }
        let narr = this.#revlookup.get(instance);
        if (narr == undefined) {
            narr = [];
            this.#revlookup.set(instance, narr);
        }
        data.id = this.#getNextId();
        narr.push(data.id);
        this.#lookup.set(data.id, instance);
        console.log('hast ist: ', this.#lookup.get(data.id));
        
        console.log('resizeFile: lookup: ', this.#lookup);
        console.log('resizeFile: revlookup: ', this.#revlookup);
        this.#worker.postMessage(data);
    }

    static observedAttributes = ['text', 'icon'];
    constructor() {
        super();
        this.props.on_image_data = (f) => {};
        this.text = '';
        this.icon = '';


        this.boundOnFileButtonClick = this.onFileButtonClick.bind(this);
        this.boundOnInputChange = this.onInputChange.bind(this);
    }

    disconnectedCallback() {
        console.log('disconnectedcallback');
        
        FileButton.closeInstance(this);
        super.disconnectedCallback();
    }

    /** @param {string} error  */
    handleError(error) {
        document.dispatchEvent(new ToastNotificationErrorEvent(error));
    }

    /** @param {ScaledImageMessage} data  */
    onResized(data) {
        console.log('resized!: ', data);
        this.props.on_image_data(data.image);
    }

    /** @param {InputEvent} e  */
    onInputChange(e) {
        if (this.inputRef.value) {
            if (this.inputRef.value.files instanceof FileList && this.inputRef.value.files.length > 0) {
                if (this.inputRef.value.files[0].type.match(/image.*/) == null) {
                    this.handleError('Invalid File Format!');
                } else {
                    FileButton.resizeFile(this, {image: this.inputRef.value.files[0], size: 800});
                }
            }
        }
    }

    async onFileButtonClick() {
        this.inputRef.value?.click();
    }

    /** @type {import('../../lib_templ/BaseElement').Ref<HTMLInputElement>} */
    inputRef = createRef();
    render() {
        
        return html`
            <input
                ${ref(this.inputRef)}
                type="file"
                id="input"
                style="${"display:none;"}"
                @change=${this.boundOnInputChange}
            />
            <bs-button
                ._async_handler=${this.boundOnFileButtonClick}
                color="dark"
                icon="${this.icon}"
                text="${this.text}"
                stretch
            ></bs-button>
        `
    }
}
customElements.define("file-button", FileButton);

 // try {
//     /** @type {FileList} */
//     const fileList = await new Promise( function (resolve, reject) {
//         /**
//          * @param {Event} ev
//          * @this {any}
//          */
//         function handleUpload(ev) {
//             inpt.removeEventListener('change', handleUpload);
//             resolve(this.files);
//         }
//         function handleCancel(ev) {
//             inpt.removeEventListener('cancel', handleCancel);
//             reject(ev);
//         }
//         inpt.addEventListener('change', handleUpload);
//         inpt.addEventListener('cancel', handleCancel);
//     })
//     console.log('fileList: ', fileList);
//     const fd = new FormData();
//     fd.append('avatar', fileList[0])
//     const res = await sessionService.updateUserData(fd);

//     super.requestUpdate();
// } catch (e) { console.log('err: ', e); }