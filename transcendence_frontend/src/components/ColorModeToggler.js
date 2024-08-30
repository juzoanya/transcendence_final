import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { getPreferredTheme, setStoredTheme, setTheme } from '../services/themeSwitcher.js';


export class ColorModeToggler extends BaseElement {
    constructor() {
        super(false, false);

        this.theme = getPreferredTheme();
    }

    /** @param {import('../services/themeSwitcher.js').ThemeColors} theme */
    setCurrentTheme(theme) {
        this.theme = theme;
        setStoredTheme(theme);
        setTheme(theme);
        super.requestUpdate();
    }

    /**
     * @param {string} text 
     * @param {string} icon 
     * @param {import('../services/themeSwitcher.js').ThemeColors} theme
     */
    renderColorModeItem = (text, icon, theme) => {
        const active = this.theme === theme;
        return html`
            <button
                @click=${() => {this.setCurrentTheme(theme)}}
                type="button"
                class="w-100 mt-3 btn btn-outline-dark btn-lg ${active ? 'active' : ''}"
                data-bs-theme-value="light"
                aria-pressed="${active ? 'true' : 'false'}"
            >
                <span class="" style="${"width: 7em;"}">
                    <i class="fa-solid fa-fw fa-${icon} me-1" style="${"width: 1em;"}"></i>
                    <span class="me-1" style="${"width: 3em;"}">${text}</span>
                    ${active ? html`<i class="fa-solid fa-check" style="${"width: 1em;"}"></i> ` : ''}
                </span>
            </button>
    `}

    render() {
        const icon = this.theme === "light" ? "sun" : this.theme === "dark" ? "moon" : "circle-half-stroke";
        // style="--bs-dropdown-min-width: 8rem;"
        return html`
         <div class="container d-flex flex-column align-items-center ">
            ${this.renderColorModeItem("Light", "sun", "light")}
            ${this.renderColorModeItem("Dark", "moon", "dark")}
            ${this.renderColorModeItem("Auto", "circle-half-stroke", "auto")}
        </div>
        `
    }
}
customElements.define("color-mode-toggler", ColorModeToggler);



// export class ColorModeToggler extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.theme = getPreferredTheme();
//     }

//     /** @param {import('../../services/themeSwitcher.js').ThemeColors} theme */
//     setCurrentTheme(theme) {
//         this.theme = theme;
//         setStoredTheme(theme);
//         setTheme(theme);
//         super.requestUpdate();
//     }

//     /**
//      * @param {string} text 
//      * @param {string} icon 
//      * @param {import('../../services/themeSwitcher.js').ThemeColors} theme
//      */
//     renderDropdownItem = (text, icon, theme) => {
//         const active = this.theme === theme;
//         return html`
//         <li>
//             <button
//                 @click=${() => {this.setCurrentTheme(theme)}}
//                 type="button"
//                 class="dropdown-item d-inline-flex align-items-center ${active ? 'active' : ''}"
//                 data-bs-theme-value="light"
//                 aria-pressed="${active ? 'true' : 'false'}"
//             >
//                 <i class="fa-solid fa-fw fa-${icon} me-1"></i>
//                 <span class="me-1">${text}</span>
//                 ${active ? html`<i class="fa-solid fa-check"></i> ` : ''}
//             </button>
//         </li>
//     `}

//     render() {
//         const icon = this.theme === "light" ? "sun" : this.theme === "dark" ? "moon" : "circle-half-stroke";
//         // style="--bs-dropdown-min-width: 8rem;"
//         return html`
//          <div class="d-flex align-items-center dropdown color-modes">
//             <button class="btn btn-link px-0 text-decoration-none dropdown-toggle d-flex align-items-center"
//                     type="button"
//                     aria-expanded="false"
//                     data-bs-toggle="dropdown"
//                     data-bs-display="static">
//                 <i class="fa-solid fa-${icon}"></i>
//                 <span class="ms-2" id="bd-theme-text">Toggle theme</span>
//             </button>
//             <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="bd-theme" >
//                 ${this.renderDropdownItem("Light", "sun", "light")}
//                 ${this.renderDropdownItem("Dark", "moon", "dark")}
//                 ${this.renderDropdownItem("Auto", "circle-half-stroke", "auto")}
//             </ul>
//         </div>
//         `
//     }
// }
// customElements.define("color-mode-toggler", ColorModeToggler);
