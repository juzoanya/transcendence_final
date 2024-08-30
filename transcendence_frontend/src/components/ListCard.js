
import { BaseElement, html, TemplateAsLiteral } from '../lib_templ/BaseElement';
import { ListGroup } from './AnimL';


/**
 * @template T
 * @typedef {import('./AnimL').ListGroupProps<T> & {
 *      header?: TemplateAsLiteral
 *      footer?: TemplateAsLiteral
 * }} ListCardProps
 * 
 */

// /**
//  * @prop footer
//  * @template  T
//  * @extends {ListGroup<T, ListCardProps<T>>}
//  */

/**
 * @prop footer
 * 
 * @template K
 * @template {ListCardProps<K>} T
 * @extends {ListGroup<K, T>}
 */
export class ListCard extends ListGroup {
    static observedAttributes = ['title', 'icon'];

    constructor() {
        super();
        this.title = '';
        this.icon = '';
        this.flush = true;
    //    /** @type {ListCardProps<T>} */
        // this.props = this.props;  // Re-cast the props to ListCardProps
        // this.props.header = html``;
        // this.props.footer = html``;
    }
    // this.props.rendercb = this.renderItem.bind(this);

    /**
     * @param {*} item 
     * @param {*} i 
     */
    renderItem(item, i) {

    }

    render() {
        return html`
            <div class="card ${this.light ? 'bg-light-subtle' : ''} text-center">
                ${this.props.header ? html`
                    <div class="card-header">
                        ${this.props.header}
                    </div>    
                ` : ''}
                <h6 class="my-2 card-title">
                    ${this.icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>
                    ${this.title}
                </h6>
                <div class="card-body">
                    <div>
                        ${super.render()}
                    </div>
                </div>
                ${this.props.footer ? html`
                    <div class="card-footer">
                       ${this.props.footer}
                    </div>
                ` : ''}
            </div>
        `
    }
}
customElements.define("list-card", ListCard);
