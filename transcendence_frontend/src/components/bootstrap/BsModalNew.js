// @ts-nocheck
import { BaseElement, createRef, html, ref } from '../../lib_templ/BaseElement.js';
import { Modal } from 'bootstrap';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';

// import * as bootstrap from "../../../assets/bootstrap-5.3.2-dist/js/bootstrap.esm.js";

// export class BsModal extends BaseElem {
//     static #nbr = 0;

//     static observedAttributes = ["centered", "title", "footer"];

//     #intId;
//     constructor() {
//         super();

//         this.centered = true;
//         this.footer = false;
//         this.on_close = () => {

//         };
//         this.#intId = "bs-modal-no-" + BsModal.#nbr++;
//     }
//     connectedCallback() {
//         super.connectedCallback();
//         this.modal = this.root.querySelector(`#${this.#intId}`);
//         this.modalHandle = new bootstrap.Modal(this.modal, {backdrop: "static"});
//         /** @type {Array<HTMLSlotElement>} */
//         this.slots = Array.from(this.root.querySelectorAll(`slot`));
//         console.log("slots: ", this.slots);
//     }
//     #closed = true;
//     closeModal() {
//         this.toggleModal();
//         this.on_close();
//     }
//     toggleModal() {

//         this.modalHandle.toggle()
//     }

//     render() {
//         return html`
//         <button @click=${this.toggleModal.bind(this)}
//         type="button" class="btn btn-primary" data-bs-target="#${this.#intId}">
//             Launch demo modal
//         </button>
//         <div class="modal fade" tabindex="-1" id="${this.#intId}" >
//             <div class="modal-dialog ${this.centered ? "modal-dialog-centered" : ""}" role="document">
//                 <div class="modal-content">
//                 <div class="modal-header">
//                     <slot name="header"></slot>
//                     <button @click=${this.closeModal.bind(this)} type="button" class="btn-close" aria-label="Close"></button>
//                 </div>
//                 <div class="modal-body">
//                     <slot name="body"></slot>
//                 </div>
//                 ${this.footer ? html`
//                     <div class="modal-footer">
//                         <slot name="footer"></slot>
//                         <button type="button" class="btn btn-secondary">Close</button>
//                         <button type="button" class="btn btn-primary">Save changes</button>
//                     </div>
//                 ` : ""}
//                 </div>
//             </div>
//         </div>
//         `;
//     }
// }
// customElements.define("bs-modal", BsModal);

/**
 * @typedef {{header?: TemplateAsLiteral, content: TemplateAsLiteral, footer?: TemplateAsLiteral}} BsModalData
 * 
 * @typedef {object} MyProps
 * @property {BsModalData} data
 * @property {TemplateAsLiteral} header
 * @property {TemplateAsLiteral} content
 * @property {TemplateAsLiteral} footer
 * 
 * @typedef {import('../../lib_templ/BaseBase.js').BaseBaseProps & MyProps} BsModalProps
 */

/**
 * @attr centered
 * @attr show_close
 * @prop header
 * @prop footer
 * @prop content
 * @prop data
 * @attr fade
 * @extends BaseElement<BsModalProps>
 */
export default class BsModal extends BaseElement {
    static observedAttributes = ['centered', 'show_close', 'fade'];

    static #nbr = 0;
    

    static #getAvailId() {
        this.#nbr++;
        return `bs-modal-id-${this.#nbr}`;
    }

    constructor() {
        super(false, false, true);
        this.centered = true;
        // this.props.header = html``;
        // this.props.content = html``;
        // this.props.footer = html``;
        this.props.data = { content: html`` };
        this.show_close = false;
        this.__id = BsModal.#getAvailId();
        this.fade = false;
    }

    connectedCallback() {
        super.connectedCallback();
         /** @type {Partial<Modal.Options>} */
        // const options = {
        //     focus: true,
        //     keyboard: false,
        //     backdrop: "static"
        // }
        this.init();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        console.log('BsModal - disconnectedCallback');
        
        this.shouldDispose = true;
        this.#modalControl?.hide();
        this.#modalControl?.dispose();
    }
   

    async init() {
        await this.updateComplete;
        // console.log('modal: this.myModal.value: ', this.myModal.value);
        
        if (this.myModal.value) {
            this.#modalControl = new Modal(this.myModal.value, );
            console.dir(this.myModal.value);
            console.log('this.#modalControl: ', this.#modalControl);
            
        }
    }
    /** @type {Promise<boolean>} */
    isHidden = new Promise( (res) => (this.triggerHidden = res) );

    /** @param {BsModalData} data  */
    async setContentAndShow(data) {
        // console.log('BsModal: setContentAndShow: ', data);
        
        this._props.data = data;
        this.#modalControl.hide();
        await this.isHidden;
        this.#modalControl?.show();
        isHidden = new Promise( (res) => (this.triggerHidden = res) );
    }


    showModal() {
        // console.log('BS MODAL: showModal() func');

        if (this.modalState === 'closed') {
            // console.log('is closed');
            
            this.#modalControl?.show();
        } else if (this.modalState === 'opening') {
            // console.log('is opening');
            // super.requestUpdateDirect();
        } else if (this.modalState === 'open') {
            // console.log('is open');
            // super.requestUpdateDirect();
            this.shouldShow = true;
            this.hideModal();
        } else if (this.modalState === 'closing') {
            // console.log('is closing');
            this.shouldShow = true;
        }
    }
    hideModal() {
        // console.log('BS BUTTON: HIDE THE MODAL');
        this.#modalControl?.hide();
    }

    /** @type {'open' | 'opening' | 'closing' | 'closed'} */
    modalState = 'closed';
    #isOpen = false;
    /** @type {Modal | undefined} */
    #modalControl;
    myModal = createRef();


    render() {
        
        // console.log('render Modal');
        // console.log(this.props);
        // console.log(this.props._children);
       
        
        return html`
            
            <div
                @hide.bs.modal=${() => {
                    // console.log('BS MODAL HIDE');
                    // this.modalState = 'closing';
                    // this.#isOpen = false;
                    // console.log('request Update');
                    // super.requestUpdateDirect();
                }}
                @hidden.bs.modal=${() => {
                    this.triggerHidden();
                    // console.log('BS MODAL HIDDEN');
                    // this.modalState = 'closed';
                    // if (this.shouldDispose) {
                    //     this.#modalControl?.dispose();
                    // } else if (this.shouldShow) {
                    //     this.showModal();
                    //     this.shouldShow = false;
                    // } else {
                    //     this.#isOpen = false;
                    //     // console.log('request Update');
                    //     super.requestUpdateDirect();
                    // }
                }}
                @show.bs.modal=${() => {
                    // console.log('BS MODAL SHOW');
                    // this.modalState = 'opening';
                    // this.#isOpen = true;
                    // console.log('request Update');
                    super.requestUpdateDirect();
                }}
                @shown.bs.modal=${() => {
                    // console.log('BS MODAL SHOWN');
                    // this.modalState = 'open';
                    // this.#isOpen = true;
                    // console.log('request Update');
                    // super.requestUpdateDirect();
                }}

                ${ref(this.myModal)}

                class="modal ${this.fade ? 'fade' : ''}"
                id="${this.__id}"
                tabindex="-1"
                aria-labelledby="${this.__id}-label"
                aria-hidden="true"
            >
                <div class="modal-dialog">
                    <div class="modal-content">
                        ${(this.props.data.header ?? this.props.header) ? html`
                            <div class="modal-header">
                                <h1
                                    class="modal-title fs-5"
                                    id="${this.__id}-label"
                                >
                                    ${(this.props.data.header ?? this.props.header)}
                                </h1>
                                ${ this.show_close ? html`
                                <button
                                    type="button"
                                    class="btn-close"
                                    data-bs-dismiss="modal"
                                    aria-label="Close"
                                ></button>
                                    ` : '' }
                            </div>
                            ` : ''}
                        <div class="modal-body">
                            ${this.#isOpen ? (this.props.data.content ?? this.props.content) : ''}
                        </div>
                        ${(this.props.data.footer ?? this.props.footer) ?
                            html`
                                <div class="modal-footer">
                                    ${(this.props.data.footer ?? this.props.footer)}
                                </div>
                            `
                        :   ''}
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('bs-modal', BsModal);
