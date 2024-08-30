import { BaseElement, createRef, html, ifDefined, ref } from '../../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { SelectedNavLink } from '../../components/Navs.js';
import { isStr, sessionService, userAPI } from '../../services/api/API.js';
import { getPreferredTheme, setStoredTheme, setTheme } from '../../services/themeSwitcher.js';
import { Modal, Offcanvas } from 'bootstrap';
import { getInputType, inputTypes, renderInput, renderInputByType, renderSubmitButton } from '../auth/renderInput.js';
import { ToastNotificationErrorEvent, ToastNotificationSuccessEvent } from '../../components/bootstrap/BsToasts.js';
import router from '../../services/router.js';
import Router from '../../lib_templ/router/Router.js';
import { renderCard } from '../../components/bootstrap/BsCard.js';
import { comparePath } from '../../components/utils.js';


export class SettingsView extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);

        /** @type {import('../../components/Navs.js').NavItemConf[]} */
        this.configs = [
            {text: "Profile",       href:'/settings',               icon: "user"},
            {text: "Account",       href:'/settings/account',       icon: "gear"},
            {text: "Color Mode",    href:'/settings/color-mode',    icon: "circle-half-stroke"},
        ]
        this.confMap = {profile: this.configs[0], account: this.configs[1], game: this.configs[2], colorMode: this.configs[3]};

        /** @param {SelectedNavLink} ev */
        this.selectedHandler = (ev) => {
            this.selected = ev.navConf;
            
            if (this.isMobileWidth())
                Offcanvas.getOrCreateInstance("vertical-nav div div div.offcanvas").hide();
            else
                super.requestUpdate();
        }
        this.selected = this.configs[0];
        this.onShouldUpdate = (e) => {console.log('shouldUpdate: ', e);super.requestUpdate();}

        this.boundSubmitAvatarData = this.submitAvatarData.bind(this);
        this.boundSubmitData = this.submitData.bind(this);
        this.boundClearPasswordinput = this.clearPasswordInput.bind(this);
    }

    /** @param {{subpage: string}} x */
    selectRoute({subpage}) {
        console.log('subpage: ', subpage);
        if (subpage == undefined || subpage === 'account' || subpage === 'game' ||  subpage === 'color-mode' ||  subpage === 'notifications') {
            /** @type {'account' | 'game' | 'notifications' | 'color-mode' | undefined} */
            this.page = subpage;
        } else {
            return Router.show404;
        }
    }

     /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {symbol | void}
     */
     onBeforeMount(route, params, url) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/auth/login');
        }

        if (comparePath(url.pathname, '/settings/color-mode', false)) {
            this.configs[2].firstActive = true;
        } else if (comparePath(url.pathname, '/settings/account', false)) {
            this.configs[1].firstActive = true;
        } else {
            this.configs[0].firstActive = true;
        }

        return this.selectRoute(params);
    }

    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {symbol | void}
     */
    onRouteChange(route, params, url) {
        const res = this.selectRoute(params);
        super.requestUpdate();
        return res;
    }


    // async init() {
    //     await this.updateComplete;
        
    // }

    updated() {
        if (this.textAreaRef.value) {
            this.textAreaRef.value.value = this.sessionUser.value?.user?.bio ?? '';
        }
    }

    connectedCallback() {
        super.connectedCallback();
        console.log("all nodes: ", document.getElementsByTagName('*').length);
        // this.init();
        // this.addEventListener("selected_nav_link", this.selectedHandler);
        window.addEventListener("resize", this.onShouldUpdate);
        // this.addEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
        // this.addEventListener("hidePrevented.bs.offcanvas", (e)=>{console.log('hide prev?: ', e);});
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // this.removeEventListener("selected_nav_link", this.selectedHandler);
        window.removeEventListener("resize", this.onShouldUpdate);
        // this.removeEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
        
    }

    isMobileWidth = () => window.innerWidth <= 577;

    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLTextAreaElement>} */
    textAreaRef = createRef();
    

    /** @param {SubmitEvent} e */
    async onPasswordChangeSubmit(e) {
        e.preventDefault();
        console.log('onPasswordChangeSubmit');
        
        if (e.currentTarget instanceof HTMLFormElement && this.passwordChangeModal.value) {
            console.log('onPasswordChangeSubmit1');
            const formData = new FormData(e.currentTarget);
            const newpw = formData.get('password');
            const oldpw = formData.get('current_password')
            if (newpw && typeof newpw === 'string' && oldpw && typeof oldpw === 'string') {
                console.log('onPasswordChangeSubmit2');
                try {
                    const res = await userAPI.changePassword(newpw, oldpw);
                    if (!res.success) {
                        document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
                    } else {
                        const loginres = await sessionService.login(this.sessionUser.value?.user?.username, newpw);
                        if (isStr(loginres)) {
                            document.dispatchEvent(new ToastNotificationErrorEvent(loginres));
                        } else {
                            document.dispatchEvent(new ToastNotificationSuccessEvent(res.message));
                            Modal.getOrCreateInstance(this.passwordChangeModal.value).hide();
                            return;
                        }

                    }
                } catch (error) {
                    sessionService.handleFetchError(error);
                }
            }
        }
    }

    /** @param {string} name  */
    clearInputByName(name) {
        const elem = this.querySelectorAll(`[name="${name}"]`);
        elem.forEach((e) => {
            if (e instanceof HTMLInputElement) {
                e.value = '';
            }
        })
    }

    clearPasswordInput() {
        this.clearInputByName('password');
        this.clearInputByName('current_password');
    }
    
    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLElement>} */
    passwordChangeModal = createRef();
    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLElement>} */
    deleteAccountModal = createRef();

    
    renderChangePassword = () => html`
        <button type="button" class="btn btn-primary mt-2 w-100" data-bs-toggle="modal" data-bs-target="#passwordChangeModal">
            Change Password
        </button>

        <div @hidden.bs.modal=${this.boundClearPasswordinput} ${ref(this.passwordChangeModal)}  class="modal fade" id="passwordChangeModal" tabindex="-1" aria-labelledby="passwordChangeModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <form action="" @submit=${this.onPasswordChangeSubmit.bind(this)} >
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="passwordChangeModalLabel">Change your Password</h1>
                            <button   type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <input
                                    type="text"
                                    name="username"
                                    value="..."
                                    autocomplete="username"
                                    style="${"display: none;"}"
                                    >
                                    ${renderInputByType('curr_password', {autofocus: true, required: true, floating: true})}
                                    ${renderInputByType('new_password', {autofocus: true, required: true, floating: true})}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button   type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            ${renderSubmitButton('Change Password', 'btn-primary')}
                            <!-- <button type="submit" class="btn btn-primary" >Change Password</button> -->
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `


    /** @param {SubmitEvent} e */
    async onAccountDeleteSubmit(e) {
        console.log('onAccountDeleteSubmit');
        
        if (e && e.currentTarget instanceof HTMLFormElement && this.sessionUser.value && this.sessionUser.value.user && this.deleteAccountModal.value) {
            e.preventDefault();
            console.log('onAccountDeleteSubmit1');
            const formData = new FormData(e.currentTarget);
            const currpw = formData.get('current_password')
            if (currpw && typeof currpw === 'string') {
                console.log('onAccountDeleteSubmit2');
                try {
                    const res = await userAPI.deleteProfile(this.sessionUser.value?.user.id, currpw);
                    if (!res.success) {
                        document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
                    } else {
                        console.log('was das');
                        
                        document.dispatchEvent(new ToastNotificationSuccessEvent(res.message));
                        Modal.getOrCreateInstance(this.deleteAccountModal.value).hide();
                        await sessionService.clearSession();
                        router.redirect("/");
                    }
                } catch (error) {
                    sessionService.handleFetchError(error);
                }
            }
        } else if (this.sessionUser.value && this.sessionUser.value.user && this.deleteAccountModal.value) {
            try {
                const res = await userAPI.deleteProfile(this.sessionUser.value?.user.id,'');
                if (!res.success) {
                    document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
                } else {
                        document.dispatchEvent(new ToastNotificationSuccessEvent(res.message));
                        Modal.getOrCreateInstance(this.deleteAccountModal.value).hide();
                        await sessionService.clearSession();
                        router.redirect("/");
                }
            } catch (error) {
                sessionService.handleFetchError(error);
            }
        }
    }
    
    renderModalConfirmDelete = () => html`
        <div @hidden.bs.modal=${this.boundClearPasswordinput} ${ref(this.deleteAccountModal)} class="modal fade" id="deleteProfileModalConfirm" aria-hidden="true" aria-labelledby="deleteProfileModalConfirmLabel" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <form  action="" @submit=${this.onAccountDeleteSubmit.bind(this)} >
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="deleteProfileModalConfirmLabel">Delete Account: Confirm</h1>
                            <button   type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="fs-6 text-danger">Please enter your current password to confirm the deletion</p>
                            <input
                                type="text"
                                name="username"
                                value="..."
                                autocomplete="username"
                                style="${"display: none;"}"
                                >
                                ${renderInputByType('curr_password', {autofocus: true, required: true, floating: true})}
                        </div>
                        <div class="modal-footer">
                            <button   type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            ${renderSubmitButton('DELETE', 'btn-danger')}
                            <!-- <button type="submit" class="btn btn-danger" >DELETE</button> -->
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `

    renderModalConfirmDeleteOauth = () => html`
    <div ${ref(this.deleteAccountModal)} class="modal fade" id="deleteProfileModalConfirm" aria-hidden="true" aria-labelledby="deleteProfileModalConfirmLabel" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="deleteProfileModalConfirmLabel">Delete Account: Confirm</h1>
                            <button   type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="fs-6 text-danger">Please confirm the deletion of your Account</p>
                        </div>
                        <div class="modal-footer">
                            <button   type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <bs-button
                                ._async_handler=${this.onAccountDeleteSubmit.bind(this)}
                                color="danger"
                                text="DELETE"
                            ></bs-button>
                        </div>
                </div>
            </div>
        </div>
    `

    renderDeleteProfile = () => html`
        <div class="modal fade" id="deleteProfileModal" aria-hidden="true" aria-labelledby="deleteProfileModalLabel" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h1 class="modal-title fs-5" id="deleteProfileModalLabel">Delete Your Account</h1>
                        <button   type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        By clicking delete we will delete your Account from our System and every Information associated with it.
                    </div>
                    <div class="modal-footer">
                        <button   type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" data-bs-target="#deleteProfileModalConfirm" data-bs-toggle="modal">Delete Account</button>
                    </div>
                </div>
            </div>
        </div>
        ${this.sessionUser.value?.user?.oauth === '42api' ? this.renderModalConfirmDeleteOauth() : this.renderModalConfirmDelete()}
        <button class="btn btn-danger mt-2 w-100" data-bs-target="#deleteProfileModal" data-bs-toggle="modal">Delete your Account</button>
    `



    /** @param {SubmitEvent} e  */
    submitData(e) {
        e.preventDefault();
        
        if (e.currentTarget instanceof HTMLFormElement) {
            const formData = new FormData(e.currentTarget);
            console.log('this.textAreaRef.value?.value.trim(): ', this.textAreaRef.value?.value.trim());
            
            formData.set('bio', this.textAreaRef.value?.value.trim() ?? '');
            console.log('get bio: ', formData.get('bio'));
            
            sessionService.updateUserData(formData).then(() => {
                super.requestUpdate();
            });
        }
    }

    /** @param {Blob} data  */
    submitAvatarData(data) {
        console.log('hallo image: ', data);

        const fd = new FormData();
        fd.append('avatar', data)
        const res = sessionService.updateUserData(fd).then(() => {
            super.requestUpdate();
        })
    }

    renderChangeAvatar = () => html`
        <div class="d-flex align-items-end mb-4">
            <div class="me-4">
                <avatar-component
                    radius="5"
                    src="${ifDefined(this.sessionUser.value?.user?.avatar)}"
                    size="150"
                ></avatar-component>
            </div>
            <file-button .on_image_data=${this.boundSubmitAvatarData} text="change your avatar" icon="pencil" ></file-button>
        </div>
    `

    renderForm = (content) => html`
        <form action="" @submit=${this.boundSubmitData} class="needs-validation">
                ${content}
                ${renderSubmitButton('Save', 'btn-primary')}
        </form>
    `

    renderAccountInfo = () => this.renderContainer('Update your account data', html`
        <div class="my-3">
            ${this.renderChangePassword()}
            ${this.renderDeleteProfile()}
        </div>
        ${this.renderForm(html`
            ${renderInputByType('username', {value: this.sessionUser.value?.user?.username, disabled: true}) }
            ${renderInputByType('email', {value: this.sessionUser.value?.user?.email, disabled: true}) }
            ${renderInputByType('first_name', {value: this.sessionUser.value?.user?.first_name, maxlength: 30}) }
            ${renderInputByType('last_name', {value: this.sessionUser.value?.user?.last_name, maxlength: 30}) }    
        `)}
    `)
    


    /** @param {string} title */
    renderContainer = (title, content) => html`
        <div class="container-fluid p-3">
            ${renderCard(title, '', content)}
        </div>
    `

    renderChangeProfile = () => this.renderContainer('Update your Profile', html`
        ${this.renderChangeAvatar()}
        
        ${this.renderForm(html`
            ${renderInputByType('alias', {value: this.sessionUser.value?.user?.alias, maxlength: 30}) }
                <div class="mb-3">
                    <label for="profile-edit-about">Bio</label>
                    <textarea
                        maxlength="255"
                        class="form-control"
                        style="${"height: 7em; max-height: 10em;"}"
                        ${ref(this.textAreaRef)}
                        
                        placeholder="Leave a comment here"
                        id="profile-edit-about"
                    >
                    </textarea>
            </div>
        `)}    
    `)



    renderColorModeToggler = () => this.renderContainer('Change the color mode', html`
        <color-mode-toggler></color-mode-toggler>
    `)

    render() {
        
        console.log('render settings view, selected: ', this.selected);
        let content;
        if (this.page === undefined) {
            content = this.renderChangeProfile();
        } else if (this.page === 'account') {
            content = this.renderAccountInfo();
        } else if (this.page === 'color-mode') {
            content = this.renderColorModeToggler();
        }


      

        return html`
            ${this.isMobileWidth() ? html`
                <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs}></vertical-nav>
                ${content}
            ` : html`
                    <div class="pong-navigation-vertical bg-light-subtle">
                        <div class="settings-navbar">
                            <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs}></vertical-nav>
                        </div>
                    </div>
                    <div class="settings-container">
                        ${content}
                    </div>
            `}
    `;
    }
}
window.customElements.define('settings-view', SettingsView);



// export class SettingsView extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);

//         this.configs = [
//             {text: "Profile", icon: "user", firstActive: true},
//             {text: "Account", icon: "gear"},
//             {text: "Game", icon: "gamepad"},
//             {text: "Color Mode", icon: "circle-half-stroke"},
//             {text: "Notification", icon: "bell"},
//         ]
//         this.confMap = {profile: this.configs[0], account: this.configs[1], game: this.configs[2], colorMode: this.configs[3]};

//         /** @param {SelectedNavLink} ev */
//         this.selectedHandler = (ev) => {
//             this.selected = ev.navConf;
            
//             if (this.isMobileWidth())
//                 Offcanvas.getOrCreateInstance("vertical-nav div div div.offcanvas").hide();
//             else
//                 super.requestUpdate();
//         }
//         this.selected = this.configs[0];
//         this.onShouldUpdate = (e) => {console.log('shouldUpdate: ', e);super.requestUpdate();}
//     }

//      /**
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      * @returns {symbol | void}
//      */
//      onBeforeMount(route, params, url) {
//         // console.log("onBeforeMount");
//         if (!sessionService.isLoggedIn) {
//             return router.redirect('/');
//         }
//         const jo = 1;
//         const b = !!jo;
//     }


//     async init() {
//         await this.updateComplete;
//         if (this.textAreaRef.value) {
//             this.textAreaRef.value.value = this.sessionUser.value?.user?.bio ?? '';
//         }
//     }

//     connectedCallback() {
//         super.connectedCallback();
//         this.init();
//         this.addEventListener("selected_nav_link", this.selectedHandler);
//         window.addEventListener("resize", this.onShouldUpdate);
//         this.addEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
//         // this.addEventListener("hidePrevented.bs.offcanvas", (e)=>{console.log('hide prev?: ', e);});
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.removeEventListener("selected_nav_link", this.selectedHandler);
//         window.removeEventListener("resize", this.onShouldUpdate);
//         this.removeEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
        
//     }

//     isMobileWidth = () => window.innerWidth <= 800;

//     /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLTextAreaElement>} */
//     textAreaRef = createRef();
    

//     /** @param {SubmitEvent} e */
//     async onPasswordChangeSubmit(e) {
//         e.preventDefault();
//         console.log('onPasswordChangeSubmit');
        
//         if (e.currentTarget instanceof HTMLFormElement && this.passwordChangeModal.value) {
//             console.log('onPasswordChangeSubmit1');
//             const formData = new FormData(e.currentTarget);
//             const newpw = formData.get('password');
//             const oldpw = formData.get('currentPassword')
//             if (newpw && typeof newpw === 'string' && oldpw && typeof oldpw === 'string') {
//                 console.log('onPasswordChangeSubmit2');
//                 try {
//                     const res = await userAPI.changePassword(newpw, oldpw);
//                     if (!res.success) {
//                         document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
//                     } else {
//                         const loginres = await sessionService.login(this.sessionUser.value?.user?.username, newpw);
//                         if (!loginres || !loginres.success) {
//                             document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
//                         } else {
//                             document.dispatchEvent(new ToastNotificationSuccessEvent(res.message));
//                             Modal.getOrCreateInstance(this.passwordChangeModal.value).hide();
//                         }
//                     }
//                 } catch (error) {
//                     sessionService.handleFetchError(error);
//                 }
//             }
//         }
//     }
    
//     /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLElement>} */
//     passwordChangeModal = createRef();
//     /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLElement>} */
//     deleteAccountModal = createRef();

    
//     renderChangePassword = () => html`
//         <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#passwordChangeModal">
//             Change Password
//         </button>

//         <div ${ref(this.passwordChangeModal)}  class="modal fade" id="passwordChangeModal" tabindex="-1" aria-labelledby="passwordChangeModalLabel" aria-hidden="true">
//             <div class="modal-dialog modal-dialog-centered">
//                 <div class="modal-content">
//                     <form action="" @submit=${this.onPasswordChangeSubmit.bind(this)} >
//                         <div class="modal-header">
//                             <h1 class="modal-title fs-5" id="passwordChangeModalLabel">Change your Password</h1>
//                             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                         </div>
//                         <div class="modal-body">
//                             <div class="row">
//                                 <input
//                                     type="text"
//                                     name="username"
//                                     value="..."
//                                     autocomplete="username"
//                                     style="${"display: none;"}"
//                                     >
//                                 ${renderInput(inputTypes.curr_password, true, true)}
//                                 ${renderInput(inputTypes.new_password, true, true)}
//                             </div>
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                             ${renderSubmitButton('Change Password', 'btn-primary')}
//                             <!-- <button type="submit" class="btn btn-primary" >Change Password</button> -->
//                         </div>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     `


//     /** @param {SubmitEvent} e */
//     async onAccountDeleteSubmit(e) {
//         console.log('onAccountDeleteSubmit');
        
//         if (e && e.currentTarget instanceof HTMLFormElement && this.sessionUser.value && this.sessionUser.value.user && this.deleteAccountModal.value) {
//             e.preventDefault();
//             console.log('onAccountDeleteSubmit1');
//             const formData = new FormData(e.currentTarget);
//             const currpw = formData.get('currentPassword')
//             if (currpw && typeof currpw === 'string') {
//                 console.log('onAccountDeleteSubmit2');
//                 try {
//                     const res = await userAPI.deleteProfile(this.sessionUser.value?.user.id, currpw);
//                     if (!res.success) {
//                         document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
//                     } else {
//                             document.dispatchEvent(new ToastNotificationSuccessEvent(res.message));
//                             Modal.getOrCreateInstance(this.deleteAccountModal.value).hide();
//                             await sessionService.logout(true);
//                             router.redirect("/");
//                     }
//                 } catch (error) {
//                     sessionService.handleFetchError(error);
//                 }
//             }
//         } else if (this.sessionUser.value && this.sessionUser.value.user && this.deleteAccountModal.value) {
//             try {
//                 const res = await userAPI.deleteProfile(this.sessionUser.value?.user.id,'');
//                 if (!res.success) {
//                     document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
//                 } else {
//                         document.dispatchEvent(new ToastNotificationSuccessEvent(res.message));
//                         Modal.getOrCreateInstance(this.deleteAccountModal.value).hide();
//                         await sessionService.logout(true);
//                         router.redirect("/");
//                 }
//             } catch (error) {
//                 sessionService.handleFetchError(error);
//             }
//         }
//     }
    
//     renderModalConfirmDelete = () => html`
//         <div ${ref(this.deleteAccountModal)} class="modal fade" id="deleteProfileModalConfirm" aria-hidden="true" aria-labelledby="deleteProfileModalConfirmLabel" tabindex="-1">
//             <div class="modal-dialog modal-dialog-centered">
//                 <div class="modal-content">
//                     <form  action="" @submit=${this.onAccountDeleteSubmit.bind(this)} >
//                         <div class="modal-header">
//                             <h1 class="modal-title fs-5" id="deleteProfileModalConfirmLabel">Delete Account: Confirm</h1>
//                             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                         </div>
//                         <div class="modal-body">
//                             <p class="fs-6 text-danger">Please enter your current password to confirm the deletion</p>
//                             <input
//                                 type="text"
//                                 name="username"
//                                 value="..."
//                                 autocomplete="username"
//                                 style="${"display: none;"}"
//                                 >
//                             ${renderInput(getInputType('curr_password'), true, true)}
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                             ${renderSubmitButton('DELETE', 'btn-danger')}
//                             <!-- <button type="submit" class="btn btn-danger" >DELETE</button> -->
//                         </div>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     `

//     renderModalConfirmDeleteOauth = () => html`
//     <div ${ref(this.deleteAccountModal)} class="modal fade" id="deleteProfileModalConfirm" aria-hidden="true" aria-labelledby="deleteProfileModalConfirmLabel" tabindex="-1">
//             <div class="modal-dialog modal-dialog-centered">
//                 <div class="modal-content">
//                         <div class="modal-header">
//                             <h1 class="modal-title fs-5" id="deleteProfileModalConfirmLabel">Delete Account: Confirm</h1>
//                             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                         </div>
//                         <div class="modal-body">
//                             <p class="fs-6 text-danger">Please confirm the deletion of your Account</p>
//                         </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                             <bs-button
//                                 ._async_handler=${this.onAccountDeleteSubmit.bind(this)}
//                                 color="danger"
//                                 text="DELETE"
//                             ></bs-button>
//                         </div>
//                 </div>
//             </div>
//         </div>
//     `

//     renderDeleteProfile = () => html`
//         <div class="modal fade" id="deleteProfileModal" aria-hidden="true" aria-labelledby="deleteProfileModalLabel" tabindex="-1">
//             <div class="modal-dialog modal-dialog-centered">
//                 <div class="modal-content">
//                     <div class="modal-header">
//                         <h1 class="modal-title fs-5" id="deleteProfileModalLabel">Delete Your Account</h1>
//                         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                     </div>
//                     <div class="modal-body">
//                         By clicking delete we will delete your Account from our System and every Information associated with it.
//                     </div>
//                     <div class="modal-footer">
//                         <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
//                         <button type="button" class="btn btn-danger" data-bs-target="#deleteProfileModalConfirm" data-bs-toggle="modal">Delete Account</button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         ${this.sessionUser.value?.user?.oauth === '42api' ? this.renderModalConfirmDeleteOauth() : this.renderModalConfirmDelete()}
//         <button class="btn btn-danger" data-bs-target="#deleteProfileModal" data-bs-toggle="modal">Delete your Account</button>
//     `
  

//     renderTextArea =() => html`
//         <textarea
//             maxlength="255"
//             class="form-control"
//             style="${"height: 7em;"}"
//             ${ref(this.textAreaRef)}
            
//             placeholder="Leave a comment here"
//             id="profile-edit-about"
//         >
            
            
//         </textarea>
//     `

//     renderBio = () => html`
//         <div  class="form-floating mb-3">
//             ${this.renderTextArea()}
//             <label for="profile-edit-about">Bio</label>
//         </div>
//     `
// //  row align-items-end justify-content-center

//     renderChangeProfile = () => html`
//         <div class="container">
//             <color-mode-toggler></color-mode-toggler>
//             <h1>Update your profile</h1>
//             <div class="col-12 col-md-4 mb-3">
//                 <avatar-component
//                     radius="5"
//                     src="${ifDefined(this.sessionUser.value?.user?.avatar)}"
//                     size="150"
//                 ></avatar-component>
//             </div>
//             <input ${(el)=>{this.fileInpt = el;}} type="file" id="input" style="${"display:none;"}" />
//             <div class="col-6 col-md-4 mb-3">
//                 <bs-button ._async_handler=${async () => {
//                     if (!(this.fileInpt instanceof HTMLInputElement)) return;
//                     const inpt = this.fileInpt;
//                     inpt.click();
//                     try {
//                         /** @type {FileList} */
//                         const fileList = await new Promise( function (resolve, reject) {
//                             /**
//                              * @param {Event} ev
//                              * @this {any}
//                              */
//                             function handleUpload(ev) {
//                                 inpt.removeEventListener('change', handleUpload);
//                                 resolve(this.files);
//                             }
//                             function handleCancel(ev) {
//                                 inpt.removeEventListener('cancel', handleCancel);
//                                 reject(ev);
//                             }
//                             inpt.addEventListener('change', handleUpload);
//                             inpt.addEventListener('cancel', handleCancel);
//                         })
//                         console.log('fileList: ', fileList);
//                         const fd = new FormData();
//                         fd.append('avatar', fileList[0])
//                         const res = await sessionService.updateUserData(fd);
                    
//                         super.requestUpdate();
//                     } catch (e) { console.log('err: ', e); }
                    
                    
//                 }} color="dark" icon="pencil"  text="change" stretch ></bs-button>
//             </div>
//                     ${this.renderChangePassword()}
//                     ${this.renderDeleteProfile()}
//             <div class="col-12">
//                 <form ${(el)=>{this.formElem = el;}} class="needs-validation">
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="alias"
//                             id="profile-edit-alias"
//                             placeholder="alias"
//                             maxlength="30"
//                             value="${this.sessionUser.value?.user?.alias ?? ''}"
//                         />
//                         <label for="profile-edit-firstname" class="form-label">Player Alias</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="first_name"
//                             id="profile-edit-firstname"
//                             placeholder="John"
//                             maxlength="30"
//                             value="${this.sessionUser.value?.user?.first_name ?? ''}"
//                         />
//                         <label for="profile-edit-firstname" class="form-label">First Name</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="last_name"
//                             id="profile-edit-lastname"
//                             placeholder="Doe"
//                             maxlength="30"
//                             value="${this.sessionUser.value?.user?.last_name ?? ''}"
//                         />
//                         <label for="profile-edit-lastname" class="form-label">Last Name</label>
//                     </div>
//                     <div>

//                         ${this.renderBio()}
//                     </div>
                    
//                 </form>
//                 <bs-button ._async_handler=${ async () => {
//                     const isvalid = this.formElem?.reportValidity();
//                     if (!isvalid) return;
//                     const formData = new FormData(this.formElem);
//                     formData.set('bio', this.textAreaRef.value?.value.trim() ?? '');

//                     await sessionService.updateUserData(formData);
//                     super.requestUpdate();

//                     console.log('isValid?: ', isvalid);
//                     console.log('form: ');
//                     formData.forEach((v,k)=> {
//                         console.log("key: ", k, ", value: ", v);
//                     })
                    
//                     // await sessionService.updateUserData()
//                 }} text="Save"></bs-button>
//             </div>
            
//         </div>
//     `

// // html`
// //                 <button class="btn btn-dark m-3" @click=${() => { BaseElement.toggleColorMode(); }}>
// //                     <i class="fa-solid fa-circle-half-stroke"></i>
// //                 </button>
// //                              `
//     renderColorModeToggler = () => html`
//        <color-mode-toggler></color-mode-toggler>
//     `

//     render() {
//         console.log('render settings view, selected: ', this.selected);

//         const render = this.selected === this.confMap.profile ? this.renderChangeProfile()
//             : this.selected === this.confMap.colorMode ? this.renderColorModeToggler()
//             : '';
//         // <vertical-nav burger .navconfigs=${this.configs} stoppropagation ?row=${isMobile}  ></vertical-nav>

      

//         return html`
//             ${this.isMobileWidth() ? html`
//                 <div class="pong-navigation-vertical">
//                     <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
//                 </div>
//                 ${render}
//             ` : html`
//                 <div class="row w-100 h-100">
//                     <div class="p-0 m-0" style="${"height:100%;max-width: 13em;"}">
//                         <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
//                     </div>
//                     <div class="col">
//                         ${render}
//                     </div>
//                 </div>
//             `}
//     `;
//     }
// }
// window.customElements.define('settings-view', SettingsView);













// export class SettingsView extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);

//         this.configs = [
//             {text: "Profile", icon: "user", useList: true, firstActive: true},
//             {text: "Account", icon: "gear", useList: true},
//             {text: "Game", icon: "gamepad", useList: true},
//             {text: "Color Mode", icon: "circle-half-stroke", useList: true},
//             {text: "Notification", icon: "bell", useList: true},
//         ]
//         this.confMap = {profile: this.configs[0], account: this.configs[1], game: this.configs[2], colorMode: this.configs[3]};

//         /** @param {SelectedNavLink} ev */
//         this.selectedHandler = (ev) => {
//             this.selected = ev.navConf;
            
//             if (this.isMobileWidth())
//                 Offcanvas.getOrCreateInstance("vertical-nav div div div.offcanvas").hide();
//             else
//                 super.requestUpdate();
//         }
//         this.selected = this.configs[0];
//         this.onShouldUpdate = (e) => {console.log('shouldUpdate: ', e);super.requestUpdate();}
//     }

    
//     connectedCallback() {
//         super.connectedCallback();
//         this.addEventListener("selected_nav_link", this.selectedHandler);
//         window.addEventListener("resize", this.onShouldUpdate);
//         this.addEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
//         // this.addEventListener("hidePrevented.bs.offcanvas", (e)=>{console.log('hide prev?: ', e);});
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.removeEventListener("selected_nav_link", this.selectedHandler);
//         window.removeEventListener("resize", this.onShouldUpdate);
//         this.removeEventListener("hidden.bs.offcanvas", this.onShouldUpdate)
//     }

//     isMobileWidth = () => window.innerWidth <= 800;

//     renderChangeProfile = () => html`
//         <div class="container row align-items-end justify-content-center">
//             <h1>Update your profile</h1>
//             <div class="col-12 col-md-4 mb-3">
//                 <avatar-component
//                     status="online"
//                     statusborder
//                     radius="5"
//                     src="${this.sessionUser.value?.user?.avatar}"
//                     size="150"
//                 ></avatar-component>
//             </div>
//             <input ${(el)=>{this.fileInpt = el;}} type="file" id="input" style="${"display:none;"}" />
//             <div class="col-6 col-md-4 mb-3">
//                 <bs-button ._async_handler=${async () => {
//                     if (!(this.fileInpt instanceof HTMLInputElement)) return;
//                     const inpt = this.fileInpt;
//                     inpt.click();
//                     try {
//                         /** @type {FileList} */
//                         const fileList = await new Promise( function (resolve, reject) {
//                             /** @param {Event} ev */
//                             function handleUpload(ev) {
//                                 inpt.removeEventListener('change', handleUpload);
//                                 resolve(this.files);
//                             }
//                             function handleCancel(ev) {
//                                 inpt.removeEventListener('cancel', handleCancel);
//                                 reject(ev);
//                             }
//                             inpt.addEventListener('change', handleUpload);
//                             inpt.addEventListener('cancel', handleCancel);
//                         })
//                         console.log('fileList: ', fileList);
//                         const fd = new FormData();
//                         fd.append('avatar', fileList[0])
//                         await sessionService.updateUserData(fd);
//                         super.requestUpdate();
//                     } catch (e) { console.log('err: ', e); }
                    
                    
//                 }} color="dark" icon="pencil"  text="change" stretch ></bs-button>
//             </div>
//             <div class="col-6 col-md-4 mb-3">
//                 <bs-button ._async_handler=${async () => {
//                     // const fd = new FormData();
//                     // fd.append('avatar', 'None');
//                     // await sessionService.updateUserData(fd);
//                     // super.requestUpdate();
//                 }} color="danger" icon="trash"  text="delete " stretch ></bs-button>
//             </div>
//             <div class="col-12">
//                 <form ${(el)=>{this.formElem = el;}} class="needs-validation">
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="alias"
//                             id="profile-edit-alias"
//                             placeholder="alias"
//                             value="${this.sessionUser.value?.user?.alias ?? ''}"
//                         />
//                         <label for="profile-edit-firstname" class="form-label">Player Alias</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="first_name"
//                             id="profile-edit-firstname"
//                             placeholder="John"
//                             value="${this.sessionUser.value?.user?.first_name ?? ''}"
//                         />
//                         <label for="profile-edit-firstname" class="form-label">First Name</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="last_name"
//                             id="profile-edit-lastname"
//                             placeholder="Doe"
//                             value="${this.sessionUser.value?.user?.last_name ?? ''}"
//                         />
//                         <label for="profile-edit-lastname" class="form-label">Last Name</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <textarea class="form-control" placeholder="Leave a comment here" id="profile-edit-about" style="${"height: 100px; max-height: 200px;"}"></textarea>
//                         <label for="profile-edit-about">Comments</label>
//                     </div>
//                 </form>
//                 <bs-button ._async_handler=${ async () => {
//                     const isvalid = this.formElem?.reportValidity();
//                     const formData = new FormData(this.formElem);
//                     await sessionService.updateUserData(formData);
//                     super.requestUpdate();

//                     console.log('isValid?: ', isvalid);
//                     console.log('form: ');
//                     formData.forEach((v,k)=> {
//                         console.log("key: ", k, ", value: ", v);
//                     })
                    
//                     // await sessionService.updateUserData()
//                 }} text="Save"></bs-button>
//             </div>
            
//         </div>
//     `

    

//     render() {
//         console.log('render settings view, selected: ', this.selected);

//         const render = this.selected === this.confMap.profile ? this.renderChangeProfile()
//             : this.selected === this.confMap.colorMode ? html`
//                 <button class="btn btn-dark m-3" @click=${() => { BaseElement.toggleColorMode(); }}>
//                     <i class="fa-solid fa-circle-half-stroke"></i>
//                 </button>
//                              ` : '';
//         // <vertical-nav burger .navconfigs=${this.configs} stoppropagation ?row=${isMobile}  ></vertical-nav>
//         return html`
//             ${this.isMobileWidth() ? html`
//                 <div class="h-auto">
//                     <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
//                 </div>
//                 ${render}
//             ` : html`
//                 <div class="row w-100 h-100">
//                     <div class="p-0 m-0" style="${"height:100%;max-width: 13em;"}">
//                         <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
//                     </div>
//                     <div class="col">
//                         ${render}
//                     </div>
//                 </div>
//             `}
//     `;
//     }
// }
// window.customElements.define('settings-view', SettingsView);
