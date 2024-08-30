/* eslint-disable max-classes-per-file */
import { BaseElement, html } from '../../lib_templ/BaseElement.js';

export class BsTabContent extends BaseElement {
    static observedAttributes = ['active', 'label', 'id'];

    constructor() {
        super();
        this.active = false;
        this.label = 'HALLOOO';
    }

    render() {
        return html`
            <div
                class="tab-pane"
                id="${this.id}-content"
                role="tabpanel"
                aria-labelledby="${this.id}-tab"
                tabindex="-1"
                style="display: ${this.active ? 'block' : 'none'};"
            >
                <slot></slot>
            </div>
        `;
    }
}
customElements.define('bs-tab-content', BsTabContent);

export class BsTabs extends BaseElement {
    connectedCallback() {
        super.connectedCallback();
        this.#mySlot = this.root.querySelector('slot');
    }

    /** @type {Array<Element> | undefined} */
    #tabItems;

    #mySlot;

    tab = (item) => {
        const createTabs = (elem) => {
            // @ts-ignore
            // eslint-disable-next-line no-undef
            elem.toggler = new bootstrap.Tab(elem);
        };
        const handleTabClick = (e) => {
            e.target.toggler.show();
            this.#mySlot.assignedElements().forEach((elem) => {
                if (e.target.dataset.bsTarget === `${elem.id}-content`)
                    elem.setAttribute('active', '');
                else elem.removeAttribute('active');
            });
        };

        return html`
            <li class="nav-item" role="presentation">
                <button
                    ${createTabs}
                    @click=${handleTabClick}
                    id="${item.id}-tab"
                    type="button"
                    role="tab"
                    data-bs-target="${item.id}-content"
                    aria-controls="${item.id}-content"
                    aria-selected="${item.active ? 'true' : 'false'}"
                    class=" nav-link ${item.active ? 'active' : ''} "
                >
                    ${item.label}
                </button>
            </li>
        `;
    };

    render() {
        return html`
            <div>
                <ul class="nav nav-underline nav-justified" role="tablist">
                    ${this.#mySlot ?
                        this.#mySlot
                            .assignedElements()
                            .map((item) => this.tab(item))
                    :   ''}
                </ul>
                <div class="tab-content">
                    <slot></slot>
                </div>
            </div>
        `;
    }
}
customElements.define('bs-tabs', BsTabs);
