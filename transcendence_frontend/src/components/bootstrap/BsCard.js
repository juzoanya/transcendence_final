import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';

export const renderListItem = (content) => {
    return html`
        <li class="row px-0 list-group-item  d-flex justify-content-center align-items-center bg-light-subtle">
            ${content}
        </li>
    `;
};
export const renderListItem2 = (content) => {
    return html`
        <li class="list-group-item bg-light-subtle ">
            ${content}
        </li>
    `;
};

export const renderListItemAnchor = (href, content) => {
    return html`
        <a href="${href ?? '#'}" class="row px-0 list-group-item list-group-item-action d-flex justify-content-center align-items-center">
            ${content}
        </a>
    `;
};

export const renderListCardScroll = (title, icon, listItems) => {
    return html`
        <div class="card bg-light-subtle text-center">
            ${title ?
                html`
                <h6 class="my-2 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h6>
            `
            :   ''}
            <div class="card-body overflow-scroll" style="${"max-height: 100vh"}">
                <ul class="list-group list-group-flush" >
                    ${listItems || ''}
                </ul>
            </div>
        </div>
    `;
};

export const renderListCard = (title, icon, listItems) => {
    return html`
        <div class="card bg-light-subtle text-center">
            ${title ?
                html`
                <h6 class="my-2 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h6>
            `
            :   ''}
            <div class="card-body">
                <ul class="list-group list-group-flush">
                    ${listItems || ''}
                </ul>
            </div>
        </div>
    `;
};

/**
 * @template {string} K
 * @template T
 * @param {string} title 
 * @param {string} icon 
 * @param {T[] | undefined} contentArray 
 * @param {{heading: K, cb: ((heading: K, item: T) => TemplateAsLiteral | string)}[]} headingsArray 
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
                <table class="table  table-hover">
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
 * @template {string} K
 * @template T
 * @param {string} title 
 * @param {string} icon 
 * @param {T[] | undefined} contentArray 
 * @param {{heading: K, col: string, cb: ((heading: K, item: T) => TemplateAsLiteral | string)}[]} headingsArray 
 * @param {boolean} [indexed] 
 * @returns 
 */
export const renderTablelikeCard = (title, icon, contentArray, headingsArray, indexed) => {
    return html`
        <div class="card bg-light-subtle text-center">
            ${title ?
                html`
                <h6 class="my-2 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h6>
            `
            :   ''}
            <div class="card-body">
                <ul class="list-group list-group-flush" >
                   <li class="list-group-item bg-light-subtle">
                        <div class="row">
                            ${headingsArray.map(k => html`
                                <div class="${k.col}">
                                    ${k.heading}
                                </div>
                            `)}
                        </div>
                   </li>
                    ${contentArray?.map((t, i) => html`
                        <li class="list-group-item bg-light-subtle">
                            <div class="row align-items-center justify-content-between">
                                ${headingsArray.map(k => html`
                                    <div class="${k.col}">
                                        ${k.cb(k.heading, t)}
                                    </div>
                                `)}
                            </div>
                        </li>
                    `)}
                </ul>
                </div>
        </div>
    `;
};




export const renderCard = (title, icon, content) => {
    return html`
        <div class="card  bg-light-subtle" >
            ${title ?
                html`
                <h5 class="text-center pt-3 px-3 m-0 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h5>
            `
            :   ''}
            <div class="card-body">${content || ''}</div>
        </div>
    `;
};

/** @param {Array<{title: string, content: string}>} array */
export const renderListItemInfos = (array) => {
    return html`
        <div class="d-flex align-items-center justify-content-between">
            ${array.map(e => html`<span class="text-body-secondary p-0 m-0">${e.title}</span>`)}
        </div>
        <div class="d-flex align-items-center justify-content-between">
            ${array.map(e => html`<span class="text-body"> ${e.content} </span>`)}
        </div>
    `
}

export const renderCardInfo = (title, content) => {
    return html`
        <span class="text-body-secondary p-0 m-0 d-inline-flex flex-column align-items-center justify-content-center w-100 h-100">
            ${content ? html`
                ${title}
                <span class="text-body"> ${content} </span>
                ` : html`
                ${title}
            `}
        </span>
    `;
};

// export class BsListGroup extends BaseElem {
//     static observedAttributes = [];

//     constructor() {
//         super(false, false);

//         this._header = '';
//     }

//     render() {
//         return html` <ul class="list-group list-group-flush"></ul> `;
//     }
// }
// customElements.define('bs-list-group', BsListGroup);

export class BsCard extends BaseElement {
    static observedAttributes = ['icon', 'header'];

    constructor() {
        super(false, false);

        this.header = '';
        this.footer = '';
        this.icon = '';
    }

    render() {
        return html`
            <div class="card">
                ${this.header ?
                    html` <div class="card-header">
                        <h6 class="">
                            ${this.icon ? html`<i class="fa-solid fa-${this.icon}"></i>` : ''} ${this.header}
                        </h6>
                    </div>`
                :   ''}
                <div class="card-body"></div>
                ${this.footer ? html` <div class="card-footer">${this.footer}</div> ` : ''}
            </div>

            <div class="card text-start">
                <div class="card-body">
                    <h4 class="card-title">Title</h4>
                    <p class="card-text">Body</p>
                </div>
            </div>
        `;
    }
}
customElements.define('bs-card', BsCard);
