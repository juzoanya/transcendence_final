import { BaseElement, html } from '../../lib_templ/BaseElement.js';

export default class BsDropDown extends BaseElement {
    constructor() {
        super(false, false);
    }

    render() {
        return html`
            <div class="dropdown">
                <button
                    class="btn btn-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    actions
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#">Action</a></li>
                    <li>
                        <a class="dropdown-item" href="#">Another action</a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="#"
                            >Something else here</a
                        >
                    </li>
                </ul>
            </div>
        `;
    }
}
customElements.define('bs-dropdown', BsDropDown);
