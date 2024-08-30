import { Offcanvas } from 'bootstrap';
import { BaseElement, createRef, html, ref, ifDefined } from '../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../lib_templ/templ/TemplateAsLiteral.js';

/**
 * @typedef {Object} NavItemConf
 * @property {string} text
 * @property {string} [href]
 * @property {string} [icon]
 * @property {boolean} [disabled]
 * @property {boolean} [firstActive]
 * @property {number} [displayCount]
 */

/**
 * @typedef {{
 *      setActive: (newValue: boolean) => void,
 *      render: (firstRender: boolean, center: boolean, doubleLine: boolean) => TemplateAsLiteral, 
 *  }} GetNavItemObj
 * 
 */


export class SelectedNavLink extends Event {
    constructor(navConf) {
        super("selected_nav_link", {bubbles: true});
        this.navConf = navConf;
    }
}


/**
 * @typedef {object} navProps
 * @property {NavItemConf[]} [navconfigs]
 * 
 * @typedef {navProps & import('../lib_templ/BaseBase.js').BaseBaseProps} NAVPROPS
 */


/**
 * @prop {NavItemConf[]} navconfigs
 * @attr notification
 * @attr stoppropagation
 * @attr burger
 * @attr row
 * @attr linebreak
 * @attr center
 * @attr list
 * 
 * @extends BaseElement<NAVPROPS>
 */
export class VerticalNav extends BaseElement {
    static observedAttributes = ["notification", "stoppropagation", "burger", "row", "linebreak", "center", "list"];

    static id = 0;
    static getIdName = () => `navbar-toggler-${VerticalNav.id++}`

    constructor() {
        super(false, false);
        this.props.navconfigs = [];
        /** @type {Array<GetNavItemObj> | undefined} */
        this.navItems;
        this.firstRender = true;
        this.useId = VerticalNav.getIdName();
        this.stoppropagation = false;
        this.notification = false;
        this.burger = false;
        this.row = false;
        this.linebreak = false;
        this.center = false;
        this.list = true;
    }

    async init() {
        await this.updateComplete;
        if (this.offcanvasRef.value) {
            this.offcanvasToggle = new Offcanvas(this.offcanvasRef.value);
            // console.log('OFFCANVAS: ', this.offcanvasToggle);
        }
        
    }

    connectedCallback() {
        super.connectedCallback();
        this.init();
    }

    // activeLink = 0;
    activeLink;

    /** @param {NavItemConf} conf @param {number} index */
    renderNavLink = (conf, index) => {
        // const isActive = conf.firstActive ?? this.activeLink === index;
        let isActive = this.activeLink === index;
        if (this.activeLink == undefined) {
            isActive = conf.firstActive ?? false;
        }
        // const classes = `position-relative nav-link ps-3 w-100 ${this.linebreak ? 'd-flex flex-column align-items-center p-3' : '' } ${isActive ? 'active link-light' : ''}`;
        const classes = `position-relative nav-link ps-3  ${this.linebreak ? 'd-flex flex-column align-items-center p-3' : '' } ${isActive ? 'active link-light' : ''}`;
        // console.log('render nav link: active: ', this.activeLink, ', index: ', index, ' route: ', conf.href);
        
        return html`
        <a
            @click=${ (e) => {
                if (this.stoppropagation) {
                    // console.log('STOP PROPAGATION');
                    
                    e.stopPropagation();
                    e.preventDefault();
                }
                this.activeLink = index;
                this.offcanvasToggle?.hide();
                super.requestUpdate();
                parent.dispatchEvent(new SelectedNavLink(conf));
                this.firstRender = false;
                conf.firstActive = false;
            } } 
            class="${classes}"
            href="${conf.href ?? '#'}"
            aria-current="${ifDefined(isActive ? "page" : undefined)}"
        >
            ${conf.displayCount ? html `
                <span class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger px-2">
                    ${conf.displayCount}
                    <span class="visually-hidden">unread messages</span>
                </span>
            ` : ''}
            ${conf.icon ? html` <i class="fa-solid fa-fw fa-${conf.icon} fs-5"></i> `:''}
            <span class="${(this.center || this.linebreak) ? 'm-0' : 'ms-2'}  fs-6">${conf.text}</span>
        </a>
    `}

    renderNavbar = () => {
        
        // const classes = `flex-grow-1 navbar-nav nav-pills nav-justified d-flex flex-${this.row ? 'row' : 'column'} align-items-stretch justify-content-around`;
        const classes = `nav nav-fill nav-pills flex-${this.row ? 'row' : 'column'} `;
        return html`
            <ul class="${classes}" >
                ${ this.props.navconfigs?.map((c, i) => !this.list ? this.renderNavLink(c, i) : html`
                    <li class="nav-item ${this.center ? 'text-center' : 'text-start'}">
                        ${this.renderNavLink(c, i)}
                    </li>`) }
            </ul>
    `}

    offcanvasRef = createRef();
    renderOffscreenNavbar = () => html`
        <div class="container-fluid">
            <button
                class="btn btn-primary btn-lg position-fixed rounded-5 py-2 px-3 end-0 bottom-0" style="${"box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); z-index:23; transform: translate(-1em, -6em);"}"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#${this.useId}"
                aria-controls="${this.useId}"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                More Settings
                <i class="fa-solid fa-fw fa-gear"></i>
            </button>
            <div ${ref(this.offcanvasRef)}
                class="offcanvas offcanvas-start"
                tabindex="-1"
                id="${this.useId}"
                aria-labelledby="offcanvasNavbarLabel-${this.useId}"
            >
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title" id="offcanvasNavbarLabel-${this.useId}">
                        Settings
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close">
                    </button>
                </div>
                <div class="offcanvas-body">
                    ${this.renderNavbar()}
                </div>
            </div>
        </div>
    `

    render() {
        // console.log('rendernav, confs: ', this.props.navconfigs);
        
        // flex-grow-1 nav navbar py-2
        return html`
        <div class="${this.notification ? 'pong-navigation-nav ' : ''} bg-light-subtle ${this.row ? 'pong-navigation-nav-horizontal' : 'pong-navigation-nav-vertical'}">
            ${this.notification ? html` <div class="flex-shrink-1"><notification-view></notification-view></div> ` : ''}
            <div  class="flex-grow-1">
                ${this.burger ? this.renderOffscreenNavbar() : this.renderNavbar()}
            </div>

        </div>
        `;
    }
}
window.customElements.define('vertical-nav', VerticalNav);

// /**
//  * @template T
//  * @param {BaseElement} parent
//  * @param {T} initialValue - The initial state value.
//  * @returns {[() => T, (newValue: T) => void]} - A tuple with a state getter and a state setter.
//  */
// export function useState(parent, initialValue) {
//     let state = initialValue;
  
//     function setState(newValue) {
//       state = newValue;
//     // //   console.log(`State updated to: ${state}`);
//       parent.requestUpdate();
//     }
  
//     function getState() {
//       return state;
//     }
  
//     return [getState, setState];
//   }

// /**
//  * @typedef {Object} NavItemConf
//  * @property {string} text
//  * @property {string} [href]
//  * @property {string} [icon]
//  * @property {boolean} [disabled]
//  * @property {boolean} [firstActive]
//  * @property {number} [displayCount]
//  */

// /**
//  * @typedef {{
//  *      setActive: (newValue: boolean) => void,
//  *      render: (firstRender: boolean, center: boolean, doubleLine: boolean) => TemplateAsLiteral, 
//  *  }} GetNavItemObj
//  * 
//  */

// // /**
// //  * @param {BaseElement} parent
// //  * @param {NavItemConf} conf
// //  * @param {(setActive: (newValue: boolean) => void)=>void} onClick
// //  * @param {boolean} stoppropagation
// //  * @param {boolean} useList
// //  * @returns {GetNavItemObj}
// //  */
// // export const getNavItem = (parent, conf, onClick, stoppropagation, useList) => {
// //     let [getActive, setActive] = useState(parent, false);
// //     let isActive = false;
// //     return {setActive, render: (firstRender, center, doubleLine) => {
// //         if (conf.firstActive !== undefined)
// //             isActive = getActive() || firstRender && conf.firstActive;
// //         else isActive = getActive()
// //         const link = html`
// //             <a
// //                 @click=${(e)=>{
// //                     if (stoppropagation)
// //                         e.stopPropagation(); e.preventDefault();
// //                     parent.dispatchEvent(new SelectedNavLink(conf));
// //                     onClick(setActive)
// //                     firstRender = false;
// //                 }} 
// //                 class="nav-link ps-3 w-100
// //                     ${doubleLine ? 'd-flex flex-column align-items-center p-3' : ''}
// //                     ${isActive ? 'active link-light' : ''}
// //                 "
// //                 ?disabled=${conf.disabled}
// //                 href="${conf.href ?? '#'}"
// //                 aria-current="${isActive ? "page" : undefined}"
// //             >
// //                 ${conf.icon ? html`
// //                         <i class="fa-solid fa-fw fa-${conf.icon} fs-5"></i>
// //                 `:''}
// //                 <span class="${(center || doubleLine) ? 'm-0' : 'ms-2'}  fs-6">${conf.text}</span>
// //             </a>
// //         `
// //         return useList ? html`<li class="nav-item ${center ? 'text-center' : 'text-start'}">${link}</li>` : link;
// //     }}
// // }


// export class SelectedNavLink extends Event {
//     constructor(navConf) {
//         super("selected_nav_link", {bubbles: true});
//         this.navConf = navConf;
//     }
// }



// // class NavbarItem extends BaseElement {
// //     constructor() {
// //         super(false, false);
// //     }

// //     /** @param {NavItemConf} conf @param {number} index */
// //     renderNavLink = (conf, index) => {
// //         const classes = `nav-link ps-3 w-100 ${this.linebreak ? 'd-flex flex-column align-items-center p-3' : '' } ${isActive ? 'active link-light' : ''}`;
// //         return html`
// //         <a
// //             data-index="${index}"
// //             @click=${ this.onNavClick } 
// //             class="${classes}"
// //             ?disabled=${conf.disabled}
// //             href="${conf.href ?? '#'}"
// //             aria-current="${isActive ? "page" : undefined}"
// //         >
// //             ${conf.icon ? html` <i class="fa-solid fa-fw fa-${conf.icon} fs-5"></i> `:''}
// //             <span class="${(this.center || this.linebreak) ? 'm-0' : 'ms-2'}  fs-6">${conf.text}</span>
// //         </a>
// //     `}

// //     render() {
// //         return html`
        
// //         `
// //     }
// // }

// /**
//  * @typedef {object} navProps
//  * @property {NavItemConf[]} [navconfigs]
//  * 
//  * @typedef {navProps & import('../lib_templ/BaseBase.js').BaseBaseProps} NAVPROPS
//  */


// /**
//  * @prop {NavItemConf[]} navconfigs
//  * @attr notification
//  * @attr stoppropagation
//  * @attr burger
//  * @attr row
//  * @attr linebreak
//  * @attr center
//  * @attr list
//  * 
//  * @extends BaseElement<NAVPROPS>
//  */
// export class VerticalNav extends BaseElement {
//     static observedAttributes = ["notification", "stoppropagation", "burger", "row", "linebreak", "center", "list"];

//     static id = 0;
//     static getIdName = () => `navbar-toggler-${VerticalNav.id++}`

//     constructor() {
//         super(false, false);
//         this.props.navconfigs = [];
//         /** @type {Array<GetNavItemObj> | undefined} */
//         this.navItems;
//         this.firstRender = true;
//         this.useId = VerticalNav.getIdName();
//         this.stoppropagation = false;
//         this.notification = false;
//         this.burger = false;
//         this.row = false;
//         this.linebreak = false;
//         this.center = true;
//         this.list = true;
//     }

//     activeLink = 0;

//     /** @param {NavItemConf} conf @param {number} index */
//     renderNavLink = (conf, index) => {
//         // const isActive = conf.firstActive ?? this.activeLink === index;
//         const isActive = this.activeLink === index;
//         // const classes = `position-relative nav-link ps-3 w-100 ${this.linebreak ? 'd-flex flex-column align-items-center p-3' : '' } ${isActive ? 'active link-light' : ''}`;
//         const classes = `position-relative nav-link ps-3  ${this.linebreak ? 'd-flex flex-column align-items-center p-3' : '' } ${isActive ? 'active link-light' : ''}`;
//         console.log('render nav link: active: ', this.activeLink, ', index: ', index, ' route: ', conf.href);
        
//         return html`
//         <a
//             @click=${ (e) => {
//                 if (this.stoppropagation) {
//                     e.stopPropagation();
//                     e.preventDefault();
//                 }
//                 this.activeLink = index;
//                 super.requestUpdate();
//                 parent.dispatchEvent(new SelectedNavLink(conf));
//                 this.firstRender = false;
//                 conf.firstActive = false;
//             } } 
//             class="${classes}"
//             href="${conf.href ?? '#'}"
//             aria-current="${ifDefined(isActive ? "page" : undefined)}"
//         >
//             ${conf.displayCount ? html `
//                 <span class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-danger px-2">
//                     ${conf.displayCount}
//                     <span class="visually-hidden">unread messages</span>
//                 </span>
//             ` : ''}
//             ${conf.icon ? html` <i class="fa-solid fa-fw fa-${conf.icon} fs-5"></i> `:''}
//             <span class="${(this.center || this.linebreak) ? 'm-0' : 'ms-2'}  fs-6">${conf.text}</span>
//         </a>
//     `}

//     renderNavbar = () => {
//         // const classes = `flex-grow-1 navbar-nav nav-pills nav-justified d-flex flex-${this.row ? 'row' : 'column'} align-items-stretch justify-content-around`;
//         const classes = `flex-grow-1 navbar-nav nav-pills nav-justified d-flex flex-${this.row ? 'row' : 'column'} align-items-stretch justify-content-around`;
//         return html`
//             <ul class="${classes}" >
//                 ${ this.props.navconfigs?.map((c, i) => !this.list ? this.renderNavLink(c, i) : html`
//                     <li class="nav-item ${this.center ? 'text-center' : 'text-start'}">
//                         ${this.renderNavLink(c, i)}
//                     </li>`) }
//             </ul>
//     `}

//     renderOffscreenNavbar = () => html`
//         <div class="container-fluid">
//             <button
//                 class="btn btn-link link-body-emphasis"
//                 type="button"
//                 data-bs-toggle="offcanvas"
//                 data-bs-target="#${this.useId}"
//                 aria-controls="${this.useId}"
//                 aria-expanded="false"
//                 aria-label="Toggle navigation"
//             >
//                 <i class="fa-solid fa-bars me-3"></i>
//                 Open Settings
//             </button>
//             <div
//                 data-bs-backdrop="false"
//                 class="offcanvas offcanvas-start"
//                 tabindex="-1"
//                 id="${this.useId}"
//                 aria-labelledby="offcanvasNavbarLabel-${this.useId}"
//             >
//                 <div class="offcanvas-header">
//                     <h5 class="offcanvas-title" id="offcanvasNavbarLabel-${this.useId}">
//                         Settings
//                     </h5>
//                     <button
//                         type="button"
//                         class="btn-close"
//                         data-bs-dismiss="offcanvas"
//                         aria-label="Close">
//                     </button>
//                 </div>
//                 <div class="offcanvas-body">
//                     ${this.renderNavbar()}
//                 </div>
//             </div>
//         </div>
//     `

//     render() {
//         console.log('rendernav, confs: ', this.props.navconfigs);
        
//         return html`
//         <div class="pong-navigation-nav bg-light-subtle border-top">
//             ${this.notification ? html` <div class="flex-shrink-1"><notification-view></notification-view></div> ` : ''}
//             <div  class="flex-grow-1 nav navbar py-2">
//                 ${this.burger ? this.renderOffscreenNavbar() : this.renderNavbar()}
//             </div>

//         </div>
//         `;
//     }
// }
// window.customElements.define('vertical-nav', VerticalNav);





      // ${this.notification ? html` <div> <notification-view></notification-view> </div> ` : ''}
        // const navv = html`
        //     <div class="d-flex w-100">
                
        //         <div class="d-flex flex-row justify-content-evenly align-items-center w-100">
        //             ${this.notification ? html` <div> <notification-view></notification-view> </div> ` : ''}
        //             <ul class="flex-grow-1 navbar-nav nav-pills nav-justified w-100 d-flex align-items-stretch justify-content-around ${this.row ? 'flex-row' : 'flex-column'} " >
        //                 ${ this.navItems?.map((i)=>i.render(this.firstRender, this.center, this.linebreak)) }
        //             </ul>
        //         </div>
        //     </div>
        // `;













// /**
//  * @template T
//  * @param {BaseElement} parent
//  * @param {T} initialValue - The initial state value.
//  * @returns {[() => T, (newValue: T) => void]} - A tuple with a state getter and a state setter.
//  */
// export function useState(parent, initialValue) {
//     let state = initialValue;
  
//     function setState(newValue) {
//       state = newValue;
//     // //   console.log(`State updated to: ${state}`);
//       parent.requestUpdate();
//     }
  
//     function getState() {
//       return state;
//     }
  
//     return [getState, setState];
//   }

// // /**
// //  * @param {BaseElement} parent
// //  * @param {string} text
// //  * @param {string} href
// //  * @returns 
// //  */
// // const getNavItem = (parent, text, href) => {

// //     let [getActive, setActive] = useState(parent, false);
// // //     console.log('Hallo get nav item');
// //     return html`
// //         <li class="nav-item">
// //             <a @click=${()=>{setActive(true)}} class="nav-link ${getActive() ? 'active' : ''}"
// //                 aria-current="page" href="${href}">
// //                 ${text}
// //             </a>
// //         </li>
// //     `
// // };

// const getCounter = (parent) => {
//     let [getCount, sentCounter] = useState(parent, 0);
//     return (name) => html`
//         <bs-button @click=${()=>{sentCounter(getCount() - 1)}} text="decrement"></bs-button>
//         <div class="fs-2">Hallo ${name} ${getCount()}</div>
//         <bs-button @click=${()=>{sentCounter(getCount() + 1)}} text="increment"></bs-button>
//     `
// }

// /**
//  * @typedef {Object} NavItemConf
//  * @property {string} text
//  * @property {string} [href]
//  * @property {string} [icon]
//  * @property {boolean} [disabled]
//  * @property {boolean} [firstActive]
//  */

// // /**
// //  * @param {NavItemConf} conf
// //  * @returns 
// //  */
// // const getNavItem2 = (conf) => {
// //     const link = html`
// //         <a class="nav-link ps-3 " ?disabled=${conf.disabled} @click=${(e)=>{e.stopPropagation(); e.preventDefault();}}
// //              href="${conf.href ?? '#'}">
// //             ${conf.icon ? html`<i class="fa-solid fa-${conf.icon} fs-5"></i>`:''}
// //             <span class="ms-2 fs-6">${conf.text}</span>
// //         </a>
// //     `
// //     return conf.useList ? html`<li class="nav-item">${link}</li>` : link;
// // }

// /**
//  * @typedef {{
//  *      setActive: (newValue: boolean) => void,
//  *      render: (firstRender: boolean, center: boolean, doubleLine: boolean) => TemplateAsLiteral, 
//  *  }} GetNavItemObj
//  * 
//  */

// /**
//  * @param {BaseElement} parent
//  * @param {NavItemConf} conf
//  * @param {(setActive: (newValue: boolean) => void)=>void} onClick
//  * @param {boolean} stoppropagation
//  * @param {boolean} useList
//  * @returns {GetNavItemObj}
//  */
// export const getNavItem = (parent, conf, onClick, stoppropagation, useList) => {
//     let [getActive, setActive] = useState(parent, false);
//     let isActive = false;
//     return {setActive, render: (firstRender, center, doubleLine) => {
//         if (conf.firstActive !== undefined)
//             isActive = getActive() || firstRender && conf.firstActive;
//         else isActive = getActive()
//         // console.log('render getNavItem, firstRender?: ', firstRender);
//         // console.log('render getNavItem, getActive()?: ', getActive());
//         // console.log('render getNavItem, isActive?: ', isActive);
//         // console.log('render getNavItem, conf: ', conf);
//         const link = html`
//             <a
//                 @click=${(e)=>{
//                     if (stoppropagation)
//                         e.stopPropagation(); e.preventDefault();
//                     parent.dispatchEvent(new SelectedNavLink(conf));
//                     onClick(setActive)
//                     firstRender = false;
//                 }} 
//                 class="nav-link ps-3 w-100
//                     ${doubleLine ? 'd-flex flex-column align-items-center p-3' : ''}
//                     ${isActive ? 'active link-light' : ''}
//                 "
//                 ?disabled=${conf.disabled}
//                 href="${conf.href ?? '#'}"
//                 aria-current="${isActive ? "page" : undefined}"
//             >
//                 ${conf.icon ? html`
//                         <i class="fa-solid fa-fw fa-${conf.icon} fs-5"></i>
//                 `:''}
//                 <span class="${(center || doubleLine) ? 'm-0' : 'ms-2'}  fs-6">${conf.text}</span>
//             </a>
//         `
//         return useList ? html`<li class="nav-item ${center ? 'text-center' : 'text-start'}">${link}</li>` : link;
//     }}
// }


// export class SelectedNavLink extends Event {
//     constructor(navConf) {
//         super("selected_nav_link", {bubbles: true});
//         this.navConf = navConf;
//     }
// } 

// /**
//  * @prop {NavItemConf[]} navconfigs
//  * @attr notification
//  * @attr stoppropagation
//  * @attr burger
//  * @attr row
//  * @attr linebreak
//  * @attr center
//  * @attr list
//  */
// export class VerticalNav extends BaseElement {
//     static observedAttributes = ["notification", "stoppropagation", "burger", "row", "linebreak", "center", "list"];

//     static id = 0;
//     static getIdName = () => `navbar-toggler-${VerticalNav.id++}`

//     constructor() {
//         super(false, false);
//         this.props.navconfigs = [];
//         /** @type {Array<GetNavItemObj> | undefined} */
//         this.navItems;
//         this.firstRender = true;
//         this.useId = VerticalNav.getIdName();
//         this.stoppropagation = false;
//         this.notification = false;
//         this.burger = false;
//         this.row = false;
//         this.linebreak = false;
//         this.center = true;
//         this.list = true;
//     }

//     onClick = (setActive) => {
//         this.firstRender = false;
//         this.navItems?.forEach((i)=>{i.setActive(false)});
//         setActive(true);
//     }

//     render() {
//         // // console.log('render navbar, navconfig: ', this.props.navconfigs);
//         // // console.log('row?: ', this.row);
//         if (!this.navItems || this.navItems.length < this.props.navconfigs.length)
//             this.navItems = Array.from(
//                 this.props.navconfigs,
//                 (conf) => getNavItem(this, conf, this.onClick.bind(this), this.stoppropagation, this.list)
//             );
//             // ${this.notification ? html` <div> <notification-view></notification-view> </div> ` : ''}
//         // const navv = html`
//         //     <div class="d-flex w-100">
                
//         //         <div class="d-flex flex-row justify-content-evenly align-items-center w-100">
//         //             ${this.notification ? html` <div> <notification-view></notification-view> </div> ` : ''}
//         //             <ul class="flex-grow-1 navbar-nav nav-pills nav-justified w-100 d-flex align-items-stretch justify-content-around ${this.row ? 'flex-row' : 'flex-column'} " >
//         //                 ${ this.navItems?.map((i)=>i.render(this.firstRender, this.center, this.linebreak)) }
//         //             </ul>
//         //         </div>
//         //     </div>
//         // `;
//         const navv = html`
//             ${this.notification ? html` <span> <notification-view></notification-view> </span> ` : ''}
//             <ul class="flex-grow-1 navbar-nav nav-pills nav-justified w-100 d-flex align-items-stretch justify-content-around ${this.row ? 'flex-row' : 'flex-column'} " >
//                 ${ this.navItems?.map((i)=>i.render(this.firstRender, this.center, this.linebreak)) }
//             </ul>
//         `;
//         // ${this.notification ? html`<notification-view></notification-view>` : ''}
//         return html`
//             <div  class=" border-end nav navbar navbar-expand-lg pong-navbar-padd bg-light-subtle h-100 w-100">
//                 ${this.burger ? html`
//                     <div class="container-fluid">
//                         <button
//                             class="btn btn-link link-body-emphasis"
//                             type="button"
//                             data-bs-toggle="offcanvas"
//                             data-bs-target="#${this.useId}"
//                             aria-controls="${this.useId}"
//                             aria-expanded="false"
//                             aria-label="Toggle navigation"
//                         >
//                            <i class="fa-solid fa-bars me-3"></i>
//                            Open Settings
//                         </button>
//                         <div
//                             data-bs-backdrop="false"
//                             class="offcanvas offcanvas-start"
//                             tabindex="-1"
//                             id="${this.useId}"
//                             aria-labelledby="offcanvasNavbarLabel-${this.useId}"
//                         >
//                             <div class="offcanvas-header">
//                                 <h5 class="offcanvas-title" id="offcanvasNavbarLabel-${this.useId}">
//                                     Settings
//                                 </h5>
//                                 <button
//                                     type="button"
//                                     class="btn-close"
//                                     data-bs-dismiss="offcanvas"
//                                     aria-label="Close">
//                                 </button>
//                             </div>
//                             <div class="offcanvas-body">
//                                 ${navv}
//                             </div>
//                         </div>
//                     </div>
//                 ` : navv}
//             </div>
//     `;
//     }
// }
// window.customElements.define('vertical-nav', VerticalNav);
