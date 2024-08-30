import { BaseElement, html, ifDefined } from '../../lib_templ/BaseElement.js';
import { Toast } from 'bootstrap';
import AvatarComponent, { getUserStatus } from './AvatarComponent.js';

export class ToastNotificationErrorEvent extends Event {
    constructor(message) {
        super("toast_notification_error", {bubbles: true});
        this.message = message;
        this.color = 'danger';
    }
}

export class ToastNotificationSuccessEvent extends Event {
    constructor(message) {
        super("toast_notification_success", {bubbles: true});
        this.message = message;
        this.color = 'success';
    }
}

/**
 * @template T
 */
export class ToastNotificationUserEvent extends Event {
    /**
     * @param {APITypes.BasicUserData} userData 
     * @param {string} message
     * @param {string} [link] 
     * @param {T} [data]
     * @param {(data: T) => void} [dismisscb]
     */
    constructor(userData, message, link, data, dismisscb) {
        super("toast_notification_user", {bubbles: true});
        this.userData = userData;
        this.link = link;
        this.message = message;
        this.data = data;
        this.dismisscb = dismisscb;
    }
}

/**
 * @template T
 */
export class ToastNotificationUserInfoEvent extends Event {
    /**
     * @param {APITypes.BasicUserData} userData 
     * @param {string} message 
     */
    constructor(userData, message) {
        super("toast_notification_user_info", {bubbles: true});
        this.userData = userData;
        this.message = message;
    }
}


export default class BsToasts extends BaseElement {
    constructor() {
        super(false, false);
        this.#onNotification = (event) => {
            console.log('EVENTTTT toast');
            this.onNotification(event);
        };
    }

    #onNotification;

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('render-notification', this.#onNotification);
        document.addEventListener("toast_notification_error", this.#onNotification);
        document.addEventListener("toast_notification_success", this.#onNotification);
        document.addEventListener("toast_notification_user", this.#onNotification);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('render-notification', this.#onNotification );
        document.removeEventListener('toast_notification_error', this.#onNotification );
        document.removeEventListener('toast_notification_success', this.#onNotification );
        document.removeEventListener('toast_notification_user', this.#onNotification );
    }

    /** @param {ToastNotificationErrorEvent | ToastNotificationSuccessEvent} event  */
    onNotification(event) {
        this.renderToastMessage(event);
        // if (event instanceof ToastNotificationErrorEvent || event instanceof ToastNotificationSuccessEvent) {
        //     this.renderToastMessage(event.message, event.color);
        // }
    }

    /**
     * @param {ToastNotificationUserEvent} e 
     */
    getUserToastNode(e) {
        const templ = document.createElement('template');
        // html`<span class="ms-2 text-truncate">${userData.username ?? ''}</span>`
        templ.innerHTML = `
            <div style="opacity: 1;" class="toast pong-toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="false">
                <div class="toast-header d-flex flex-row justify-content-between">
                    <avatar-component
                        size="35"
                        src="${e.userData.avatar ?? ''}"
                        radius="circle"
                        status=${getUserStatus(e.userData, true)}
                    >
                    </avatar-component>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${e.link ? `<a class="" href="${ifDefined(e.link)}">${e.message}</a>` : `<span>${e.message}</span>`}
                </div>
            </div>
        `
        const node = templ.content.firstElementChild?.cloneNode(true);
        
        return node;
    }

    /**
     * @param {ToastNotificationSuccessEvent | ToastNotificationErrorEvent} e 
     */
    getErrorSuccessNode(e) {
        const templ = document.createElement('template');
        templ.innerHTML = /* html */ `
            <div class="toast pong-toast align-items-center text-bg-${e.color} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex alert alert-${e.color} p-1">
                    <div class="toast-body">
                        ${e.message}
                    </div>
                    <button type="button" class="btn-close btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>`;
        return templ.content.firstElementChild?.cloneNode(true);
    }

    renderToastMessage = (event) => {
        // const templ = document.createElement('template');
        // templ.innerHTML = /* html */ `
        //     <div class="toast pong-toast align-items-center text-bg-${color} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        //         <div class="d-flex alert alert-${color} p-1">
        //             <div class="toast-body">
        //                 ${message}
        //             </div>
        //             <button type="button" class="btn-close btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        //         </div>
        //     </div>`;

        // const toast = templ.content.firstElementChild?.cloneNode(true);
        let toast;
        if (event instanceof ToastNotificationErrorEvent || event instanceof ToastNotificationSuccessEvent) {
            toast = this.getErrorSuccessNode(event);
        } else if (event instanceof ToastNotificationUserEvent) {
            toast = this.getUserToastNode(event);
        }
        if (!(toast instanceof HTMLElement)) return;

        const toastBootstrap = Toast.getOrCreateInstance(toast);


        let success = event instanceof ToastNotificationUserEvent ? false : null;


        const hideToast = () => {
            console.log('hideToast click');
            success = true;
            toastBootstrap.hide();
        };
        
        let link;

        
        if (event instanceof ToastNotificationUserEvent) {
            const avatar = toast.querySelector('avatar-component');
            if (avatar instanceof AvatarComponent) {
                avatar.props.text_after = html`<span class="ms-2 text-truncate">${event.userData.username ?? ''}</span>`;
            }
            link = toast.querySelector('a');
            console.log('link: ', link);
            
            if (link instanceof HTMLElement) {
                link.addEventListener('click', hideToast);
            }
        }
        
        const onHidden = () => {
            if (link instanceof HTMLElement) {
                link.removeEventListener('click', hideToast);
            }
            if (success !== null && success === false && event instanceof ToastNotificationUserEvent) {
                if (typeof event.dismisscb === 'function') {
                    event.dismisscb(event.data);
                }
            }
            toast.removeEventListener('hidden.bs.toast', onHidden);
            toast.remove();
        };
        toast?.addEventListener('hidden.bs.toast', onHidden);
        // console.log('toast: ');
        // console.log(toast);
        this.toastCont.appendChild(toast);

        toastBootstrap.show();

    };

    render() {
        return html`
            <div
                aria-live="polite"
                aria-atomic="true"
                class="position-relative"
            >
                <div
                    ${(el) => {
                        this.toastCont = el;
                    }}
                    class="toast-container pong-toast-container p-3" 
                ></div>
            </div>
        `;
    }
    // style="${"position: fixed; top: 60px; right: 0;"}"
}
customElements.define('bs-toasts', BsToasts);
