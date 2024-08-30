import { BaseElement, html } from '../lib_templ/BaseElement.js';

/**
 * @attr timeout
 */
export default class TimerComp extends BaseElement {
    static observedAttributes = ['timeout'];
    constructor() {
        super(false, false);
        this.timeout = 0;

    }

    connectedCallback() {
        super.connectedCallback();
        this.#timeout = this.#timeout;
        this.#interval = setInterval(() => {
            super.requestUpdate();
            if (this.timeout === 0) {
                clearInterval(this.#interval);
            } else {
                this.timeout -= 1;
            }
            
                
        }, 1000);
    }

    #interval;
    #timeout = 0;
    render() {
        return html`
            <span>${this.timeout}</span>
        `
    }
}
customElements.define("timer-comp", TimerComp);