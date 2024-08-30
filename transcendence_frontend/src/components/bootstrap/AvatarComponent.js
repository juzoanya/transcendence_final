/* eslint-disable jsdoc/require-returns */
import { BaseElement, createRef, html, ref } from '../../lib_templ/BaseElement.js';
import { userStatusMap } from '../../services/api/GlobalSockHandler.js';

/**
 * @prop text_after
 * @prop text_before
 * @attr size
 * @attr src
 * @attr status
 * @attr radius
 * @attr statusborder
 * @attr statustext
 */
export default class AvatarComponent extends BaseElement {
    static observedAttributes = ['size', 'src', 'status', 'radius', 'statusborder', 'statustext'];

    constructor() {
        super(false, false);
        this.size = 50;
        this.src = '';
        this.status = 'none';
        this.radius = 'circle';
        this.statusborder = false;
        this.statustext = false;
        this.props.text_after = '';
        this.props.text_before = '';
    }

    async init() {
        await this.updateComplete;
        this.calcTransform();
        super.requestUpdate();
    }

    willUpdate() {
        this.calcTransform();
    }

    connectedCallback() {
        super.connectedCallback();
        this.init();
    }

    imgElem = (hasStatus, statusColor) => {
        let border = '';
        if (hasStatus && this.statusborder)
            border = `border border-${this.size > 100 ? '3' : '2'} border-${statusColor}`;
        return html`
            <img
                class="rounded-${this.radius} object-fit-cover ${border}"
                alt="avatar"
                src="${this.src}"
                width="${this.size ?? ''}"
                height="${this.size ?? ''}"
            />
        `;
    };

    svgElem = (hasStatus, statusColor) => {
        let border = '';
        if (hasStatus && this.statusborder)
            border = `border border-${this.size > 100 ? '3' : '2'} border-${statusColor}`;
        return html`
            <svg
                xmlns="https://www.w3.org/2000/svg"
                width="${this.size ?? '0'}"
                height="${this.size ?? '0'}"
                fill="currentColor"
                class="bi bi-person-circle rounded-${this.radius} ${border}"
                viewBox="0 0 16 16"
            >
                <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
                <path
                    fill-rule="evenodd"
                    d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"
                />
            </svg>
        `;
    };

    badgeRef = createRef();

    getSizeAsFloat(value) {
        const float = value ? parseFloat(value) : NaN;
        return Number.isNaN(float) ? 0 : float;
    }

    translationX = 0;
    translationY = 0;
    calcTransform() {
        if (this.badgeRef.value) {
            const r = this.badgeRef.value.getBoundingClientRect();
            this.translationX = this.getSizeAsFloat(this.size) - r.width;
            this.translationY = this.getSizeAsFloat(this.size) - r.height;
        }
    }

    renderStatus = (hasStatus, statusColor) => {
        if (!hasStatus) return '';
        if (this.statustext)
            return html` <span
                class="position-absolute top-100 start-50 translate-middle badge rounded-pill text-bg-${statusColor}"
            >
                ${this.status}
            </span>`;
        if (this.statusborder) return '';
        
        return html`
            <span ${ref(this.badgeRef)}
                class="position-absolute rounded-circle bg-${statusColor}"
                style="padding: 0.4em; transform: translate(${this.translationX}px, ${this.translationY}px);"
                ></span>
                `;
    };
    // style="padding: 0.4em; transform: translate(${Number(this.size) * 0.66}px, ${Number(this.size) * 0.66}px);"

    render() {
        const hasStatus = this.status === 'online' || this.status === 'offline';
        let statusColor = '';
        switch (this.status) {
            case 'online':
                statusColor = 'success';
                break;
            case 'offline':
                statusColor = 'danger';
                break;
            default:
                statusColor = '';
        }
        // return html`
        //     <span class="d-inline-flex align-items-center">
        //         ${this.props.text_before}
        //         <span
        //             class="position-relative d-flex flex-column"
        //             style="width:${this.size ?? '0'}px; height:${this.size ?? '0'}px;"
        //         >
        //             ${this.src ? this.imgElem(hasStatus, statusColor) : this.svgElem(hasStatus, statusColor)}
        //             ${this.renderStatus(hasStatus, statusColor)}
        //         </span>
        //         ${this.props.text_after}
        //     </span>
        // `;
        return html`
            <span class="d-inline-flex align-items-center">
                ${this.props.text_before}
                <span
                    class="position-relative d-inline-block"
                    style="${"width:max-content; height: max-content;"}"
                >
                ${this.renderStatus(hasStatus, statusColor)}
                    ${this.src ? this.imgElem(hasStatus, statusColor) : this.svgElem(hasStatus, statusColor)}
                </span>
                ${this.props.text_after}
            </span>
            `;
            // ${this.props.text_after}
    }
}
customElements.define('avatar-component', AvatarComponent);

/**
 * @param {APITypes.BasicUserData} [userData]
 * @param {boolean} [showStatus]
 */
export function getUserStatus(userData, showStatus) {
    // console.log('getUserStatus: user: ', userData);
    // console.log(`getUserStatus: render avatar: ${userData?.username}, showstatus: ${showStatus}`);
    // if (userData)
        // console.log(`getUserStatus: render avatar: statusFromMap: ${userStatusMap.get(userData.id)}, userStatus: ${userData.online_status}`);
        
    
    if (!userData || !showStatus || !userData.online_status) return 'none';
    const statusFromMap = userStatusMap.get(userData.id);
    return (statusFromMap == undefined ? userData.online_status : statusFromMap);
    // const status = !showStatus ? 'none' : userData.online_status ?? 'none'
}

/**
 *
 * @param {APITypes.BasicUserData} [userData]
 * @param {boolean} [showStatus]
 * @param {string} [linkClasses]
 */
export const avatarLink = (userData, showStatus, linkClasses) => {
    // let status = '';
    // if userData.online
    if (userData && 'inviter' in userData && typeof userData.inviter === "string")
        userData.username = userData.inviter
    else if (userData && 'invitee' in userData && typeof userData.invitee === "string")
        userData.username = userData.invitee

    
    // d-inline-flex flex-column ms-2
    return userData == undefined ? '' : html`
        <a
            href="/profile/${userData.id ?? 0}"
            class="${linkClasses ?? ''} d-inline-flex align-items-center link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
        >
            <avatar-component
                size="40"
                src="${userData.avatar ?? ''}"
                radius="circle"
                status=${getUserStatus(userData, showStatus)}
            ></avatar-component>
            ${Object.hasOwn(userData, 'alias') ? html`
                <span class="d-inline-flex flex-column ms-2 align-items-start">
                    <small class=" text-body-secondary">@${userData.username ?? ''}</small>
                    <span >${(Object.hasOwn(userData, 'alias')) ? userData.alias : ''}</span>
                </span>
            ` : html`
                <span class="ms-2">${userData.username ?? ''}</span>
            `}
        </a>

        `};

//<span class="m-2 text-truncate">${userData.username ?? ''}</span>
// .text_after=${html`<span class="m-2 text-truncate">${userData.username ?? ''}</span>`}

/**
 * @param {APITypes.BasicUserData | undefined} userData
 * @param {boolean} [showStatus]
 */
export const avatarInfo = (userData, showStatus) => {
    // let status = '';
    // if userData.online
    if (userData && 'inviter' in userData && typeof userData.inviter === "string")
        userData.username = userData.inviter
    else if (userData && 'invitee' in userData && typeof userData.invitee === "string")
        userData.username = userData.invitee
    
    return userData ? html`
        <span class="d-inline-flex align-items-center  link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover">
            <avatar-component
                size="40"
                src="${userData.avatar ?? ''}"
                radius="circle"
                status=${getUserStatus(userData, showStatus)}
            >
            </avatar-component>
            ${Object.hasOwn(userData, 'alias') ? html`
                <span class="d-inline-flex flex-column ms-2 align-items-start">
                    <small class=" text-body-secondary">@${userData.username ?? ''}</small>
                    <span >${(Object.hasOwn(userData, 'alias')) ? userData.alias : ''}</span>
                </span>
            ` : html`
                <span class="ms-2">${userData.username ?? ''}</span>
            `}
        </span>
` : ''};
