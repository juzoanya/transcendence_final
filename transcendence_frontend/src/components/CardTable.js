import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../lib_templ/templ/TemplateAsLiteral.js';
import { IteralbleComponent, IteralbleTableComponent } from './IteralbleComponent.js';



/**
 * @template {string} K
 * @template T
 * @param {string} title 
 * @param {string} icon 
 * @param {T[] | undefined} contentArray 
 * @param {{heading: K, cb: ((heading: K, item: T) => TemplateAsLiteral)}[]} headingsArray 
 * @param {boolean} [indexed] 
 * @returns 
 */
export const renderTableCard = (title, icon, contentArray, headingsArray, indexed) => {
    // console.log(listItems);
    return html`
        <div class="card text-center">
            ${title ?
                html`
                <h6 class="my-2 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h6>
            `
            :   ''}
            <div class="card-body">
                <table class="table table-dark table-hover">
                    <thead>
                        ${indexed ? html`<th scope="col">#</th>` : ''}
                        <tr>${headingsArray.map(i => html`<th scope="col">${i.heading}</th>`)}</tr>
                    </thead>
                    <tbody>
                        ${contentArray?.map((t, i) => html`
                            <tr>
                                ${indexed ? html`<th scope="row">${i}</th>` : ''}
                                ${headingsArray.map(k => html`
                                    <td>
                                        ${k.cb(k.heading, t)}
                                    </td>
                                `)}
                            </tr>
                        `)}
                    </tbody>
                </table>
                </div>
            </div>
    `;
};


/**
 * @template T
 * @template K
 * @extends {IteralbleTableComponent<T, K>}
 */
class CardTable extends IteralbleTableComponent {
    static observedAttributes = ['title', 'icon'];
    constructor() {
        super();
        this.title = '';
        this.icon = '';
    }

    render() {
        return html`
            <div class="card text-center">
            ${this.title ? html`
                <h6 class="my-2 card-title">${this.icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${this.title}</h6>
            `
            :   ''}
            <div class="card-body">
                <table class="table table-dark table-hover">
                    <thead>
                        ${this.indexed ? html`<th scope="col">#</th>` : ''}
                        <tr>${this.props.headingsCbArray?.map(i => html`<th scope="col">${i.heading}</th>`)}</tr>
                    </thead>
                    <tbody>
                        ${this.props.items?.map((t, i) => html`
                            <tr>
                                ${this.indexed ? html`<th scope="row">${i}</th>` : ''}
                                ${this.props.headingsCbArray?.map(k => html`
                                    <td>
                                        ${k.cb(k.heading, t)}
                                    </td>
                                `)}
                            </tr>
                        `)}
                    </tbody>
                </table>
                </div>
            </div>
        `
    }
}
customElements.define("card-table", CardTable);