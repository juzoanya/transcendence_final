import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { fetcher, sessionService, userAPI } from '../../services/api/API.js';
import router from '../../services/router.js';

/**
 * @typedef {'login' | 'register' | 'logout' | 'pwforgot' | 'oauth-failure'} LoginRouteParamTypes
 */

/**
 * @typedef {object} LoginRouteType
 * @property {LoginRouteParamTypes} type
 * @property {string} title
 * @property {(link: string, showSpinner: boolean) => TemplateAsLiteral} func
 * @property {string} link
 */


/**
 * @typedef {object} InputType
 * @property {string} type
 * @property {string} id
 * @property {string} label
 * @property {string} placeholder
 * @property {string} name
 * @property {string} autocomplete
 */

const inputTypes = {
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
        name: 'confirmPassword',
        autocomplete: 'new-password',
    },
    curr_password: {
        type: 'password',
        id: 'password-curr-i',
        label: 'Current Password',
        placeholder: 'Enter your current password',
        name: 'currentPassword',
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
    first_name: {
        type: 'text',
        id: 'first_name-i',
        label: 'First Name',
        placeholder: 'Enter your first Name',
        name: 'firstName',
        autocomplete: 'given-name',
    },
    last_name: {
        type: 'text',
        id: 'last_name-i',
        label: 'Last Name',
        placeholder: 'Enter your last Name',
        name: 'lastName',
        autocomplete: 'family-name',
    },
};

export default class LoginRegisterRoute extends BaseElement {
    constructor() {
        super(false, false);
        // this.#currRoute = window.location.pathname;
        this.showSpinner = false;
        this.errorMessage = undefined;

        /** @type {LoginRouteType[]} */
        this.routes = [
        {
            type: 'login',
            title: 'Welcome Back!',
            func: this.showLogin,
            link: '/auth/register',
        },
        {
            type: 'register',
            title: 'Register to awesome Pong',
            func: this.showRegister,
            link: '/auth/login',
        },
        {
            type: 'pwforgot',
            title: 'Reset your Password',
            func: this.showPwForgot,
            link: '',
        },
    ]
        /** @type {LoginRouteType | null} */
        this.currRoute = this.routes[0];
    }

    

    /** @param {LoginRouteParamTypes} route  */
    matchRoute(route, authroute, auth_error) {
        console.log('match: ', route);
        const slice = route.slice(0, 20);
        console.log('slice: ', slice);
        
        if (slice === '/auth/oauth-failure/') {
            if (auth_error === 'no-access-token') {
                document.dispatchEvent(new ToastNotificationErrorEvent('no authorization provided from 42'));
            } else if (auth_error === 'username-in-use') {
                document.dispatchEvent(new ToastNotificationErrorEvent('your intra username is already used'));
            } else if (auth_error === 'email-in-use') {
                document.dispatchEvent(new ToastNotificationErrorEvent('your intra email is already used'));
            }
            return router.redirect("/auth/login");
        }
        
        if (authroute === 'logout') {
            if (sessionService.isLoggedIn) {
                sessionService.logout().then(() => {
                    return router.redirect('/');
                });
            }
        } else if (typeof route === 'string') {
            const val = this.routes.find(r => r.type === authroute)
            console.log('loginroute val: ', val);
            if (val) {
                this.currRoute = val;
            } else {
                this.currRoute = null;
                return router.redirect('/');
            }
        } else {
            return router.redirect('/');
        }
    }

    onBeforeMount(route, param, url) {
        // // this.#currRoute = window.location.pathname;
        // console.log('onbeforemount, param: ', param);
        
        // console.log('on before Mount, route: ', route);
       
        // if (window.location.pathname === '/logout') return router.redirect('/');
        // return undefined;
        return this.matchRoute(route, param.authroute, param.auth_error);
    }
    
    onRouteChange(route, param) {
        // console.log('onroutechange, param: ', param);
        // // this.#currRoute = route;
        if (this.matchRoute(route, param.authroute, param.auth_error) === undefined) {
            super.requestUpdate();
        }
    }

    toggleErrorMessage(errorMessage) {
        if (errorMessage) {
            this.showSpinner = false;
            this.errorMessage = errorMessage;
        } else {
            this.errorMessage = undefined;
        }
        super.requestUpdate();
    }

    /** @param {FormData} formData  */
    async handleRegister(formData) {
        this.showSpinner = true;
        super.requestUpdate();

        const errorMessage = await sessionService.registerAndLogin(
            formData.get('username'),
            formData.get('email'),
            formData.get('password'),
            formData.get('confirmPassword'),
        );
        if (errorMessage != null) {
            this.toggleErrorMessage(errorMessage);
        } else {
            router.redirect('/');
        }
        // console.log('login : login data received: ', loginData);
        
        // try {
        //     this.showSpinner = true;
        //     super.requestUpdate();
        //     /** @type {APITypes.ApiResponse<APITypes.LoginData> | APITypes.ApiResponse<null> | null} */
        //     // console.log("credentials: ", formData.get("username"), formData.get("currentPassword"))
        //     const data = await sessionService.registerAndLogin(
        //         formData.get('username'),
        //         formData.get('email'),
        //         formData.get('password'),
        //         formData.get('confirmPassword'),
        //     );
        //     // console.log('login : login data received: ', loginData);
        //     if (data && data.success) {
        //         router.redirect('/');
        //     } else if (data) {
        //         this.toggleErrorMessage(data.message);
        //     }
        // } catch (error) {
        //     this.toggleErrorMessage('error register');
        // }
    }

    /** @param {FormData} formData  */
    async handleLogin(formData) {
        this.showSpinner = true;
        super.requestUpdate();
        await this.updateComplete;
        const errorMessage = await sessionService.login(
            formData.get('username'),
            formData.get('currentPassword'),
        );
        if (errorMessage != null) {
            this.toggleErrorMessage(errorMessage);
        } else {
            router.redirect('/');
        }
        
        // try {
        //     this.showSpinner = true;
        //     super.requestUpdate();
        //     /** @type {APITypes.ApiResponse<APITypes.LoginData> | null} */

        //     // console.log(
        //     //     'credentials: ',
        //     //     formData.get('username'),
        //     //     formData.get('currentPassword'),
        //     // );
        //     const loginData = await sessionService.login(
        //         formData.get('username')?.toString(),
        //         formData.get('currentPassword')?.toString(),
        //     );
        //     // console.log('login : login data received: ', loginData);
        //     if (loginData && loginData.success) {
        //         router.redirect('/');
        //     } else if (loginData) {
        //         this.toggleErrorMessage(loginData.message);
        //     }
        // } catch (error) {
        //     // console.log("login error: ", error);
        //     // console.log("login error name: ", error.name);
        //     // console.log("login error stack: ", error.stack);
        //     this.toggleErrorMessage('error login');
        // }
    }

    async onSubmit(e) {
        console.log('submitted');
        e.preventDefault();
        
        if (e instanceof SubmitEvent && e.currentTarget instanceof HTMLFormElement && !e.currentTarget.reportValidity()) {
            return;
        }

        // const path = window.location.pathname;
        const formData = new FormData(e.target);
        // formData.forEach((val, key) => {
        //     // console.log('submit: formdata: ', key, ': ', val);
        // });
        if (this.currRoute?.type === 'register') {
            this.handleRegister(formData);
        } else if (this.currRoute?.type === 'login') {
            this.handleLogin(formData);
        }
    }

    matchEmail = (s) => s.toLowerCase().match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
    matchUsername = (s) => s.match(
      /^[0-9A-Za-z\-]{6,16}$/
    );

    /** @param {Event} e  */
    onInputChange(e) {
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.id === inputTypes.email.id) {
            if (!this.matchEmail(e.currentTarget.value)) {
                e.currentTarget.setCustomValidity('Invalid Email format');
            } else {
                e.currentTarget.setCustomValidity('');
            }
        } else if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.id === inputTypes.username.id) {
            if (!this.matchUsername(e.currentTarget.value)) {
                e.currentTarget.setCustomValidity('Username has to be between 6 - 16 characters and contain only letters, numbers or a dash');
            } else {
                e.currentTarget.setCustomValidity('');
            }
        } else {
            const pw = this.querySelector(`#${inputTypes.new_password.id}`);
            const confPw = this.querySelector(`#${inputTypes.confirm_password.id}`);
            
            if (
                pw instanceof HTMLInputElement &&
                confPw instanceof HTMLInputElement
            ) {
                if (pw.value !== confPw.value) {
                    confPw.setCustomValidity('Passwords do not match');
                } else {
                    confPw.setCustomValidity('');
                }
            }
        }
    }

    static showButton = (showSpinner, regText, spinnerText) => {
        return html`
            <button
                class="w-100 mb-2 mt-4 btn btn-lg rounded-3 btn-dark"
                type="submit"
                ?disabled=${showSpinner}
            >
                ${showSpinner ?
                    html`
                        <span
                            class="spinner-border spinner-border-sm"
                            aria-hidden="true"
                        ></span>
                        <span role="status">${spinnerText}</span>
                    `
                :   regText}
            </button>
        `;
    };

    /**
     * @param {InputType} inputType
     * @param {boolean} autofocus
     * @param {boolean} required
     * @param {(ev: Event) => void} [onInput]
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    static renderInput = (inputType, autofocus, required, onInput) => {
        let inpt;
        let btn;
        const getPwIcon = (ic) =>
            /* html */ `<i class="fa-solid fa-fw fa-${ic}"></i>`;
        const togglePw = () => {
            if (
                btn &&
                btn instanceof HTMLButtonElement &&
                inpt &&
                inpt.type === 'text'
            ) {
                inpt.type = 'password';
                btn.innerHTML = getPwIcon('eye');
            } else if (btn && inpt && inpt.type === 'password') {
                inpt.type = 'text';
                btn.innerHTML = getPwIcon('eye-slash');
            }
        };

        return html`
            <section class="input-group mb-3">
                <div class="form-floating">
                    <input
                        class="form-control"
                        @input=${onInput}
                        ${(e) => {
                            inpt = e;
                        }}
                        type="${inputType.type}"
                        id="${inputType.id}"
                        placeholder="${inputType.placeholder}"
                        name="${inputType.name}"
                        ?autofocus="${autofocus}"
                        autocomplete="${inputType.autocomplete}"
                        ?required="${required}"
                    />
                    <label for="${inputType.id}">
                        ${inputType.label}
                        ${required ?
                            html`<span class="text-danger">*</span>`
                        :   ''}
                    </label>
                </div>

                ${inputType.type !== 'password' ?
                    ''
                :   html` <button
                        tabindex="-1"
                        ${(e) => {
                            btn = e;
                        }}
                        class="input-group-text text-body-secondary"
                        type="button"
                        @click=${togglePw}
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>`}
            </section>
        `;
    };

    showPwForgot = (link, showSpinner) => html`
        ${LoginRegisterRoute.renderInput(inputTypes.email, true, true)}
        ${LoginRegisterRoute.showButton(showSpinner, 'Reset', 'resetting...')}
    `;

    showLogin = (link, showSpinner) => html`
        ${LoginRegisterRoute.renderInput(inputTypes.username, true, true)}
        ${LoginRegisterRoute.renderInput(inputTypes.curr_password, false, true)}
        <small class="text-body-secondary"
            >Don't have an Account?
            <a id="login-to-pw-forgotten" href="${link}"> Register here</a>
        </small>
        ${LoginRegisterRoute.showButton(
            showSpinner,
            'Sign-in',
            'signing-in...',
        )}
        ${this.render42Login()}
    `

    render42Login = () => html`
        <bs-button ._async_handler=${async () => {
                /** @type {APITypes.ApiResponse<APITypes.Intra42Data>} */
                const data = await userAPI.auth42();
                console.log('login with 42 - data: ', data);
                
                if (data.success) {
                    if (data.data.redirect) {
                        window.location.href = data.data.redirect_url;
                        console.log('redirect to: ', data.data.redirect_url);
                    } else {
                        document.dispatchEvent(new ToastNotificationErrorEvent('no redirect provided'));
                    }
                } else {
                    document.dispatchEvent(new ToastNotificationErrorEvent(data.message));
                }
            }}
        
            stretch
            text="Login with 42"
        ></bs-button>
    `

    showRegister = (link, showSpinner) => html`
        ${LoginRegisterRoute.renderInput(inputTypes.username, true, true, this.onInputChange.bind(this))}
        ${LoginRegisterRoute.renderInput(inputTypes.email, false, true, this.onInputChange.bind(this))}
        ${LoginRegisterRoute.renderInput(
            inputTypes.new_password,
            false,
            true,
            this.onInputChange.bind(this),
        )}
        ${LoginRegisterRoute.renderInput(
            inputTypes.confirm_password,
            false,
            true,
            this.onInputChange.bind(this),
        )}
        
        ${LoginRegisterRoute.showButton(
            showSpinner,
            'Sign-Up',
            'signing-up...',
        )}
        ${this.render42Login()}
        <small id="singnup-disclaimer" class="text-body-secondary">
            By clicking Sign up, you agree to the terms of use.
        </small>
        <div class="mt-4">
            <small class="text-body-secondary">
                Already have an Account?
                <a id="login-to-other-site" href="${link}">sign-in</a>
            </small>
        </div>
        
    `;

    

    render() {
    
        
        return html`
            <pong-bg></pong-bg>
            <div class="modal d-block" tabindex="-1">
                ${html`
                    <div
                        class="modal-dialog modal-dialog-centered"
                        role="document"
                    >
                        <div class="modal-content">
                            <div
                                class="modal-header p-0 m-4 mb-0 d-flex flex-column align-items-end border-bottom border-dark border-3"
                            >
                                <a
                                    class="align-self-start pb-4 link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                    href="/"
                                >
                                    <i class="fa-solid fa-arrow-left"></i>
                                    <span>Back to home</span>
                                </a>
                                <div
                                    class="align-self-stretch d-flex justify-content-center"
                                >
                                    <h1 class="fw-bold mb-2 flex-shrink-1">
                                        ${this.currRoute?.title}
                                    </h1>
                                </div>
                            </div>
                            <div class="modal-body p-0 mt-2 mb-5 mx-5 text-center">
                                ${this.errorMessage ?
                                    html`
                                        <div
                                            class="alert alert-danger alert-dismissible"
                                            role="alert"
                                        >
                                            <div>${this.errorMessage}</div>
                                            <button
                                                @click=${() => {
                                                    this.toggleErrorMessage(
                                                        undefined,
                                                    );
                                                }}
                                                type="button"
                                                class="btn-close"
                                                data-bs-dismiss="alert"
                                                aria-label="Close"
                                            ></button>
                                        </div>
                                    `
                                :   ''}
                                <form
                                    @submit=${this.onSubmit.bind(this)}
                                    action=""
                                    class="needs-validation"
                                >
                                    ${this.currRoute?.func(this.currRoute?.link, this.showSpinner)}
                                </form>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
}
window.customElements.define('login-register-route', LoginRegisterRoute);

// /**
//  * @typedef {object} InputType
//  * @property {string} type
//  * @property {string} id
//  * @property {string} label
//  * @property {string} placeholder
//  * @property {string} name
//  * @property {string} autocomplete
//  */

// const inputTypes = {
//     email: {
//         type: 'email',
//         id: 'email-i',
//         label: 'E-Mail',
//         placeholder: 'Enter your E-Mail Address',
//         name: 'email',
//         autocomplete: 'email',
//     },
//     new_password: {
//         type: 'password',
//         id: 'password-new-i',
//         label: 'New Password',
//         placeholder: 'Enter your new password',
//         name: 'password',
//         autocomplete: 'new-password',
//     },
//     confirm_password: {
//         type: 'password',
//         id: 'password-confirm-i',
//         label: 'Confirm new Password',
//         placeholder: 'Confirm your new password',
//         name: 'confirmPassword',
//         autocomplete: 'new-password',
//     },
//     curr_password: {
//         type: 'password',
//         id: 'password-curr-i',
//         label: 'Current Password',
//         placeholder: 'Enter your current password',
//         name: 'currentPassword',
//         autocomplete: 'current-password',
//     },
//     username: {
//         type: 'text',
//         id: 'username-i',
//         label: 'Username',
//         placeholder: 'Enter your Username',
//         name: 'username',
//         autocomplete: 'username',
//     },
//     first_name: {
//         type: 'text',
//         id: 'first_name-i',
//         label: 'First Name',
//         placeholder: 'Enter your first Name',
//         name: 'firstName',
//         autocomplete: 'given-name',
//     },
//     last_name: {
//         type: 'text',
//         id: 'last_name-i',
//         label: 'Last Name',
//         placeholder: 'Enter your last Name',
//         name: 'lastName',
//         autocomplete: 'family-name',
//     },
// };

// export default class LoginRegisterRoute extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.#currRoute = window.location.pathname;
//         this.showSpinner = false;
//         this.errorMessage = undefined;
//     }

//     #currRoute;

//     async onBeforeMount() {
//         this.#currRoute = window.location.pathname;
//         // console.log('on before Mount, router: ', router);
//         if (sessionService.isLoggedIn) {
//             if (window.location.pathname === '/logout')
//                 await sessionService.logout();
//             return router.redirect('/');
//         }
//         if (window.location.pathname === '/logout') return router.redirect('/');
//         return undefined;
//     }

//     onRouteChange(route) {
//         this.#currRoute = route;
//         super.requestUpdate();
//     }

//     toggleErrorMessage(errorMessage) {
//         if (errorMessage) {
//             this.showSpinner = false;
//             this.errorMessage = errorMessage;
//         } else {
//             this.errorMessage = undefined;
//         }
//         super.requestUpdate();
//     }

//     /** @param {FormData} formData  */
//     async handleRegister(formData) {
//         try {
//             this.showSpinner = true;
//             super.requestUpdate();
//             /** @type {APITypes.ApiResponse<APITypes.LoginData> | APITypes.ApiResponse<null> | null} */
//             // console.log("credentials: ", formData.get("username"), formData.get("currentPassword"))
//             const data = await sessionService.registerAndLogin(
//                 formData.get('username'),
//                 formData.get('email'),
//                 formData.get('password'),
//                 formData.get('confirmPassword'),
//             );
//             // console.log('login : login data received: ', loginData);
//             if (data && data.success) router.redirect('/');
//             else if (data) this.toggleErrorMessage(data.message);
//         } catch (error) {
//             this.toggleErrorMessage('error register');
//         }
//     }

//     /** @param {FormData} formData  */
//     async handleLogin(formData) {
//         try {
//             this.showSpinner = true;
//             super.requestUpdate();
//             /** @type {APITypes.ApiResponse<APITypes.LoginData> | null} */

//             // console.log(
//             //     'credentials: ',
//             //     formData.get('username'),
//             //     formData.get('currentPassword'),
//             // );
//             const loginData = await sessionService.login(
//                 formData.get('username')?.toString(),
//                 formData.get('currentPassword')?.toString(),
//             );
//             // console.log('login : login data received: ', loginData);
//             if (loginData && loginData.success) router.redirect('/');
//             else if (loginData) this.toggleErrorMessage(loginData.message);
//         } catch (error) {
//             // console.log("login error: ", error);
//             // console.log("login error name: ", error.name);
//             // console.log("login error stack: ", error.stack);
//             this.toggleErrorMessage('error login');
//         }
//     }

//     async onSubmit(e) {
//         // console.log('submitted');
//         e.preventDefault();
//         const path = window.location.pathname;
//         const formData = new FormData(e.target);
//         // formData.forEach((val, key) => {
//         //     // console.log('submit: formdata: ', key, ': ', val);
//         // });
//         if (path === '/register') {
//             this.handleRegister(formData);
//         } else if (path === '/login') {
//             this.handleLogin(formData);
//         }
//     }

//     onInputChange() {
//         const pw = this.shadowRoot?.getElementById(inputTypes.new_password.id);
//         const confPw = this.shadowRoot?.getElementById(
//             inputTypes.confirm_password.id,
//         );
//         if (
//             pw instanceof HTMLInputElement &&
//             confPw instanceof HTMLInputElement
//         ) {
//             if (pw.value !== confPw.value)
//                 confPw.setCustomValidity('Passwords do not match');
//             else confPw.setCustomValidity('');
//             // console.log('j');
//         }
//     }

//     static showButton = (showSpinner, regText, spinnerText) => {
//         return html`
//             <button
//                 class="w-100 mb-2 mt-4 btn btn-lg rounded-3 btn-dark"
//                 type="submit"
//                 ?disabled=${showSpinner}
//             >
//                 ${showSpinner ?
//                     html`
//                         <span
//                             class="spinner-border spinner-border-sm"
//                             aria-hidden="true"
//                         ></span>
//                         <span role="status">${spinnerText}</span>
//                     `
//                 :   regText}
//             </button>
//         `;
//     };

//     /**
//      * @param {InputType} inputType
//      * @param {boolean} autofocus
//      * @param {boolean} required
//      * @param {(ev: Event) => void} [onInput]
//      * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     static renderInput = (inputType, autofocus, required, onInput) => {
//         let inpt;
//         let btn;
//         const getPwIcon = (ic) =>
//             /* html */ `<i class="fa-solid fa-${ic}"></i>`;
//         const togglePw = () => {
//             if (
//                 btn &&
//                 btn instanceof HTMLButtonElement &&
//                 inpt &&
//                 inpt.type === 'text'
//             ) {
//                 inpt.type = 'password';
//                 btn.innerHTML = getPwIcon('eye');
//             } else if (btn && inpt && inpt.type === 'password') {
//                 inpt.type = 'text';
//                 btn.innerHTML = getPwIcon('eye-slash');
//             }
//         };

//         return html`
//             <section class="input-group mb-3">
//                 <div class="form-floating">
//                     <input
//                         class="form-control"
//                         @input=${onInput}
//                         ${(e) => {
//                             inpt = e;
//                         }}
//                         type="${inputType.type}"
//                         id="${inputType.id}"
//                         placeholder="${inputType.placeholder}"
//                         name="${inputType.name}"
//                         ?autofocus="${autofocus}"
//                         autocomplete="${inputType.autocomplete}"
//                         ?required="${required}"
//                     />
//                     <label for="${inputType.id}">
//                         ${inputType.label}
//                         ${required ?
//                             html`<span class="text-danger">*</span>`
//                         :   ''}
//                     </label>
//                 </div>

//                 ${inputType.type !== 'password' ?
//                     ''
//                 :   html` <button
//                         tabindex="-1"
//                         ${(e) => {
//                             btn = e;
//                         }}
//                         class="input-group-text text-body-secondary"
//                         type="button"
//                         @click=${togglePw}
//                     >
//                         <i class="fa-solid fa-eye"></i>
//                     </button>`}
//             </section>
//         `;
//     };

//     static showPwForgot = (link, showSpinner) => html`
//         ${LoginRegisterRoute.renderInput(inputTypes.email, true, true)}
//         ${LoginRegisterRoute.showButton(showSpinner, 'Reset', 'resetting...')}
//     `;

//     static showLogin = (link, showSpinner) => html`
//         ${LoginRegisterRoute.renderInput(inputTypes.username, true, true)}
//         ${LoginRegisterRoute.renderInput(inputTypes.curr_password, false, true)}
//         <small class="text-body-secondary"
//             >Forgot your password?
//             <a id="login-to-pw-forgotten" href="${link}"> click here</a>
//         </small>
//         ${LoginRegisterRoute.showButton(
//             showSpinner,
//             'Sign-in',
//             'signing-in...',
//         )}
//     `;

//     showRegister = (link, showSpinner) => html`
//         ${LoginRegisterRoute.renderInput(inputTypes.username, true, true)}
//         ${LoginRegisterRoute.renderInput(inputTypes.email, false, true)}
//         ${LoginRegisterRoute.renderInput(
//             inputTypes.new_password,
//             false,
//             true,
//             this.onInputChange.bind(this),
//         )}
//         ${LoginRegisterRoute.renderInput(
//             inputTypes.confirm_password,
//             false,
//             true,
//             this.onInputChange.bind(this),
//         )}
//         ${LoginRegisterRoute.showButton(
//             showSpinner,
//             'Sign-Up',
//             'signing-up...',
//         )}
//         <small id="singnup-disclaimer" class="text-body-secondary">
//             By clicking Sign up, you agree to the terms of use.
//         </small>
//         <div class="mt-4">
//             <small class="text-body-secondary">
//                 Already have an Account?
//                 <a id="login-to-other-site" href="${link}">sign-in</a>
//                 Already have an Account?
//                 <a id="login-to-other-site" href="${link}">sign-in</a>
//             </small>
//         </div>
//     `;

//     routes = new Map([
//         [
//             '/login',
//             {
//                 title: 'Welcome Back!',
//                 func: LoginRegisterRoute.showLogin,
//                 link: '/pwforgot',
//             },
//         ],
//         [
//             '/register',
//             {
//                 title: 'Register to awesome Pong',
//                 func: this.showRegister,
//                 link: '/login',
//             },
//         ],
//         [
//             '/pwforgot',
//             {
//                 title: 'Reset your Password',
//                 func: LoginRegisterRoute.showPwForgot,
//                 link: '',
//             },
//         ],
//     ]);

//     render() {
//         const val = this.routes.get(this.#currRoute);
//         if (!val) return null;
        
//         return html/* html */ `
//             <pong-bg></pong-bg>
//             <div class="modal d-block" tabindex="-1">
//                 ${html`
//                     <div
//                         class="modal-dialog modal-dialog-centered"
//                         role="document"
//                     >
//                         <div class="modal-content">
//                             <div
//                                 class="modal-header p-0 m-4 mb-0 d-flex flex-column align-items-end border-bottom border-dark border-3"
//                             >
//                                 <a
//                                     class="align-self-start link-dark pb-4"
//                                     href="/"
//                                 >
//                                     <i class="fa-solid fa-arrow-left"></i>
//                                     <span>Back to home</span>
//                                 </a>
//                                 <div
//                                     class="align-self-stretch d-flex justify-content-center"
//                                 >
//                                     <h1 class="fw-bold mb-2 flex-shrink-1">
//                                         ${val.title}
//                                     </h1>
//                                 </div>
//                             </div>
//                             <div class="modal-body p-0 m-5 mt-5 text-center">
//                                 ${this.errorMessage ?
//                                     html`
//                                         <div
//                                             class="alert alert-danger alert-dismissible"
//                                             role="alert"
//                                         >
//                                             <div>${this.errorMessage}</div>
//                                             <button
//                                                 @click=${() => {
//                                                     this.toggleErrorMessage(
//                                                         undefined,
//                                                     );
//                                                 }}
//                                                 type="button"
//                                                 class="btn-close"
//                                                 data-bs-dismiss="alert"
//                                                 aria-label="Close"
//                                             ></button>
//                                         </div>
//                                     `
//                                 :   ''}
//                                 <form
//                                     @submit=${this.onSubmit.bind(this)}
//                                     action=""
//                                     class="needs-validation"
//                                 >
//                                     ${val.func(val.link, this.showSpinner)}
//                                     <bs-button ._async_handler=${async () => {
//                                         const data = await fetcher.$get('/o/login');
//                                         console.log('data: ', data);
//                                     }}>Login with 42</bs-button>
//                                 </form>
//                             </div>
//                         </div>
//                     </div>
//                 `}
//             </div>
//         `;
//     }
// }
// window.customElements.define('login-register-route', LoginRegisterRoute);
