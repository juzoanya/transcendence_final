/* eslint-disable max-classes-per-file */
import { BaseElement, html } from '../BaseElement.js';


export class NotFoundComp extends BaseElement {
    constructor(){super(false, false)};
    render() {
        return html`<h1>404 Not Found</h1>`;
    }
}
window.customElements.define( 'router-default-not-found', NotFoundComp);

export class InvalidComp extends BaseElement {
    constructor(){super(false, false)};
    render() {
        return html`<h1>unable to create component</h1>`;
    }
}
window.customElements.define( 'router-invalid-web-component', InvalidComp);
