import { BaseElement, html, ifDefined } from '../../lib_templ/BaseElement';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral';




/**
 * @typedef {object} InputTypeExtra
 * @property {boolean} [autofocus]
 * @property {boolean} [floating]
 * @property {string} [name]
 * @property {boolean} [disabled]
 * @property {boolean} [required]
 * @property {number} [maxlength]
 * @property {number} [minlength]
 * @property {string} [value]
 * @property {(ev: Event) => void} [onInput]
 * @property {(value: string) => boolean} [validate]
 */

/**
 * @typedef {InputTypeExtra & {
 *      type: string,
 *      id: string,
 *      label: string,
 *      placeholder: string,
 *      name: string,
 *      autocomplete: string,
 * }} InputType
 */


/**
 * @typedef {'email' | 'new_password' | 'confirm_password' | 'curr_password' | 'username' | 'first_name' | 'last_name' | 'alias'} InputTypes
 */

let usedId = 0;
const getId = () => {
    usedId++;
    return usedId -1;
}

/** @type {{[key: string]: InputType}} */
export const inputTypes = {
    email: {
        type: 'email',
        id: 'email-i',
        label: 'E-Mail',
        placeholder: 'Enter your E-Mail Address',
        name: 'email',
        autocomplete: 'email',
    },
    new_password: {
        type: 'password',
        id: 'password-new-i',
        label: 'New Password',
        placeholder: 'Enter your new password',
        name: 'password',
        autocomplete: 'new-password',
    },
    confirm_password: {
        type: 'password',
        id: 'password-confirm-i',
        label: 'Confirm new Password',
        placeholder: 'Confirm your new password',
        name: 'confirm_password',
        autocomplete: 'new-password',
    },
    curr_password: {
        type: 'password',
        id: 'password-curr-i',
        label: 'Current Password',
        placeholder: 'Enter your current password',
        name: 'current_password',
        autocomplete: 'current-password',
    },
    username: {
        type: 'text',
        id: 'username-i',
        label: 'Username',
        placeholder: 'Enter your Username',
        name: 'username',
        autocomplete: 'username',
    },
    alias: {
        type: 'text',
        id: 'alias-i',
        label: 'Alias',
        placeholder: 'Enter your player Alias',
        name: 'alias',
        autocomplete: 'username',
    },
    first_name: {
        type: 'text',
        id: 'first_name-i',
        label: 'First Name',
        placeholder: 'Enter your first Name',
        name: 'first_name',
        autocomplete: 'given-name',
    },
    last_name: {
        type: 'text',
        id: 'last_name-i',
        label: 'Last Name',
        placeholder: 'Enter your last Name',
        name: 'last_name',
        autocomplete: 'family-name',
    },
};

/**
 * @param {InputTypes} type
 * @param {InputTypeExtra} [extr]
 * @returns {InputType}
 */
export const getInputType = (type, extr) => {
    const i = inputTypes[type];
    if (i == undefined) {
        throw new Error("getInputType: INVALID INPUT TYPE")
    }
    let inptt = {...i, id: `${type}_${getId()}`};
    if (extr != undefined) {
        inptt = {...inptt, ...extr};
    }
    return inptt
}

/**
 * @param {InputTypes} type
 * @param {InputTypeExtra} [extr]
 * @returns {TemplateAsLiteral}
 */  
export const renderInputByType = (type, extr) => {
    const t = getInputType(type, extr);
    return renderInput(t);
}




/**
 * @param {InputType} inputType
 * @returns {TemplateAsLiteral}
 */
export const renderInput = (inputType) => {
    // useState(null, null)
    let inpt;
   
    const input = html`
        <input
            class="form-control"
            @input=${inputType.onInput}
            ${(e) => { inpt = e; }}
            type="${inputType.type}"
            id="${inputType.id}"
            placeholder="${inputType.placeholder}"
            name="${inputType.name}"
            ?autofocus="${inputType.autofocus}"
            autocomplete="${inputType.autocomplete}"
            ?required="${inputType.required}"
            ?disabled="${inputType.disabled}"
            maxlength="${ifDefined(inputType.maxlength)}"
            minlength="${ifDefined(inputType.minlength)}"
            value="${ifDefined(inputType.value)}"
        />
    `

    const label = html`
        <label for="${inputType.id}">
            ${inputType.label}
            ${inputType.required ? html`<span class="text-danger">*</span>` : ''}
        </label>
    `

    let btn;
    const getPwIcon = (ic) => `<i class="fa-solid fa-fw fa-${ic}"></i>`;
    const togglePw = () => {
        if (  btn &&  btn instanceof HTMLButtonElement && inpt && inpt.type === 'text' ) {
            inpt.type = 'password';
            btn.innerHTML = getPwIcon('eye');
        } else if (btn && inpt && inpt.type === 'password') {
            inpt.type = 'text';
            btn.innerHTML = getPwIcon('eye-slash');
        }
    };

    return html` 

        ${inputType.type !== 'password' ? html`
            ${!inputType.floating ? html`
                <section class="mb-3">
                    ${label}
                    ${input}
                </section>
                ` : html`
                <section class="mb-3">
                    <div class="form-floating">
                        ${input}
                        ${label}
                    </div>
                </section>
            `}
        ` : html`
            ${!inputType.floating ? html`
                <section class="input-group mb-3">
                    ${label}
                    ${input}
                    <button
                        tabindex="-1"
                        ${(e) => { btn = e; }}
                        class="input-group-text text-body-secondary"
                        type="button"
                        @click=${togglePw}
                        >
                    <i class="fa-solid fa-fw fa-eye"></i>
                    </button>
                </section>
                ` : html`
                <section class="input-group mb-3">
                    <div class="form-floating">
                        ${input}
                        ${label}
                    </div>
                    <button
                        tabindex="-1"
                        ${(e) => { btn = e; }}
                        class="input-group-text text-body-secondary"
                        type="button"
                        @click=${togglePw}
                        >
                    <i class="fa-solid fa-fw fa-eye"></i>
                    </button>
                </section>
            `}
        
        `}
    `
}




/**
 * @param {string} text
 * @param {string} classes
 * @returns 
 */
export const renderSubmitButton = (text, classes) => {
    let showSpinner = false;
    let btn;
    const toggleSpinner = () => {
        btn.innerHTML = `
                    <span
                        class="spinner-border spinner-border-sm"
                        aria-hidden="true"
                    ></span>
                    `
        setTimeout(() => {
            btn.innerHTML = text;
        }, 10000);
    }
    return html`
            <button ${(el) => {btn=el;}}
                class="btn ${classes}"
                type="submit"
                ?disabled=${showSpinner}
            >
                ${showSpinner ? html : text}
            </button>
        `;
}


// /**
//  * @param {string} text
//  * @param {string} classes
//  * @returns 
//  */
// export const renderSubmitButton = (text, classes) => {
//     let showSpinner = false;
//     let btn;
//     const toggleSpinner = () => {
//         btn.innerHTML = `
//                     <span
//                         class="spinner-border spinner-border-sm"
//                         aria-hidden="true"
//                     ></span>
//                     `
//         setTimeout(() => {
//             btn.innerHTML = text;
//         }, 10000);
//     }
//     return html`
//             <button ${(el) => {btn=el;}}
//                 class="btn ${classes}"
//                 type="submit"
//                 ?disabled=${showSpinner}
//                 @click=${toggleSpinner}
//             >
//                 ${showSpinner ? html : text}
//             </button>
//         `;
// }



/**
 * @template T
 * @param {BaseElement} parent
 * @param {T} initialValue - The initial state value.
 * @returns {[() => T, (newValue: T) => void]} - A tuple with a state getter and a state setter.
 */
export function useState(parent, initialValue) {
    let state = initialValue;
  
    function setState(newValue) {
      state = newValue;
    // //   console.log(`State updated to: ${state}`);
      parent.requestUpdate();
    }
  
    function getState() {
      return state;
    }
    return [getState, setState];
}

