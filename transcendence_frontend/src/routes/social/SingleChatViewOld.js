import { actions } from '../../components/ActionButtons.js';
import { avatarInfo, avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { renderCard, renderListCard } from '../../components/bootstrap/BsCard.js';
import { BaseElement, createRef, html, ifDefined, ref } from '../../lib_templ/BaseElement.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { sessionService } from '../../services/api/API.js';


const MSG_TYPE_NOTIFICATION_PAGE = 0
const MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED = 1
const MSG_TYPE_NOTIFICATION_TIMESPAN = 2
const MSG_TYPE_NOTIFICATION_NEW = 3
const MSG_TYPE_NOTIFICATION_UNREAD_COUNT = 4
const MSG_TYPE_NOTIFICATION_UPDATED = 5

const MSG_TYPE_CHAT_ROOM_ADD = 100
const MSG_TYPE_CHAT_ROOM_REMOVE = 101
const MSG_TYPE_CHAT_USER_ADD = 102
const MSG_TYPE_CHAT_USER_REMOVE = 103
const MSG_TYPE_CHAT_MESSAGE_NEW = 104
const MSG_TYPE_CHAT_MESSAGE_UPDATED = 105
const MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 106
const MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 107
const MSG_TYPE_CHAT_MESSAGE_PAGE = 108

export function formatDateString(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    // Erstelle Datum ohne Zeit für heute und das gegebene Datum
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Optionen für die Anzeige der Zeit und des Datums ohne Sekunden
    /** @type {Intl.DateTimeFormatOptions} */
    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
    /** @type {Intl.DateTimeFormatOptions} */
    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

    // Überprüfe, ob das gegebene Datum heute ist
    if (compareDate.getTime() === today.getTime()) {
        // Ist heute, zeige nur die Uhrzeit
        return date.toLocaleTimeString('en-US', timeOptions);
    } else {
        // Ist ein früheres Datum, zeige das vollständige Datum
        return date.toLocaleDateString('en-US', dateOptions) + 
               ' at ' + date.toLocaleTimeString('en-US', timeOptions);
    }
}

/**
 * @typedef {object} SingleChatProps
 * @property {APITypes.BasicUserData | APITypes.TournamentData} [user_or_tournament]
 * @property {number} [chatroom_id]
 * @property {boolean} [offcanvas]
*/

/**
 * @typedef {SingleChatProps & import('../../lib_templ/BaseBase.js').BaseBaseProps} SINGLECHATPROPS
 * @typedef {keyof SINGLECHATPROPS} SINGLECHATKEYS
 */

/**
 * @prop user_or_tournament
 * @prop chatroom_id
 * @prop offcanvas
 * @attr color
 * @attr text
 * @attr outline
 * @attr icon
 * @extends BaseElement<SINGLECHATPROPS>
 */
export class SingleChatView extends BaseElement {
    static observedAttributes = ['text', 'icon', 'color', 'outline'];
    static id = 0;
    static getIdName = () => `chat-offcanvas-toggler-${SingleChatView.id++}`

    constructor() {
        super(false, false);
        // @ts-ignore
        this.session = sessionService.subscribe(this);
        /** @type {import('../../lib_templ/templ/nodes/FuncNode.js').Ref<HTMLInputElement>} */
        this.inputRef = createRef();
        this.chatContainerRef = createRef();
        this.useId = SingleChatView.getIdName();
        this.text = '';
        this.icon = '';
        this.outline = false;
        this.color = 'primary';
        this.props.offcanvas = false;
        this.eventlistenerscrolloption = {passive:true};

        this.boundSendMessage = this.sendMsg.bind(this);
    }

    /**
     * @template {SINGLECHATKEYS} T
     * @param {T} key
     * @param {SINGLECHATPROPS[T]} value
     */
    onPropChange(key, value) {
        // console.log('SingleChatView: onPropChange: key: ', key, ' value: ', value);
        if ((typeof value === 'object' && key === 'user_or_tournament') ||  (key === 'chatroom_id' && typeof value === 'number')) {
            // console.log('OK');
            if (this.chats instanceof PubSubConsumer) {
                this.chats.cleanupEventlistener();
            }
            
            // // @ts-ignore
            this.chats = sessionService.messageSocket?.subscribeSingleChat(value, this, (msg_type) => {});
            // console.log('SingleChatView: onPropChange: created Chats: ', this.chats);
            this.isValidChat = this.chats !== undefined;
            // if (this.chats) {
            //     sessionService.messageSocket?.getNextMessagePage(this.chats.value.room?.room_id);
            // }
        }
        return true;
    }

    // onBeforeMount(route, params, url) {
 
    // }

    // onRouteChange(route, params, url) {

    // }

    /** @param {APITypes.ChatMessageData} [message] */
    renderMessage = (message) => {
        const self = message?.user_id === this.session.value?.user?.id;
        // console.log('renderMessage');
        
        return html`
        <div class="d-flex align-items-start justify-content-${self ? 'end' : 'start'}  p-2">
            ${self ? '' : html`
                <avatar-component
                    radius="4"
                    size="30"
                    src="${ifDefined(message?.avatar)}"
                ></avatar-component>
            `}

            <div class="w-75 d-flex flex-column ms-1 align-items-${self ? 'end' : 'start'}">
                <div class="d-flex justify-content-${self ? 'end' : 'start'}">
                    <small class="ms-2 me-1 fw-semibold">${self ? 'you' : message?.username}</small>
                    <small class="fw-light">· ${formatDateString(message?.timestamp)}</small>
                </div>
                <p class="border-1 bg-primary-subtle rounded-2 py-2 px-3" style="${"word-break: break-word;"}">${message?.message}</p>
            </div>
        </div>
    `}

    /** @param {SubmitEvent} ev  */
    sendMsg(ev) {
        console.log('form submitted: ev: ', ev);
        
        ev.preventDefault();
        console.log('form submitted after prevent default: ev: ', ev);
        if (ev.target instanceof HTMLFormElement) {
            const formdata = new FormData(ev.target);
            const msg = formdata.get('chat-message');
            const roomId = this.chats?.value.room?.room_id;
            if (typeof roomId == 'number' && typeof msg === 'string' && msg.trim().length > 0) {
                sessionService.messageSocket?.sendChatMessage(roomId, msg);
            }
            ev.target.reset();
            // if (this.chats?.value.room?.room_id && this.inputRef.value?.value) {
            //     if (this.inputRef.value?.value.trim().length > 0) {
            //         sessionService.messageSocket?.sendChatMessage(this.chats?.value.room?.room_id, this.inputRef.value?.value)
            //     }
            //     this.inputRef.value.value = '';
            // }
        }
    }

    renderMessageInput = () => html`
        <form action="" @submit=${(e) => {this.sendMsg(e)}} >
            <div class="input-group">
                <input ${ref(this.inputRef)}
                    class="form-control form-control-lg "
                    type="text"
                    placeholder="type to chat"
                    name="chat-message"
                    aria-label="chat input"
                >
                <button
                    class="btn btn-primary px-3"
                    type="submit"
                >
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </form>
    `

    #clientScrolled = false;
    updated() {
        // console.log('scroll down?!?!?');
        // if (!this.#clientScrolled && this.chatContainerRef.value) {
        if (this.chatContainerRef.value) {
            // console.log('scroll down');
            
            this.chatContainerRef.value.scrollTo({top: this.chatContainerRef.value.scrollHeight});
        }
    }

    onChatScroll = (e) => {
        // console.log("all nodes: ", document.getElementsByTagName('*').length);
        // console.log('onscroll, fetchPage?: ', this.chats?.value.fetchingPage);
        // console.log('onscroll, currentPage?: ', this.chats?.value.currentPage);
        
        // console.log('currentMessageElements: ', this.allCurrentMessageElements);
        
        
        if (this.scrolltimeout !== undefined || (this.chats && this.chats.value.fetchingPage))
            return;
        const menu = e.currentTarget;
        this.scrolltimeout = setTimeout(() => {
            // console.log('this.chatContainerRef.value?.scrollHeight: ', this.chatContainerRef.value?.scrollHeight);
            console.log('this.chatContainerRef.value?.scrollTop: ', this.chatContainerRef.value?.scrollTop);
            // console.log('this.chatContainerRef.value?.scrollTop: ', this.chatContainerRef.value?.offsetHeight);
            
            
            
            if (this.chatContainerRef.value) {
                const h = this.chatContainerRef.value.scrollHeight - this.chatContainerRef.value.offsetHeight;
                const diff = this.chatContainerRef.value.scrollTop - h;
                if (diff > -7 && diff < 7) this.#clientScrolled = false;
                else this.#clientScrolled = true;
            }
            if (menu && menu instanceof HTMLElement && menu.scrollTop === 0 && typeof this.chats?.value.room?.room_id === 'number')
                sessionService.messageSocket?.getNextMessagePage(this.chats?.value.room?.room_id)
                // sessionService.pushToNotificationSocket({command: "get_general_notifications", page_number: this.#pageNo})
            this.scrolltimeout = undefined;
        }, 300);
        // console.log('Client scrolled: ', this.#clientScrolled ? 'true' : 'false');
        
    }

    getMessageHeights() {
        
    }

    renderOffcanvas = () => {
        const color = `btn-${this.outline ? 'outline-' : ''}${this.color}`;
        return html`
            <button class=" btn ${color}" type="button" data-bs-toggle="offcanvas" data-bs-target="#${this.useId}" aria-controls="${this.useId}">
                ${this.text}
                ${this.icon ? html`<i class="fa-solid fa-fw fa-${this.icon}"></i>` : ''}
            </button>

            <div class="offcanvas offcanvas-end" data-bs-backdrop="true" tabindex="-1" id="${this.useId}" aria-labelledby="${this.useId}Label">
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title" id="${this.useId}Label">
                        ${this.props.user_or_tournament?.name ? `tournament chat ${this.props.user_or_tournament?.name}`
                            : this.props.user_or_tournament?.username ? `private chat with ${this.props.user_or_tournament?.username}`
                            : 'unknown chat'
                        }
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <div class="col d-flex flex-column h-100" >
                        <div ${ref(this.chatContainerRef)}  @scroll=${ {cb: (e)=>{this.onChatScroll(e)}, op: this.eventlistenerscrolloption} }
                            class="flex-grow-1 overflow-scroll" >
                            ${this.chats?.value.messages.map(m => this.renderMessage(m))}
                        </div>
                        <div class="px-2" >
                            ${this.renderMessageInput()}
                        </div>
                    </div>
                </div>
            </div>

        `
    }

    renderCount = 0;
    allCurrentMessageElements = [];
    allCurrentMessageElementsHeights = [];
    selsectedMessageElements = [];

    renderChatHeader = () => {
        
        const room = this.chats?.value.room;
        const user = room?.users.find(u => u.id !== this.session.value?.user?.id);
        const canSendInvitation = room?.type !== 'tournament' && user && sessionService.canSend1vs1GameInvitation(user.id);
        return room?.type === 'tournament' ? '' : html`
            <div class="card">
                <div class="d-flex m-2">
                    <div class="me-2">
                        ${avatarLink(user, true)}
                    </div>
                    ${!canSendInvitation ? '' : actions.sendGameInvitation(user.id, { host: this, showText: false })}
                </div>
            </div>
        `
    }
    render() {
        // console.log('SingleChatView: render: current Chats: ', this.chats?.value);

        
        if (this.chats != undefined) {
            // console.log('OK render with chats, rendercount: ', this.renderCount);
            if (this.renderCount === 0) {
                this.selsectedMessageElements = this.allCurrentMessageElements.slice(0, 10);
            }
            this.renderCount += 1;
        }
        // console.log('OFFCANVAS?: ', this.props.offcanvas);
        
        console.log('render single chat view: form: ', this.querySelector('form'));
        

        return html`
            ${this.isValidChat === false ? html`
                <div>
                    There is no chat :o
                </div>
                ` : html`
                ${this.props.offcanvas ? this.renderOffcanvas() : html`
                    <div class="">
                         <div class="d-flex flex-column chat-window" >
                                ${this.renderChatHeader()}
                                 <div ${ref(this.chatContainerRef)}  @scroll=${(e)=>{this.onChatScroll(e)}}
                                     class="flex-grow-1 overflow-scroll" >
                                     ${this.chats?.value.messages.map(m => this.renderMessage(m))}
                                 </div>
                             <div class="px-2" >${this.renderMessageInput()}</div>
                         </div>
                     </div>
                `}
            `}
            
        `
       
    }
    
}
customElements.define("single-chat-view", SingleChatView);


// function formatDateString(dateString) {
//     const date = new Date(dateString);
//     const now = new Date();

//     // Erstelle Datum ohne Zeit für heute und das gegebene Datum
//     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
//     // Optionen für die Anzeige der Zeit und des Datums ohne Sekunden
//     /** @type {Intl.DateTimeFormatOptions} */
//     const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
//     /** @type {Intl.DateTimeFormatOptions} */
//     const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

//     // Überprüfe, ob das gegebene Datum heute ist
//     if (compareDate.getTime() === today.getTime()) {
//         // Ist heute, zeige nur die Uhrzeit
//         return date.toLocaleTimeString('en-US', timeOptions);
//     } else {
//         // Ist ein früheres Datum, zeige das vollständige Datum
//         return date.toLocaleDateString('en-US', dateOptions) + 
//                ' at ' + date.toLocaleTimeString('en-US', timeOptions);
//     }
// }

// /**
//  * @typedef {object} SingleChatProps
//  * @property {APITypes.BasicUserData | APITypes.TournamentData} [user_or_tournament]
// */

// /**
//  * @typedef {SingleChatProps & import('../../lib_templ/BaseBase.js').BaseBaseProps} SINGLECHATPROPS
//  * @typedef {keyof SINGLECHATPROPS} SINGLECHATKEYS
//  */

// /**
//  * @prop user_or_tournament
//  * @extends BaseElement<SINGLECHATPROPS>
//  */
// export class SingleChatView extends BaseElement {
//     static observedAttributes = [];
//     constructor() {
//         super(false, false);
//         // @ts-ignore
//         this.session = sessionService.subscribe(this);
//         /** @type {import('../../lib_templ/templ/nodes/FuncNode.js').Ref<HTMLInputElement>} */
//         this.inputRef = createRef();
//         this.chatContainerRef = createRef();
//     }

//     /**
//      * @template {SINGLECHATKEYS} T
//      * @param {T} key
//      * @param {SINGLECHATPROPS[T]} value
//      */
//     onPropChange(key, value) {
//         console.log('SingleChatView: onPropChange: value: ', value);
//         if (typeof value === 'object') {
//             console.log('OK');
//             if (this.chats instanceof PubSubConsumer) {
//                 this.chats.cleanupEventlistener();
//             }
//             // @ts-ignore
//             this.chats = messageSocketService.subscribeSingleChat(value, this, true);
//             console.log('SingleChatView: onPropChange: created Chats: ', this.chats);
//         }
//         return true;
//     }

//     /** @param {APITypes.ChatMessageData} [message] */
//     renderMessage = (message) => {
//         const self = message?.user_id === this.session.value.user?.id;
//         console.log('renderMessage');
        
//         return html`
//         <div class="d-flex align-items-start justify-content-${self ? 'end' : 'start'}  p-2">
//             ${self ? '' : html`
//                 <avatar-component
//                     radius="4"
//                     size="30"
//                     src="${ifDefined(message?.avatar)}"
//                 ></avatar-component>
//             `}

//             <div class="w-75 d-flex flex-column ms-1 align-items-${self ? 'end' : 'start'}">
//                 <div class="d-flex justify-content-${self ? 'end' : 'start'}">
//                     <small class="ms-2 me-1 fw-semibold">${self ? 'you' : message?.username}</small>
//                     <small class="fw-light">· ${formatDateString(message?.timestamp)}</small>
//                 </div>
//                 <p class="border-1 bg-light-subtle rounded-2 py-2 px-3">${message?.message}</p>
//             </div>
//         </div>
//     `}

//     sendMsg = () => {
//         if (this.chats?.value.room?.room_id && this.inputRef.value?.value) {
//             if (this.inputRef.value?.value.trim().length > 0)
//                 messageSocketService.sendChatMessage(this.chats?.value.room?.room_id, this.inputRef.value?.value)
//             this.inputRef.value.value = '';
//         }
//     }

//     renderMessageInput = () => html`
//         <div class="input-group">
//             <input ${ref(this.inputRef)}
//                 @keydown=${(e) => { if (e instanceof KeyboardEvent && e.key === 'Enter') this.sendMsg() }}
//                 class="form-control form-control-lg "
//                 type="text"
//                 placeholder="type to chat"
//                 aria-label="chat input"
//             >
//                 <button @click=${(e) => {this.sendMsg()}}
//                 class="btn btn-primary px-3" type="button">
//                     <i class="fa-solid fa-paper-plane"></i>
//                 </button>
                
//         </div>
//     `

//     #clientScrolled = false;
//     onAfterUpdate() {
//         if (!this.#clientScrolled && this.chatContainerRef.value) {
//             this.chatContainerRef.value.scrollTo({top: this.chatContainerRef.value.scrollHeight});
//         }
//     }

//     onChatScroll = (e) => {
//         console.log("all nodes: ", document.getElementsByTagName('*').length);
        
//         if (this.scrolltimeout !== undefined || (this.chats && this.chats.value.fetchingPage))
//             return;
//         // console.log('this.chatContainerRef.value?.scrollHeight: ', this.chatContainerRef.value?.scrollHeight);
//         console.log('this.chatContainerRef.value?.scrollTop: ', this.chatContainerRef.value?.scrollTop);
//         // console.log('this.chatContainerRef.value?.scrollTop: ', this.chatContainerRef.value?.offsetHeight);
//         if (this.chatContainerRef.value) {
//             const h = this.chatContainerRef.value.scrollHeight - this.chatContainerRef.value.offsetHeight;
//             const diff = this.chatContainerRef.value.scrollTop - h;
//             if (diff > -2 && diff < 2) this.#clientScrolled = false;
//             else this.#clientScrolled = true;
//         }
//         const menu = e.currentTarget;
//         this.scrolltimeout = setTimeout(() => {
//             if (menu && menu instanceof HTMLElement && menu.scrollTop === 0 && typeof this.chats?.value.room?.room_id === 'number')
//                 messageSocketService.getNextMessagePage(this.chats?.value.room?.room_id)
//                 // sessionService.pushToNotificationSocket({command: "get_general_notifications", page_number: this.#pageNo})
//             this.scrolltimeout = undefined;
//         }, 300);
//         // console.log('Client scrolled: ', this.#clientScrolled ? 'true' : 'false');
        
//     }

//     render() {
//         console.log('SingleChatView: render: current Chats: ', this.chats?.value);
//         messages.sort((a, b) => b.timestamp - a.timestamp)
        
//         return html`
//             <div class="col d-flex flex-column" style="${"height: 75vh"}">
//                 <div ${ref(this.chatContainerRef)}  @scroll=${(e)=>{this.onChatScroll(e)}}
//                     class="flex-grow-1 overflow-scroll" >
//                     ${this.chats?.value.messages.map(m => this.renderMessage(m))}
//                 </div>
//                 <div class="px-2" >
//                     ${this.renderMessageInput()}
//                 </div>
//             </div>
//         `
//     }
// }
// customElements.define("single-chat-view", SingleChatView);

// export default class ChatView extends BaseElement {
//     static observedAttributes = [];
//     constructor() {
//         super(false, false);
//         this.chatsMap = messageSocketService.subscribeChats(this);
//         this.session = sessionService.subscribe(this);
//         /** @type {import('../../lib_templ/templ/nodes/FuncNode.js').Ref<HTMLInputElement>} */
//         this.inputRef = createRef();
//     }

//     timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
//     dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

//     /** @param {APITypes.ChatMessageData} message */
//     renderMessage = (message) => {
//         const self = message.user_id === this.session.value.user?.id;
//         return html`
//         <div class="d-flex align-items-start justify-content-${self ? 'end' : 'start'}  p-2">
//             ${self ? '' : html`
//                 <avatar-component
//                     radius="4"
//                     size="30"
//                     src="${message.avatar}"
//                 ></avatar-component>
//             `}

//             <div class="w-75 d-flex flex-column ms-1 align-items-${self ? 'end' : 'start'}">
//                 <div class="d-flex justify-content-${self ? 'end' : 'start'}">
//                     <small class="ms-2 me-1 fw-semibold">${self ? 'you' : message.username}</small>
//                     <small class="fw-light">· ${formatDateString(message.timestamp)}</small>
//                 </div>
//                 <p class="border-1 bg-light-subtle rounded-4 p-2">${message.message}</p>
//             </div>
//         </div>
//     `}

//     renderMessageContainer = () => html``

//     /** @param {APITypes.ChatRoomData} [chatroom] */
//     renderChatsListEntry = (chatroom) => !chatroom ? '' : html`
//         <li class="list-group-item list-group-item-action text-body-secondary fs-6">
//             <div class="w-100 row text-center align-items-center justify-content-between">
//                 ${chatroom.type === 'private' ? html`
//                     ${avatarInfo(chatroom.users.find(u => u.id !== this.session.value.user?.id))}
//                 ` : html`
//                     TOURNAMENT CHAT
//                 `}
//             </div>
//         </li>
//     `
// // this.chatsMap.value.forEach((v, k) => {})
//     renderChatsList = () => html`
//         <ul class="list-group list-group-flush w-100 h-100 overflow-scroll">
//             ${
//                 Array.from(this.chatsMap.value, ([room_id, data]) => this.renderChatsListEntry(data.messages.room))
                
//             }
//         </ul>
       
//     `
    
//     renderChatContainer = () => html``

//     renderMessageInput = () => html`
//         <input
//             class="form-control form-control-lg"
//             type="text"
//             placeholder="type to chat"
//             aria-label=".form-control-lg example"
//         >
//     `

//     render() {
        
//         messages.sort((a, b) => b.timestamp - a.timestamp)
//         return html`
//             <div class="row g-0 w-100 px-2">
//                 <div class="col-3 card bg-light-subtle" >
//                     ${this.renderChatsList()}
//                 </div>
//                 <div class="col d-flex flex-column">
//                     <div class="flex-grow-1 overflow-scroll" style="${"min-height: 50vh; max-height: 80vh;"}">
//                         ${messages.map(m => this.renderMessage(m))}
//                     </div>
//                     <div class="px-2" >
//                         ${this.renderMessageInput()}
//                     </div>
//                 </div>
//             </div>
//         `
//     }
// }
// customElements.define("chat-view", ChatView);

// export default class ChatView extends BaseElement {
//     static observedAttributes = [];
//     constructor() {
//         super(false, false);
//         this.chatsMap = sessionService.messageSocket?.subscribeChats(this);
//         this.session = sessionService.subscribe(this);
//         /** @type {import('../../lib_templ/templ/nodes/FuncNode.js').Ref<HTMLInputElement>} */
//         this.inputRef = createRef();
//     }

//     timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
//     dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

//     /** @param {APITypes.ChatMessageData} message */
//     renderMessage = (message) => {
//         const self = message.user_id === this.session.value.user?.id;
//         return html`
//         <div class="d-flex align-items-start justify-content-${self ? 'end' : 'start'}  p-2">
//             ${self ? '' : html`
//                 <avatar-component
//                     radius="4"
//                     size="30"
//                     src="${message.avatar}"
//                 ></avatar-component>
//             `}

//             <div class="w-75 d-flex flex-column ms-1 align-items-${self ? 'end' : 'start'}">
//                 <div class="d-flex justify-content-${self ? 'end' : 'start'}">
//                     <small class="ms-2 me-1 fw-semibold">${self ? 'you' : message.username}</small>
//                     <small class="fw-light">· ${formatDateString(message.timestamp)}</small>
//                 </div>
//                 <p class="border-1 bg-light-subtle rounded-4 p-2">${message.message}</p>
//             </div>
//         </div>
//     `}

//     renderMessageContainer = () => html``

//     /** @param {APITypes.ChatRoomData} [chatroom] */
//     renderChatsListEntry = (chatroom) => !chatroom ? '' : html`
//         <li class="list-group-item list-group-item-action text-body-secondary fs-6">
//             <div class="w-100 row text-center align-items-center justify-content-between">
//                 ${chatroom.type === 'private' ? html`
//                     ${avatarInfo(chatroom.users.find(u => u.id !== this.session.value.user?.id))}
//                 ` : html`
//                     TOURNAMENT CHAT
//                 `}
//             </div>
//         </li>
//     `
// // this.chatsMap.value.forEach((v, k) => {})
//     renderChatsList = () => !this.chatsMap ? '' : html`
//         <ul class="list-group list-group-flush w-100 h-100 overflow-scroll">
//             ${
//                 Array.from(this.chatsMap.value, ([room_id, data]) => this.renderChatsListEntry(data.messages.room))
                
//             }
//         </ul>
       
//     `
    
//     renderChatContainer = () => html``

//     renderMessageInput = () => html`
//         <input
//             class="form-control form-control-lg"
//             type="text"
//             placeholder="type to chat"
//             aria-label=".form-control-lg example"
//         >
//     `

//     render() {
        
//         messages.sort((a, b) => b.timestamp - a.timestamp)
//         return html`
//             <div class="row g-0 w-100 px-2">
//                 <div class="col-3 card bg-light-subtle" >
//                     ${this.renderChatsList()}
//                 </div>
//                 <div class="col d-flex flex-column">
//                     <div class="flex-grow-1 overflow-scroll" style="${"min-height: 50vh; max-height: 80vh;"}">
//                         ${messages.map(m => this.renderMessage(m))}
//                     </div>
//                     <div class="px-2" >
//                         ${this.renderMessageInput()}
//                     </div>
//                 </div>
//             </div>
//         `
//     }
// }
// customElements.define("chat-view", ChatView);

// const messages = [
//     {
//         avatar: "https://pong42.com/media/avatars/4/avatar_arWZ3MX.png",
//         timestamp: 1722606685079,
//         user_id: 4,
//         username: "melanie",
//         message: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet."
//     },
//     {
//         avatar: "https://pong42.com/media/avatars/10/avatar_kPFjC6m.png",
//         timestamp: 1722606483991,
//         user_id: 1,
//         username: "heylo",
//         message: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam!"
//     },
//     {
//         avatar: "https://pong42.com/media/avatars/10/avatar_kPFjC6m.png",
//         timestamp: 1722605905035,
//         user_id: 1,
//         username: "heylo",
//         message: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo!"
//     },
//     {
//         avatar: "https://pong42.com/media/avatars/4/avatar_arWZ3MX.png",
//         timestamp: 1722605588191,
//         user_id: 4,
//         username: "melanie",
//         message: "HalLorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magnalo!"
//     },
//     {
//         avatar: "https://pong42.com/media/avatars/10/avatar_kPFjC6m.png",
//         timestamp: 1722605571224,
//         user_id: 1,
//         username: "heylo",
//         message: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam!"
//     },
//     {
//         avatar: "https://pong42.com/media/avatars/4/avatar_arWZ3MX.png",
//         timestamp: 1722605484277,
//         user_id: 4,
//         username: "melanie",
//         message: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et!"
//     },
// ]

// // style="${"height: 90vh"}"