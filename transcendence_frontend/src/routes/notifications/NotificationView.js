import { actionButtonGroups, actions, configs, getBtn } from '../../components/ActionButtons';
import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API';
import { Popover } from 'bootstrap';
// import { messageSocketService } from '../../services/api/GlobalSockHandler';

const GENERAL_NOTIFICATION_INTERVAL = 4000
const GENERAL_NOTIFICATION_TIMEOUT = 5000

const DEFAULT_NOTIFICATION_PAGE_SIZE = 5

const GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = 0  // New 'general' notifications data payload incoming
const GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = 1  // No more 'general' notifications to retrieve
const GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = 2  // Retrieved all 'general' notifications newer than the oldest visible on screen
const GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS = 3  // Get any new notifications
const GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = 4  // Send the number of unread "general" notifications to the template
const GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = 5 // Update a notification that has been altered


export class NotificationView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();
        this.notifications = sessionService.messageSocket?.subscribeNotifications(this);
    }

    scrolltimeout
    /** @param {Event} e */
    onMenuScroll = (e) => {
        if (this.scrolltimeout !== undefined || (this.notifications?.value && this.notifications.value.fetchingPage === true))
            return;
        const menu = e.currentTarget;
        this.scrolltimeout = setTimeout(() => {
            if (menu && menu instanceof HTMLElement && menu.scrollTop + 10 >= menu.scrollHeight - menu.offsetHeight)
                sessionService.messageSocket?.getNextMessagePage()
                // sessionService.pushToNotificationSocket({command: "get_general_notifications", page_number: this.#pageNo})
            this.scrolltimeout = undefined;
          }, 300);
    }

    /** @param {MessageSocketTypes.NotificationData} n */
    getAction = (n) => n.notification_type === "friendrequest" ? actionButtonGroups.receivedFriendInvitation(n.action_id, true, this)
        : n.notification_type === "gamerequest" ? actionButtonGroups.receivedGameInvitation(n.action_id, true, this)
        : ''

    /**
     * @param {MessageSocketTypes.NotificationData} notification 
     */
    renderNotificationItem = (notification) =>  {
        return html`
        <li 
            
            class="dropdown-item m-0 p-0 d-flex flex-column flex-column align-items-start p-3 w-100">
            <div class="d-flex flex-column align-items-start w-100" >
                ${avatarLink(notification.user)}
                ${(notification.is_active === true && notification.action_id !== -1) ? html`
                    <div class="d-flex flex-column ">
                        <span class="text-truncate">
                            ${notification.description}
                        </span>
                        <div class="d-flex ms-2">
                            ${ this.getAction(notification) }
                        </div>
                    </div>
                ` : html`
                    <span class="text-truncate">
                        ${notification.description}
                    </span>
                ` }
            </div>
            <p class="small m-0 pt-2 timestamp-text">
                ${notification.natural_timestamp}
            </p>
        </li>
    `}

    renderNoNotification = () => html`
        <div class="d-flex flex-row align-items-start" >
            <span class="align-items-start pt-1 m-auto">You have no notifications.</span>
        </div>
    `

    render() {
        // console.log('render: notification list data: ', this.notifications?.value);
        // console.log('render: notification list data?!: ', this.notifications?.value.messages);
        // console.log('render: notification list data?!: ', this.notifications?.value.unreadCount);
        // class=" ${isMobile ? 'btn-group dropup' : 'dropdown'} "
        const isMobile = window.innerWidth <= 576;
        // console.log('render notification, update: ', this.notifications);
        
        console.log('render Notificationsview');
        

        return html`
        <div class="py-2 w-100" >
            <button
                @shown.bs.dropdown=${ () => {
                    this.DrowdownIsOpen = true;
                    console.log('DROPDOWN OPEN');
                    
                    sessionService.messageSocket?.setNotificationsAsReadUntil(Math.round(Date.now() / 1000))
                    sessionService.messageSocket?.updateNotificationNaturalTime()
                    // sessionService.pushToNotificationSocket({command: "mark_notifications_read", oldest_timestamp: this.#newestTmeStamp});
                    document.body.classList.add("overflow-hidden");
                } }
                @hidden.bs.dropdown=${ () => {
                    this.DrowdownIsOpen = false;
                    document.body.classList.remove("overflow-hidden");
                } }
                
                class="btn fs-5 fs-fw d-inline-flex align-items-center justify-content-center position-relative"
                style="${"width: 3em; height: 2em;"}"
                type="button"
                data-bs-toggle="dropdown"
                aria-label="Toggle Notifications"
                aria-expanded="false"
                aria-controls="notificationsList"
            >
                <i class="fa-solid fa-bell"></i>
                ${this.notifications?.value.unreadCount === 0 ? '' : html`
                    <span style="${"transform: translate(100%, -50%);"}" class="position-absolute top-0 start-0 badge rounded-pill bg-danger text-white">
                        ${this.notifications?.value.unreadCount}
                        <span class="visually-hidden">unread notifications</span>
                    </span>
                    
                `}
            </button>
            <ul
                @scroll=${ (e) => { this.onMenuScroll(e) } }
                style="${"min-width: 350px; max-width: 100vw; max-height: 30em;"}"
                class="overflow-scroll dropdown-menu scrollable-menu"
                id="notificationsList"
            >
                ${this.notifications?.value.messages.length === 0 ? this.renderNoNotification()
                    :  this.notifications?.value.messages.map((n) => this.renderNotificationItem(n))
                }
            </ul>

        </div>
        `
    }
}
customElements.define("notification-view", NotificationView);
