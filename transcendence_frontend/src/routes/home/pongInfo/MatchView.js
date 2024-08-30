import { BaseElement, html } from '../../../lib_templ/BaseElement.js';


class MatchView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();

    }

    render() {
        return html`

        `
    }
}
customElements.define("match-view", MatchView);