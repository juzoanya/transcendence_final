import { BaseElement, createRef, html, ref } from '../../../lib_templ/BaseElement.js';
// import { Virtualizer } from './virtualizer_easy.js';

// /**
//  * @typedef {import('../../../lib_templ/BaseBase.js').Tpl} Tpl
//  * @typedef {import('../../../lib_templ/BaseBase.js').BaseBaseProps} BaseBaseProps
//  */


// /**
//  * @template T
//  * @typedef {(item: T, idx: number) => Tpl} RenderItemFunction
//  */

// /**
//  * @template T
//  * @typedef {object} VirtData
//  * @property {RenderItemFunction<T>} rendercb
//  * @property {T[]} items
//  */

// /**
//  * @template T
//  * @typedef {BaseBaseProps & VirtData<T> } VirtProps
//  */

// /** @type {RenderItemFunction<unknown>} */
// const defaultRenderItem = (item, idx) => html`${idx}: ${JSON.stringify(item, null, 2)}`;


// /**
//  * @prop rendercb
//  * @prop items
//  * @template T
//  * @extends BaseElement<VirtProps<T>>
//  */
// export class Virtcomp extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.props.rendercb = (item, idx) => defaultRenderItem(item, idx);
//         this.props.items = []
//     }
//     _first = 0;
//     _last = -1;
//     /** @type {Virtualizer | null} */
//     _virtualizer = null;


//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this._virtualizer?.disconnected();
//     }
//     render() {
//         console.log('render virt');
        
//         if (this._virtualizer) {
//             this._virtualizer.items = this.props.items;
//         } else {
//             this._virtualizer = new Virtualizer(this, this.props.items);
//         }
//         return html`
//                 ${this.props.items.map((item, idx) => this.props.rendercb(item, idx))}
            
//         `;
//     }

// }
// customElements.define("virt-ualizer", Virtcomp);

