import { BaseElement, html, ifDefined, TemplateAsLiteral } from '../lib_templ/BaseElement';
import { ListCard } from './ListCard';


/**
 * @template T
 * @typedef {import('./ListCard').ListCardProps<T> & {
 *      page: number,
 *      filters: {name: string, color: string}[],
 *      fetchdatacb: (page: number, filter?: Set<string>) => Promise<[number, T[]]>,
 * }} PageinatedListCardProps
 */


/**
 * @attr href
 * @attr title
 * @attr icon
 * @attr onlyarrows
 * @attr header
 * @attr usebutton
 * @prop onnewpagerequest
 * @prop fetchdatacb
 * @prop page
 * @prop filters
 * 
 * 
 * @template T
 * @extends {ListCard<T, PageinatedListCardProps<T>>}
 */
export class PageinatedListCard extends ListCard {
    static observedAttributes = ['href', 'page', 'title', 'icon', 'header', 'onlyarrows', 'usebutton'];
    constructor() {
        super();
        this.href = '';
        this.activePaginationPage = 1;
        this.tempPage = 1;
        this.minPage = 1;
        this.maxPage = 0;
        this.firstVisible = 1;
        this.propsInitialized = false;
        this.allInitialized = false;
        this.pageWindow = 3;
        this._props.fetchdatacb = async () => [1, []];
        this.header = false;
        this.onlyarrows = false;
        this.usebutton = false;
        this._props.filters = [];
    }

    connectedCallback() {
        super.connectedCallback();
        // this.init();
    }

    async init() {
        await this.updateComplete;
        this.allPropsSet = true;
        super.requestUpdate();
    }

  
    /** @param {number} page  */
    clampPage(page) {
        return Math.max(this.minPage, Math.min(page, this.maxPage))
    }

    /** @param {number | string} page  */
    parsePage(page) {
        if (typeof page === 'string') {
            page = Number(page);
        }
        if ((typeof page === 'number' && isNaN(page)) || typeof page !== 'number' || page < 1) {
            page = 1;
        }
        return Math.floor(page);
    }

    fetchInit = false;
    renderInit = false;
    onPropChange(key, value) {
        console.log('onPropChange');
        
        console.log('key: ', key);
        console.log('value: ', value);
        if (key === 'filters' && Array.isArray(value)) {
            this._props.filters = value;
        } else if (key === 'fetchdatacb') {
            if (typeof value === 'function') {
                this.fetchInit = true;
                this._props.fetchdatacb = value;
                if (this.usebutton) {
                    this.fetchData();
                }

            }
        } else if (key === 'rendercb' ) {
            if (typeof value === 'function') {
                this.renderInit = true;
                this._props.rendercb = value;
            }
            
        } else if (key === 'page') {
            console.log('set new page: ', value);
            // this.tempPage = Number(value);
            // const page = this.parsePage(value);
            // this.activePaginationPage = this.clampPage(page);
            console.log('this.propsInitialized?: ', this.propsInitialized);
            
            const page = this.parsePage(value);
            // if (this.last_page == undefined || this.last_page !== page) {
                this.fetchData();
            // }
            // this.last_page = page;
            if (!this.propsInitialized) {
                this.propsInitialized = true;
                this.activePaginationPage = page;
                this.firstVisible = page;
            } else {
                this.activePaginationPage = this.clampPage(page);
            }
        }
        return true;
        // return false;
    }

    async fetchInitial() {

    }

    async fetchData() {
        console.log('fetchData: myfetchdata', this.props.fetchdatacb);
        await this.updateComplete;
        console.log('fetchData updateComplete awaited, initialized: ', this.initialized);
        
        if (typeof this.props.fetchdatacb === 'function') {
            console.log('fetch page: ', this.activePaginationPage);
            
            const data = await this._props.fetchdatacb(this.activePaginationPage, this.selectedFilters);
            console.log('fetchedData: ', data);
            
            if (Array.isArray(data) && data.length === 2) {
                const [maxPages, newData] = data;
                if (typeof maxPages === 'number') {
                    this.maxPage = maxPages;
                    if (this.activePaginationPage > this.maxPage) {
                        this.activePaginationPage = this.maxPage;
                    }
                    if (!this.allInitialized) {
                        const currWindow = this.getVisibleWindow(this.activePaginationPage);
                        this.firstVisible = currWindow[0];
                        this.allInitialized = true;
                    }
                }
                if (Array.isArray(newData)) {
                    this.props.items = newData;
                }
                super.requestUpdate();
            } else {
                // throw new Error('the fetch callback need to return an Array of type [maxPages, newData[]]!')
            }
        }
    }

    /** @param {number | string} page  */
    createParamsUrl(page) {
        // console.log('try create url: ');
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('page', this.parsePage(page).toString());
            return url.toString();
        } catch (error) {
            
        }
    }


    /**
     * @param {number} page
     * @param {number} [nextFirstVisible]
     * @param {string} [icon]
     * @param {boolean} [showactive]
     */
    renderPageLink = (page, nextFirstVisible, icon, showactive = true) => html`
        <li class="page-item ${page === this.activePaginationPage && showactive ? 'active' : ''}"
            @click=${() => {
                this.activePaginationPage = page;
                if (nextFirstVisible != undefined) {
                    this.firstVisible = nextFirstVisible;
                }
            }} >
            <a class="page-link" href="${ifDefined(this.createParamsUrl(page))}">
                ${icon ? html`<i class="fa-solid fa-fw fa-${icon}"></i>` : page}
            </a>
        </li>
    `

    /**
     * @param {number} page
     * @param {number} [nextFirstVisible]
     * @param {string} [icon]
     * @param {boolean} [showactive]
     */
    renderPageButton = (page, nextFirstVisible, icon, showactive = true) => html`
        <li class="page-item ${page === this.activePaginationPage && showactive ? 'active' : ''}"
            @click=${() => {
                this.activePaginationPage = page;
                if (nextFirstVisible != undefined) {
                    this.firstVisible = nextFirstVisible;
                }
                this.fetchData();
            }} >
            <button class="page-link">
                ${icon ? html`<i class="fa-solid fa-fw fa-${icon}"></i>` : page}
            </button>
        </li>
    `

    renderPlaceHolder = () => html`
        <li class="page-item"><span class="page-link"><i class="fa-solid fa-fw"></i></span></li>
    `

    /** @param {number} page */
    getVisibleWindow(page) {
        return [this.clampPage(page), this.clampPage(page + this.pageWindow)];
    }


    renderPagination = () => {

        const prev = this.getVisibleWindow(this.firstVisible - this.pageWindow - 1);
        const curr = this.getVisibleWindow(this.firstVisible);
        const next = this.getVisibleWindow(this.firstVisible + this.pageWindow + 1);
        
        const showLeadingEllipsis = prev[1] - prev[0] > 0;
        const showTrailingEllipsis = next[1] - next[0] > 0;

        return html`
           <nav aria-label="Page navigation example">
               <ul class="pagination m-0">
                    ${this.onlyarrows ? html`
                        ${this.activePaginationPage <= this.minPage ? this.renderPlaceHolder()
                            : this.renderPageLink(
                                this.activePaginationPage - 1,
                                this.activePaginationPage - 1 == prev[1] && prev[1] > this.minPage ? prev[0] : undefined,
                                'arrow-left'
                            )
                        }
                        ${this.activePaginationPage >= this.maxPage ? this.renderPlaceHolder()
                            : this.renderPageLink(this.activePaginationPage + 1,
                                this.activePaginationPage + 1 == next[0] && next[0] < this.maxPage ? next[0] : undefined,
                                'arrow-right'
                            )
                        }
                        
                        ` : html`
                        ${this.activePaginationPage <= this.minPage ? this.renderPlaceHolder()
                            : this.renderPageLink(
                                this.activePaginationPage - 1,
                                this.activePaginationPage - 1 == prev[1] && prev[1] > this.minPage ? prev[0] : undefined,
                                'arrow-left'
                            )
                        }
                        
                        ${!showLeadingEllipsis ? this.renderPlaceHolder()
                            : this.renderPageLink(prev[0], prev[0], 'ellipsis', false)}
                        
                        ${Array.from({length: curr[1] - curr[0] + 1}).map((_, i) => this.renderPageLink(curr[0]+i))}
                        
                        ${!showTrailingEllipsis ? this.renderPlaceHolder()
                            : this.renderPageLink(next[0], next[0], 'ellipsis', false)}
                        
                        ${this.activePaginationPage >= this.maxPage ? this.renderPlaceHolder()
                            : this.renderPageLink(this.activePaginationPage + 1,
                                this.activePaginationPage + 1 == next[0] && next[0] < this.maxPage ? next[0] : undefined,
                                'arrow-right'
                            )
                        }
                    `}
                </ul>
            </nav>   
        `
    }

    renderPaginationButtons = () => {

        const prev = this.getVisibleWindow(this.firstVisible - this.pageWindow - 1);
        const curr = this.getVisibleWindow(this.firstVisible);
        const next = this.getVisibleWindow(this.firstVisible + this.pageWindow + 1);
        
        const showLeadingEllipsis = prev[1] - prev[0] > 0;
        const showTrailingEllipsis = next[1] - next[0] > 0;

        return html`
           <nav aria-label="Pageination ${this.title}">
               <ul class="pagination m-0">
                    ${this.onlyarrows ? html`
                        ${this.activePaginationPage <= this.minPage ? this.renderPlaceHolder()
                            : this.renderPageButton(
                                this.activePaginationPage - 1,
                                this.activePaginationPage - 1 == prev[1] && prev[1] > this.minPage ? prev[0] : undefined,
                                'arrow-left'
                            )
                        }
                        ${this.activePaginationPage >= this.maxPage ? this.renderPlaceHolder()
                            : this.renderPageButton(this.activePaginationPage + 1,
                                this.activePaginationPage + 1 == next[0] && next[0] < this.maxPage ? next[0] : undefined,
                                'arrow-right'
                            )
                        }
                        
                        ` : html`
                        ${this.activePaginationPage <= this.minPage ? this.renderPlaceHolder()
                            : this.renderPageButton(
                                this.activePaginationPage - 1,
                                this.activePaginationPage - 1 == prev[1] && prev[1] > this.minPage ? prev[0] : undefined,
                                'arrow-left'
                            )
                        }
                        
                        ${!showLeadingEllipsis ? this.renderPlaceHolder()
                            : this.renderPageButton(prev[0], prev[0], 'ellipsis', false)}
                        
                        ${Array.from({length: curr[1] - curr[0] + 1}).map((_, i) => this.renderPageLink(curr[0]+i))}
                        
                        ${!showTrailingEllipsis ? this.renderPlaceHolder()
                            : this.renderPageButton(next[0], next[0], 'ellipsis', false)}
                        
                        ${this.activePaginationPage >= this.maxPage ? this.renderPlaceHolder()
                            : this.renderPageButton(this.activePaginationPage + 1,
                                this.activePaginationPage + 1 == next[0] && next[0] < this.maxPage ? next[0] : undefined,
                                'arrow-right'
                            )
                        }
                    `}
                </ul>
            </nav>   
        `
    }


    // selectedFilters = new Set();
    // renderHeader = () => html`
    //     <div class="d-flex overflow-x-scroll gap-3 pb-3">
    //         ${this.props.filters.map(f => html`
    //             <button
    //                 @click=${() => {
    //                     if (this.selectedFilters.has(f.name)) {
    //                         this.selectedFilters.delete(f.name)
    //                     } else {
    //                         this.selectedFilters.add(f.name);
    //                     }
    //                     this.fetchData(f.name);
    //                     super.requestUpdate();
    //                 }}
    //                 type="button"
    //                 data-bs-toggle="button"
    //                 class="btn ${this.selectedFilters.has(f.name) ? 'active' : ''}"
    //             >
    //                 <span class="badge text-bg-${f.color}">${f.name}</span>    
    //             </button>
    //         `)}
    //     </div>
    // `
    

    selectedFilters = new Set();
    renderFilters = () => html`
        <div class="ms-4 flex-grow-1 d-flex overflow-x-scroll gap-1 pb-3">
            ${this.props.filters.map(f => html`
                <input
                    @click=${() => {
                        if (this.selectedFilters.has(f.name)) {
                            this.selectedFilters.delete(f.name)
                        } else {
                            this.selectedFilters.add(f.name);
                        }
                        this.activePaginationPage = 1;
                        this.fetchData();
                        super.requestUpdate();
                    }}
                    type="checkbox"
                    class="btn-check"
                    id="btn-check-filter-${f.name}"
                    autocomplete="off"
                    ?checked=${this.selectedFilters.has(f.name)}
                >
                <label class="btn p-1" for="btn-check-filter-${f.name}">
                    <span class="badge text-bg-${f.color}">${f.name}</span>
                </label>
            `)}
        </div>
    `

    renderNav = () => {
        console.log('filter: ', this.props.filters);
        
        return html`
        <div class="d-flex align-items-center">
            ${this.usebutton ? this.renderPaginationButtons() : this.renderPagination()}
            ${this.onlyarrows ? html`
                <span class="ms-4">${this.activePaginationPage}/${this.maxPage}</span>    
            ` : ''}
            ${this.renderFilters()}
        </div>
    `
    }
    

    

    render() {

        // if (!this.allPropsSet) {
        //     return html``;
        // }

        console.log('render page: ', this._props.items);
        

        if (this.header) {
            this._props.header = this.renderNav();
        } else {
            this._props.footer = this.renderNav();
        }
        return super.render();
    }
}
customElements.define("pageinated-list-card", PageinatedListCard);
