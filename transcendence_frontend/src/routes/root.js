import { ToastNotificationErrorEvent } from '../components/bootstrap/BsToasts.js';
import { comparePath } from '../components/utils.js';
import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { sessionService } from '../services/api/API.js';


export default class PongApp extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
        this.unreadChatsCount = sessionService.messageSocket?.subscribeUnreadChatsAll(this);

        this.onResize = () => {
            super.requestUpdate();
        }
    }

    shouldAddBottomPadding = false;
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("resize", this.onResize);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("resize", this.onResize);
    }

    // /**
    //  * 
    //  * @param {string} route 
    //  * @param {URL} url
    //  */
    // onRouteChange(route, url) {
    //     const urlstr = url.toString();

    //     // console.log('onRouteChange: root: ', route);
    //     /** @type {import('../components/Navs.js').NavItemConf | undefined} */
    //     let longestEl;
    //     this.configs.forEach((conf)=>{
    //         conf.firstActive = false;
    //         if (conf.href && route.includes(conf.href)) {
    //             if (longestEl === undefined)
    //                 longestEl = conf;
    //             else if (longestEl.href && conf.href.length > longestEl.href.length)
    //                 longestEl = conf;
    //         }
    //     })
    //     if (longestEl)
    //         longestEl.firstActive = true;
    //     super.requestUpdate();
    // }


    renderLoginRegister = () => html`
        <div class="d-flex align-items-center justify-content-center">
            <a class="btn btn-outline-dark me-2" href="/auth/login">
                Login
            </a>
            <a class="btn btn-dark me-2" href="/auth/register">
                Register
            </a>
        </div>
    `
    /** @type {Array<import('../components/Navs.js').NavItemConf>} */
    configs = [
        {text: '', href: '/', icon: 'home'},
        {text: '', href: '/social', icon: 'users'},
        {text: '', href: '/profile', icon: 'user'},
        {text: '', href: '/settings', icon: 'gear'},
    ];


    /** @param {URL} url  */
    beforeRootMount(url) {
        if (comparePath(url.pathname, '/settings', false)) {
            this.configs[3].firstActive = true;
        } else if (comparePath(url.pathname, '/profile', false)) {
            this.configs[2].firstActive = true;
        } else if (comparePath(url.pathname, '/social', false)) {
            this.configs[1].firstActive = true;
        } else {
            this.configs[0].firstActive = true;
        }
    }


    render() {
        this.configs[1].displayCount = this.unreadChatsCount?.value;

        const isMobile = window.innerWidth <= 576;
        return html`
            <bs-toasts></bs-toasts>
            
            <div  class="pong-navigation" >
                ${!sessionService.isLoggedIn ? this.renderLoginRegister() : html`
                    <vertical-nav
                        notification
                        ?center=${true}
                        .navconfigs=${this.configs}
                        row
                        ?linebreak=${isMobile}
                    >
                    </vertical-nav>
                    `}
            </div>
            <div class="pong-content">
                <main id="root-outlet" class="h-100" ></main>
            </div>
        `;
    }
}
window.customElements.define('pong-app', PongApp);
