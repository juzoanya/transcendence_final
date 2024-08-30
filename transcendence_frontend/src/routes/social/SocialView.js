import { BaseElement, html } from '../../lib_templ/BaseElement';

class SocialView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();

    }

    render() {
        return html`

        `
    }
}
customElements.define("social-view", SocialView);