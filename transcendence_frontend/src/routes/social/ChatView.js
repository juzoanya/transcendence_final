import { avatarInfo } from '../../components/bootstrap/AvatarComponent.js';
import { renderCard, renderListCard } from '../../components/bootstrap/BsCard.js';
import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
import { ShapeAnimator } from '../../components/AnimL.js';
import { BaseElement, createRef, html, ifDefined, ref } from '../../lib_templ/BaseElement.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { sessionService } from '../../services/api/API.js';
import router from '../../services/router.js';

export default class ChatView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super(false, false);
        this.chatsMap = sessionService.messageSocket?.subscribeChats(this);
        this.session = sessionService.subscribe(this);
        /** @type {import('../../lib_templ/templ/nodes/FuncNode.js').Ref<HTMLElement>} */
        this.inputRef = createRef();
    }

    connectedCallback() {
        super.connectedCallback();
        document.body.classList.add("overflow-hidden");
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.body.classList.remove("overflow-hidden");
    }

    mountChat(params) {
        console.log('mount Chat Params: ', params);
        
        if (params === undefined || !Object.hasOwn(params, 'chatroom_name') || params.chatroom_name === '') return true;
        if (typeof params === 'object' && Object.hasOwn(params, 'chatroom_name') && typeof params.chatroom_name === 'string') {
            const currentChatName = decodeURI(params.chatroom_name);
            this.roomId = sessionService.messageSocket?.getRoomId(currentChatName);
            if (this.roomId != undefined) {
                console.log('OK ROOM: ', this.roomId);
                return true;
            }
        }
        document.dispatchEvent(new ToastNotificationErrorEvent("unknown chat room"))
        return false;
    }

    onBeforeMount(route, params, url) {
        if (!sessionService.isLoggedIn)
            return router.redirect("/");
        if (!this.mountChat(params))
            return router.redirect("/");
    }

    onRouteChange(route, params, url) {
        if (!this.mountChat(params))
            return router.redirect("/");
        super.requestUpdate();
    }


    /** @param {APITypes.ChatRoomData} [chatroom] @param {number} [i] */
    renderChatsListEntry = (chatroom, i) => {
        if (chatroom?.title === 'melanie.greg') {
            console.log('chatroom: unread: ', chatroom?.unread_count);
        }
        // console.log('roomi: ', i);
        // console.log('i: ', i);
        
        return (chatroom == undefined || i == undefined) ? '' : html`
        <a @click=${()=> {
            sessionService.messageSocket?.markChatMessagesAsRead(chatroom.room_id);
        }}
            class="chat-user-list-item list-group-item list-group-item-action text-body-secondary fs-6"
            href="/chat/${encodeURI(chatroom.title)}">
            <div data-selected-chat="${i}" class="w-100 h-100 d-flex align-items-center justify-content-between">
                <div class="">
                    ${chatroom.type === 'private' ? html`
                        ${avatarInfo(chatroom.users.find(u => u.id !== this.session.value?.user?.id), true)}
                    ` : html`
                        T: ${chatroom.title ?? ''}
                    `}
                </div>
                ${!chatroom.unread_count ? '' : html`
                    <span class="badge text-bg-primary rounded-pill px-2">${chatroom.unread_count ?? ''}</span>
                `}
                ${(i === 0 && this.counter !== 0) ? html`
                    <shape-animator
                     .children=${html`<span class="badge text-bg-primary rounded-pill px-2">${this.counter ?? ''}</span>`}
                    ></shape-animator>
                ` : ''}
                <span class="badge text-bg-primary rounded-pill">${this.counter ?? ''}</span>
                
            </div>
        </a>
    `}
    // w-100 d-flex align-items-center justify-content-between
    // badge text-bg-primary rounded-pill
    // badge text-bg-primary px-2 py-1 rounded-5
// this.chatsMap.value.forEach((v, k) => {})
    renderChatsList = () => {
        // if (this.chatsMap) {
        //     const arr = Array.from(this.chatsMap.value)
        //     console.log('number of chats: ', arr.length);
        // }
        

        return !this.chatsMap ? '' : html`
            <div class="card">

                <div @click=${(e) => {
                    if (e instanceof MouseEvent && e.target instanceof HTMLElement && e.currentTarget instanceof HTMLElement) {
                        const allChats = e.currentTarget.querySelectorAll('div[data-selected-chat]');
                        const selected = e.target.closest('div[data-selected-chat]');
                        const currActive = e.currentTarget.querySelector('div[data-selected-chat].active');
                        console.log('allChats: ', allChats);
                        console.log('selected: ', selected);
                        console.log('currActive: ', currActive);
                        if (selected) selected.classList.add('active');
                        if (currActive) currActive.classList.remove('active');
                        if (allChats && selected && currActive) {
                            
                            
                        }
                    }
                }} class="list-group list-group-flush  chat-user-list" style="${"display: block;"}">
                    ${this.chatsMap.value.map((data, i) => this.renderChatsListEntry(data.messages.room, i)) }
                </div>
            </div>
            
    `}
    // ${ Array.from(this.chatsMap.value, ).filter(([k, v]) => v.messages.room?.type !== 'tournament').map(([room_id, data], i) => this.renderChatsListEntry(data.messages.room, i)) }
    // ${ Array.from(this.chatsMap.value, ([room_id, data], i) => this.renderChatsListEntry(data.messages.room, i)) }
    
    counter = 0;
    render() {
        console.log('render chatScreen, roomid: ', this.roomId);
        if (this.roomId == undefined) {
            this.roomId = this.chatsMap?.value[0].messages.room?.room_id;
        }
        
        // return html`
        //     <div class="chat-grid mt-4">
        //         <div class="chat-grid-item-a" style="${"height: 80vh;"}">
        //             ${this.renderChatsList()}
        //         </div>
        //         <div class="chat-grid-item-b" style="${"height: 80vh;"}" >
        //             <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
        //         </div>
        //     </div>
        // `
        // if (this.roomId == undefined)
        //     this.roomId = this.chatsMap?.value.entries().next().value.messages.room.room_id;
        
        return html`
            <bs-button
                ._async_handler=${()=>{
                    this.counter++;
                    super.requestUpdate();
                }}
                text="add count"
                ></bs-button>
                <bs-button
                ._async_handler=${()=>{
                    this.counter--;
                    super.requestUpdate();
                }}
                text="reduce count"
            ></bs-button>
            <div class="row g-0 w-100 px-2 mt-4">
                <div class="col-3 bg-light-subtle">
                    ${this.renderChatsList()}
                </div>
                <div class="col d-flex flex-column" >
                    <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
                </div>
            </div>
        `
        // return html`
        //     <div class="row g-0 w-100 px-2">
        //         <div class="col-3 card bg-light-subtle" >
        //             ${this.renderChatsList()}
        //         </div>
        //         <div class="col d-flex flex-column" style="${"height: 70vh"}">
        //             <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
        //         </div>
        //     </div>
        // `
    }
}
customElements.define("chat-view", ChatView);
