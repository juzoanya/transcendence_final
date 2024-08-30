import { BaseElement, html } from '../../lib_templ/BaseElement.js';

/**
 * @customElement bs-button
 * @attr color
 * @attr outline
 * @attr small
 * @attr large
 * @attr disabled
 * @attr icon
 * @attr iconright
 * @attr radius
 * @attr loadingtext
 * @attr text
 * @attr dropdownitem
 * @attr stretch
 * @attr tooltip
 * @attr label
 * @prop _async_handler
 */
export default class BsButton extends BaseElement {
   
    static observedAttributes = [
        'color',
        'outline',
        'small',
        'large',
        'disabled',
        'icon',
        'iconright',
        'radius',
        'loadingtext',
        'text',
        'dropdownitem',
        'stretch',
        'tooltip',
        'label',
    ];

    constructor() {
        super(false, false);
        this.outline = false;
        this.color = 'primary';
        this.small = false;
        this.large = false;
        this.icon = '';
        this.iconright = false;
        this.radius = '';
        this.text = '';
        this.loadingtext = '';
        this.dropdownitem = false;
        this.stretch = false;
        this.disabled = false;
        this.tooltip = '';
        this.label='Button';

        this.props._async_handler = async () => {
            console.log('_async_handler wait');
            // await new Promise((res) => setTimeout(res, 1000));
            console.log('done wait');
        };

        this._loading = false;
    }

    async onClick() {
        this._loading = true;
        super.requestUpdate();
        console.log('bs-button onclick');
        await this.props._async_handler();
        console.log('bs-button onclick DONE');
        this._loading = false;
        super.requestUpdate();
    }

    getIcon = () => {
        /** @type {string | import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral} */
        const margin = `m${this.iconright ? 's' : 'e'}-1`
        return html`
            <span class="${this.icon ? "position-relative" : "position-absolute top-50 start-50 translate-middle"}  ${this.text ? `text-start ${margin}` : ''}">
                <span class="p-0 m-0 d-inline-block" style="${"width:1em;height:1em;"}">
                    <span class="${this._loading ? '' : 'd-none'} p-0 m-0 spinner-border spinner-border-sm" aria-hidden="true" style="${"width:1em;height:1em;"}" ></span>
                </span>
                <i class="${this._loading ? 'd-none' : ''} position-absolute top-50 start-50 translate-middle fa-solid fa-fw fa-${this.icon}"></i>
            </span>
        `;
    };



    render() {
        const color = `btn-${this.outline ? 'outline-' : ''}${this.color}`;
        const size = this.small ? 'btn-sm' : this.large ? 'btn-lg' : '';
        const radius = this.radius ? `rounded-${this.radius}` : '';
        
        if (this.loadingtext.length == 0) this.loadingtext = this.text;
        const text = this._loading ? this.loadingtext : this.text;
        const stretch = this.stretch ? 'w-100':'';
        const isDropdown = this.dropdownitem ? 'dropdown-item' : '';
        const isActive = this._loading ? 'active' : '';
        const isPressedAria = this._loading ? "true" : 'false';
        const isDisabledAria = this._loading || this.disabled ? "true" : 'false';

        this.shouldShowText = !this._loading || this.icon && this._loading;
        return html`
            <button
                @click=${this.onClick.bind(this)}
                class=" ${isActive} btn ${color} ${size} ${radius} ${stretch} ${isDropdown} "
                ?disabled=${this._loading || this.disabled}
                role="button"
                aria-pressed="${isPressedAria}"
                aria-disabled="${isDisabledAria}"
                aria-label="${this.label}"
                data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="${this.tooltip}"
            >
            ${this.dropdownitem ? html`
                <span>
                    <i class="fa-solid me-1 fa-fw fa-${this.icon}"></i>
                    <span class="${this.shouldShowText ? '':'invisible'}" role="status">${text}</span>
                </span>
            ` : html`
                <span class="position-relative" >
                    ${this.iconright ? html`
                        <span class="${this.shouldShowText ? '':'invisible'}" role="status">${text}</span>
                        ${this.getIcon()}
                    ` : html`
                        ${this.getIcon()}
                        <span class="${this.shouldShowText ? '':'invisible'}" role="status">${text}</span>
                    `}
                </span>
            `}
            </button>
        `;
    }
}
customElements.define('bs-button', BsButton);

// /**
//  * @customElement bs-button
//  * @attr color
//  * @attr outline
//  * @attr small
//  * @attr large
//  * @attr disabled
//  * @attr icon
//  * @attr iconright
//  * @attr radius
//  * @attr loadingtext
//  * @attr text
//  * @attr dropdownitem
//  * @attr stretch
//  * @prop _async_handler
//  */
// export default class BsButton extends BaseElement {
   
//     static observedAttributes = [
//         'color',
//         'outline',
//         'small',
//         'large',
//         'disabled',
//         'icon',
//         'iconright',
//         'radius',
//         'loadingtext',
//         'text',
//         'dropdownitem',
//         'stretch',
//     ];

//     constructor() {
//         super(false, false);
//         this.outline = false;
//         this.color = 'primary';
//         this.small = false;
//         this.large = false;
//         this.icon = '';
//         this.iconright = false;
//         this.radius = '';
//         this.text = '';
//         this.loadingtext = '';
//         this.dropdownitem = false;
//         this.stretch = false;
//         this.disabled = false;

//         this.props._async_handler = async () => {
//             console.log('_async_handler wait');
//             await new Promise((res) => setTimeout(res, 1000));
//             console.log('done wait');
//         };

//         this._loading = false;
//     }

//     async onClick() {
//         this._loading = true;
//         super.requestUpdate();
//         console.log('bs-button onclick');
//         await this.props._async_handler();
//         console.log('bs-button onclick DONE');
//         this._loading = false;
//         super.requestUpdate();
//     }

//     getSpinner = () => html`<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>`

//     getIcon = (disable) => this.icon ? html`<i class="${disable ? 'd-none':''} fa-solid fa-fw fa-${this.icon}"></i>` : ''

//     getIcono = () => {
//         /** @type {string | import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral} */
        
//         // console.log('icon  right: ', this.iconright);
       
//         // let rend = this._loading ? this.getSpinner() : this.icon ? this.getIcon() : '';
//         let rend = html`
//             <span>
//                 ${this._loading ? this.getSpinner() : ''}
//                 ${this.getIcon(this._loading)}
//             </span>
//         `
//         const margin = `m${this.iconright ? 's' : 'e'}-2`
//         return !this.icon ? rend : html`
//             <span
//                 style="${'width: 1.25em;'}"
//                 class="${this.text ? `text-start ${margin}` : ''}"
//             >
//                 ${rend}
//             </span>
//         `;

//         // return html`<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>`;
//         // <i class="fa-solid fa-fw fa-spinner fa-spin-pulse"></i>
//     };

//     render() {
//         // console.log("render button");
//         // console.dir(this)
        
//         const color = `btn-${this.outline ? 'outline-' : ''}${this.color}`;
//         const size = this.small ? 'btn-sm' : this.large ? 'btn-lg' : '';
//         const radius = this.radius ? `rounded-${this.radius}` : '';
        
//         if (this.loadingtext.length == 0) this.loadingtext = this.text;
//         const text = this._loading ? this.loadingtext : this.text;
//         const stretch = this.stretch ? 'w-100':'';
//         const isDropdown = `justify-content-${this.dropdownitem ? 'start dropdown-item' : 'evenly'}`;
//         const isActive = this._loading ? 'active' : '';
//         const isPressedAria = this._loading ? "true" : 'false';
//         const isDisabledAria = this._loading || this.disabled ? "true" : 'false';
//         return html`
//             <button
//                 @click=${this.onClick.bind(this)}
//                 class="${stretch} ${isActive} ${radius} btn ${color} ${size} px-2 d-inline-flex align-items-center ${isDropdown}"
//                 ?disabled=${this._loading || this.disabled}
//                 role="button"
//                 aria-pressed="${isPressedAria}"
//                 aria-disabled="${isDisabledAria}"
//             >
//                 ${this.iconright ? html`
//                     <span role="status">${text}</span>
//                     ${this.getIcono()}
//                 ` : html`
//                     ${this.getIcono()}
//                     <span role="status">${text}</span>
//                 `}
               
//             </button>
//         `;
//     }
// }
// customElements.define('bs-button', BsButton);

// ${this._loading && this.iconright ?
//     html`<span role="status">${text}</span>`
// :   ''}
// ${!this._loading && this.iconright ? this.text : ''}
// ${(this.icon || this.iconright) ? this.getIcon() : ''}
// ${this._loading && !this.iconright ?
//     html`<span role="status">${this.loadingtext}</span>`
// :   ''}
// ${!this._loading && !this.iconright ? this.text : ''}


// /**
//  * @customElement bs-button
//  */
// export default class BsButton extends BaseElement {
//     static observedAttributes = [
//         'color',
//         'outline',
//         'small',
//         'large',
//         'disabled',
//         'icon',
//         'iconright',
//         'radius',
//         'loadingtext',
//         'text',
//         'dropdownitem',
//         'stretch',
//     ];

//     constructor() {
//         super(false, false);
//         this.outline = false;
//         this.color = 'primary';
//         this.small = false;
//         this.large = false;
//         this.icon = '';
//         this.iconright = false;
//         this.radius = '';
//         this.text = '';
//         this.loadingtext = '';
//         this.dropdownitem = false;
//         this.stretch = false;

//         this.props._async_handler = () => {};

//         this._loading = false;
//     }

//     async onClick() {
//         this._loading = true;
//         super.requestUpdate();
//         await this.props._async_handler();
//         this._loading = false;
//         super.requestUpdate();
//     }

//     getIcon = () => {
//         /** @type {string | import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral} */
//         let rend = '';
//         if (this._loading) {
//             rend = html`
//                 <span
//                     class="spinner-border spinner-border-sm"
//                     aria-hidden="true"
//                 ></span>
//             `;
//         } else if (this.icon) {
//             rend = html`<i class="fa-solid fa-${this.icon}"></i>`;
//         }
//         return html`
//             <span
//                 style="${'width: 1.25em;'}"
//                 class=" ${this.text ? 'text-start' : ''} ${this.text ?
//                     `m${this.iconright ? 's' : 'e'}-1`
//                 :   ``} "
//             >
//                 ${rend}
//             </span>
//         `;
//         // return html`<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>`;
//         // <i class="fa-solid fa-fw fa-spinner fa-spin-pulse"></i>
//     };

//     render() {
//         console.log("render button");
//         console.dir(this)
//         const color = `btn-${this.outline ? 'outline-' : ''}${this.color}`;
//         let size = '';
//         if (this.small) {
//             size = 'btn-sm';
//         } else if (this.large) {
//             size = 'btn-lg';
//         }
//         const radius = this.radius ? `rounded-${this.radius}` : '';
//         return html`
//             <button
//                 @click=${this.onClick.bind(this)}
//                 class="${this.stretch ? 'w-100' : (
//                     ''
//                 )} d-inline-flex align-items-center justify-content-${(
//                     this.dropdownitem
//                 ) ?
//                     'start'
//                 :   'evenly'} ${radius} btn ${color} ${size} ${(
//                     this.dropdownitem
//                 ) ?
//                     'dropdown-item'
//                 :   ''} "
//                 ?disabled=${this._loading}
//                 role="button"
//             >
//                 ${this._loading && this.iconright ?
//                     html`<span role="status">${this.loadingtext}</span>`
//                 :   ''}
//                 ${!this._loading && this.iconright ? this.text : ''}
//                 ${(this.icon || this.iconright) ? this.getIcon() : ''}
//                 ${this._loading && !this.iconright ?
//                     html`<span role="status">${this.loadingtext}</span>`
//                 :   ''}
//                 ${!this._loading && !this.iconright ? this.text : ''}
//             </button>
//         `;
//     }
// }
// customElements.define('bs-button', BsButton);
