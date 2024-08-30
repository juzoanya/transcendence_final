import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API.js';
import { actions, actionButtonDropdowns, actionButtonGroups } from '../../components/ActionButtons.js';
import router from '../../services/router.js';
import { avatarInfo, avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';

/**
 * @typedef {"fv$chats" | "fv$friends" | "fv$rec" | "fv$sent" | "fv$blocked"} ListType
 */

/**
 * @typedef {APITypes.BlockedUserData[] | APITypes.FriendUserData[] | APITypes.FriendRequestItem[]} SocialUserDataList
 */
/**
 * @typedef {APITypes.BlockedUserData | APITypes.FriendUserData | APITypes.FriendRequestItem} SocialUserData
 */

export default class FriendsView extends BaseElement {

    /** @type {Map<ListType, { title: string, getList: () => APITypes.BlockedUserData[] | APITypes.FriendUserData[] | APITypes.FriendRequestItem[] | undefined }>} */
    #listsMap = new Map([
        [ "fv$friends", { title: 'All Friends', getList: () => this.sessionUser.value?.user?.friends } ],
        [ "fv$rec", { title: 'Incoming Requests', getList: () => this.sessionUser.value?.friend_requests_received } ],
        [ "fv$sent", { title: 'Outgoing Requests', getList: () => this.sessionUser.value?.friend_requests_sent } ],
        [ "fv$blocked", { title: 'Blocked Users', getList: () => this.sessionUser.value?.user?.blocked } ],
    ]);

    /** @type {ListType} */
    #lCurr = "fv$friends"

    constructor() {
        super(false, false);
        // /** @type {Array<APITypes.UserData> | string | undefined} */
        // this.userData = 'inptEmpty';

        this.sessionUser = sessionService.subscribe(this, true);
        this.unreadCountAll = sessionService.messageSocket?.subscribeUnreadChatsAll(this);
        this.chatsMap = sessionService.messageSocket?.subscribeChats(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.body.classList.add("overflow-hidden");
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.body.classList.remove("overflow-hidden");
    }

    // mountChat(params) {
    //     console.log('mount Chat Params: ', params);
        
    //     if (params === undefined || !Object.hasOwn(params, 'chatroom_name') || params.chatroom_name === '') return true;
    //     if (typeof params === 'object' && Object.hasOwn(params, 'chatroom_name') && typeof params.chatroom_name === 'string') {
    //         const currentChatName = decodeURI(params.chatroom_name);
    //         this.roomId = sessionService.messageSocket?.getRoomId(currentChatName);
    //         if (this.roomId != undefined) {
    //             console.log('OK ROOM: ', this.roomId);
    //             return true;
    //         }
    //     }
        
    //     document.dispatchEvent(new ToastNotificationErrorEvent("unknown chat room"))
    //     return false;
    // }


    /**
     * @param {string} route 
     * @param {{subpage?: string, chatroom_name?: string} | undefined} params 
     */
    selectRoute(route, params) {
        console.log('selectRoute');
        console.log('route: ', route);
        console.log('params: ', params);
        
        if (route === '/social') {
            this.#lCurr = 'fv$friends';
        } else if (route === '/social/chat') {
            this.#lCurr = 'fv$chats';
        } else if (route === '/social/requests-received') {
            this.#lCurr = "fv$rec";
        } else if (route === '/social/requests-sent') {
            this.#lCurr = "fv$sent";
        } else if (route === '/social/blocked-users') {
            this.#lCurr = "fv$blocked";
        } else if (route.slice(0, 12) === '/social/chat') {
            this.#lCurr = 'fv$chats';
            this.roomId = sessionService.messageSocket?.getRoomId(params?.chatroom_name);
            if (this.roomId == undefined) {
                document.dispatchEvent(new ToastNotificationErrorEvent("unknown chat room"))
                return false;
            }
        } else {
            return false;
        }
        return true;
    }

    /**
     * @param {string} route
     * @returns {symbol | void}
     */
    onBeforeMount(route, params) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        if (!this.selectRoute(route, params)) {
            console.log('this.selectRoute: false');
            
            return router.redirect("/");
        }
    }

    onRouteChange(route, params) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        if (!this.selectRoute(route, params)) {
            return router.redirect("/");
        }
        super.requestUpdate();
    }

    /**
     * @param {APITypes.FriendRequestItem} data 
     * @returns 
     */
    getFriendRequestAction = (data) => {
        
    }


    /**
     * @param {SocialUserData} data 
     * @returns 
     */
    getUserBtn = (data) => {
        if (this.#lCurr === "fv$rec" && 'request_id' in data && typeof data.request_id === "number")
            return actionButtonGroups.receivedFriendInvitation(data.request_id, true);
        if (this.#lCurr === "fv$sent"  && 'request_id' in data && typeof data.request_id === "number")
            return actions.cancelFriendRequest(data.request_id, { host: this, showText: true } );
        if (this.#lCurr === "fv$blocked")
            return actions.unBlockUser(data.id, { host: this });
        
        if (this.#lCurr === "fv$friends")
            return html`
                <div class="d-flex" >
                    ${sessionService.canSend1vs1GameInvitation(data.id) === false ? '' :
                        actions.sendGameInvitation(data.id, { host: this, showText: false })}
                    <a class="btn btn-primary mx-2" role="button"
                        href="/social/chat/${encodeURI(sessionService.messageSocket?.getChatRoomForUser(data.username) ?? '')}" >
                        <i class="fa-solid fa-paper-plane"></i>
                    </a>
                    ${actionButtonDropdowns.friendActions(data.id)}
                </div>
            `;
    };

    buttonGroupSelectHandler(e) {
        const ct = e.currentTarget;
        let t = e.target;
        if (ct === t) return;
        if (t.tagName === 'I') t = t.parentElement;
        if (this.#lCurr === t.dataset.list) {
            // sessionService.updateData(["all"]);
        } else {
            this.#lCurr = t.dataset.list;
            if (this.#lCurr === "fv$friends")
                router.go('/social');
            else if (this.#lCurr === "fv$rec")
                router.go('/social/requests-received');
            else if (this.#lCurr === "fv$sent")
                router.go('/social/requests-sent');
            else if (this.#lCurr === "fv$blocked")
                router.go('/social/blocked-users');
        }
    }

    /**
     * @param {SocialUserData} userData
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    renderFriendlistEntry = (userData) => {
        // <li class="list-group-item text-body-secondary fs-6">
        return html`
                <div class="p-3 w-100 d-flex align-items-center justify-content-between">
                    <div class="text-start">
                        ${avatarLink(userData, true)}
                    </div>
                    <div class="p-0">
                        ${this.getUserBtn(userData)}
                    </div>
                </div>
                `;
            // </li>
    };

    /**
     * 
     * @param {ListType} listType 
     * @param {string} icon 
     * @param {string} text 
     * @param {boolean} [isActive] 
     * @returns 
     */
    getTabBtn = (listType, icon, text, isActive) => {
        return html`
            <button
                data-list="${listType}"
                type="button"
                class="btn btn-outline-dark rounded-5 mx-1
                    ${(this.#lCurr === listType || isActive) ? 'active' : ''}"
            >
                <i class="fa-solid ${icon} me-2"></i>${text}
            </button>
    `};

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
            class="chat-user-list-item list-group-item  list-group-item-action text-body-secondary fs-6"
            href="/social/chat/${encodeURI(chatroom.title)}">
            <div data-selected-chat="${i}" class="w-100 h-100 d-flex align-items-center justify-content-between">
                <div class="">
                    ${chatroom.type === 'private' ? html`
                        ${avatarInfo(chatroom.users.find(u => u.id !== this.sessionUser.value?.user?.id), true)}
                    ` : html`
                        T: ${chatroom.title ?? ''}
                    `}
                </div>
                ${!chatroom.unread_count ? '' : html`
                    <span class="badge text-bg-primary rounded-pill px-2">${chatroom.unread_count ?? ''}</span>
                `}
            </div>
        </a>
    `}

    renderChatsList = () => {
        
        // return html`
        //     <list-group
        //     animatelist
        //         .rendercb=${(data, i) => {
        //             console.log('data: ', data);
                    
        //             return this.renderChatsListEntry(data.messages.room, i)
        //         }}
        //         .items=${this.chatsMap?.value}
        //     >
        //     </list-group>
        // `

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
        `
    }

    renderFriendsAndRequests = () => {
        const listO = this.#listsMap.get(this.#lCurr);
        const list = listO?.getList();
        
        return html`
            <div class="overflow-y-scroll h-100">

                <div
                    @click=${this.buttonGroupSelectHandler.bind(this)}
                    class="btn-group w-100  z-2"
                    role="group"
                    aria-label="Basic outlined example"
                >
                    ${ this.getTabBtn( 'fv$friends', 'fa-user-check', 'Friends' ) }
                    ${ this.getTabBtn( 'fv$rec', 'fa-user-plus', 'Requests', this.#lCurr === "fv$rec" || this.#lCurr === "fv$sent" ) }
                    ${ this.getTabBtn( 'fv$blocked', 'fa-ban', 'Blocked' ) }
                </div>
                <div class="mt-3">
                    ${!(this.#lCurr === "fv$rec" || this.#lCurr === "fv$sent") ? '' : html`
                        <div
                            @click=${(e) => {this.buttonGroupSelectHandler(e)}}
                            class="btn-group w-100  z-2"
                            role="group"
                            aria-label="Basic outlined example"
                        >
                            ${ this.getTabBtn( 'fv$rec', 'fa-envelope', 'received' ) }
                            ${ this.getTabBtn( 'fv$sent', 'fa-paper-plane', 'sent' ) }
                        </div>
                    `}
                    ${!listO ? '' : html`
                        <div>
                            <h5 class="mt-3 mb-2">${listO.title}</h5>
                            ${!list || list.length === 0 ? 'Empty' : html`
                                    <list-group
                                        .rendercb=${this.renderFriendlistEntry.bind(this)}
                                        .items=${list}
                                    ></list-group>
                                    
                            `}
                        </div>
                    `}
                </div>
            </div>
    `}
// <ul class="list-group w-100">
//     ${ list.map( (data) => this.renderFriendlistEntry(data) ) }
// </ul>
    render() {
        
        let noChats = false;
        if (this.roomId == undefined) {
            const upperChat = this.chatsMap?.value[0];
            if (!upperChat) {
                noChats = true;
            }
            this.roomId = upperChat?.messages.room?.room_id;
        }
        return html`
            <div >
                
                
                <div class="row g-0 w-100 px-2 mt-2">
                    <div class="col-3 text-truncate">
                        <a style="${"height: 3em;"}" class="align-center btn btn-primary w-100 mb-2" href="/social" role="button">
                            <i class="fa-solid fa-users"></i>
                            Friends
                        </a>
                        ${this.renderChatsList()}
                    </div>
                    <div class="col mx-2 d-flex flex-column" >
                        <div class="mb-2">
                            <profile-search followlink ></profile-search>
                        </div>
                        ${this.#lCurr === 'fv$chats' ? html`
                            <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
                        ` : this.renderFriendsAndRequests()}
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('friends-view', FriendsView);

// /**
//  * @typedef {"fv$friends" | "fv$rec" | "fv$sent" | "fv$blocked"} ListType
//  */

// /**
//  * @typedef {APITypes.BlockedUserData[] | APITypes.FriendUserData[] | APITypes.FriendRequestItem[]} SocialUserDataList
//  */
// /**
//  * @typedef {APITypes.BlockedUserData | APITypes.FriendUserData | APITypes.FriendRequestItem} SocialUserData
//  */

// export default class FriendsView extends BaseElement {

//     /** @type {Map<ListType, { title: string, getList: () => APITypes.BlockedUserData[] | APITypes.FriendUserData[] | APITypes.FriendRequestItem[] | undefined }>} */
//     #listsMap = new Map([
//         [ "fv$friends", { title: 'All Friends', getList: () => this.sessionUser.value?.user?.friends } ],
//         [ "fv$rec", { title: 'Incoming Requests', getList: () => this.sessionUser.value?.friend_requests_received } ],
//         [ "fv$sent", { title: 'Outgoing Requests', getList: () => this.sessionUser.value?.friend_requests_sent } ],
//         [ "fv$blocked", { title: 'Blocked Users', getList: () => this.sessionUser.value?.user?.blocked } ],
//     ]);

//     /** @type {ListType} */
//     #lCurr = "fv$friends"

//     constructor() {
//         super(false, false);
//         // /** @type {Array<APITypes.UserData> | string | undefined} */
//         // this.userData = 'inptEmpty';

//         this.sessionUser = sessionService.subscribe(this, true);
//         this.unreadCountAll = sessionService.messageSocket?.subscribeUnreadChatsAll(this);
//     }

//     /**
//      * @param {string} route
//      * @returns {symbol | void}
//      */
//     onBeforeMount(route) {
//         if (!sessionService.isLoggedIn) {
//             return router.redirect('/');
//         }
//         console.log('route: friendsview: ', route);
        
//         if (route === '/social')
//             return router.redirect('/social/friends');
//         // sessionService.updateData(["all"]);
//         this.selectRoute(route);
//         return undefined;
//     }

//     onRouteChange(route) {
//         this.selectRoute(route);
//         super.requestUpdate();
//     }

//     selectRoute(route) {
//         if (route === '/social/friends')
//             this.#lCurr = "fv$friends";
//         else if (route === '/social/requests-received')
//             this.#lCurr = "fv$rec";
//         else if (route === '/social/requests-sent')
//             this.#lCurr = "fv$sent";
//         else if (route === '/social/blocked-users')
//             this.#lCurr = "fv$blocked";
//     }

//     /**
//      * @param {APITypes.FriendRequestItem} data 
//      * @returns 
//      */
//     getFriendRequestAction = (data) => {
        
//     }


//     /**
//      * @param {SocialUserData} data 
//      * @returns 
//      */
//     getUserBtn = (data) => {
//         // console.log('sent 1vs1 game invitations: ', sessionService.getSentGameInvitations(data.id, "1vs1"));
//         // console.log('sent all game invitations: ', sessionService.getSentGameInvitations(data.id, "all"));
//         // console.log('sent tournament game invitations: ', sessionService.getSentGameInvitations(data.id, "tournament"));
//         // console.log('received 1vs1 game invitations: ', sessionService.getReceivedGameInvitations(data.id, "1vs1"));
//         // console.log('received all game invitations: ', sessionService.getReceivedGameInvitations(data.id, "all"));
//         // console.log('received tournament game invitations: ', sessionService.getReceivedGameInvitations(data.id, "tournament"));
//         if (this.#lCurr === "fv$rec" && 'request_id' in data && typeof data.request_id === "number")
//             return html`
//                 <div class="d-flex">
//                     ${actions.acceptFriendRequest(data.request_id, { host: this, showText: false } ) }
//                     ${actions.rejectFriendRequest(data.request_id, { host: this, showText: false } ) }
//                 </div>
//             `;
//         if (this.#lCurr === "fv$sent"  && 'request_id' in data && typeof data.request_id === "number")
//             return actions.cancelFriendRequest(data.request_id, { host: this, showText: true } );
//         if (this.#lCurr === "fv$blocked")
//             return actions.unBlockUser(data.id, { host: this });
        
//         if (this.#lCurr === "fv$friends")
//             return html`
//                 <div class="d-flex" >
//                     ${sessionService.canSend1vs1GameInvitation(data.id) === false ? '' :
//                         actions.sendGameInvitation(data.id, { host: this, showText: false })}
//                     <a class="btn btn-primary mx-2" role="button"
//                         href="/chat/${encodeURI(sessionService.messageSocket?.getChatRoomForUser(data.username) ?? '')}" >
//                         <i class="fa-solid fa-paper-plane"></i>
//                     </a>
//                     ${actionButtonDropdowns.friendActions(data.id)}
//                 </div>
//             `;
//     };

//     buttonGroupSelectHandler(e) {
//         const ct = e.currentTarget;
//         let t = e.target;
//         if (ct === t) return;
//         if (t.tagName === 'I') t = t.parentElement;
//         if (this.#lCurr === t.dataset.list) {
//             // sessionService.updateData(["all"]);
//         } else {
//             this.#lCurr = t.dataset.list;
//             if (this.#lCurr === "fv$friends")
//                 router.go('/social/friends');
//             else if (this.#lCurr === "fv$rec")
//                 router.go('/social/requests-received');
//             else if (this.#lCurr === "fv$sent")
//                 router.go('/social/requests-sent');
//             else if (this.#lCurr === "fv$blocked")
//                 router.go('/social/blocked-users');
//         }
//     }

//     /**
//      * @param {SocialUserData} userData
//      * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     renderFriendlistEntry = (userData) => {
//         return html`
//             <li class="list-group-item text-body-secondary fs-6">
//                 <div class="w-100 d-flex align-items-center justify-content-between">
//                     <div class=" p-0 m-2">
//                         ${avatarLink(userData, true)}
//                     </div>
//                     <div class="p-0">
//                         ${this.getUserBtn(userData)}
//                     </div>
//                 </div>
//             </li>
//         `;
//     };

//     /**
//      * 
//      * @param {ListType} listType 
//      * @param {string} icon 
//      * @param {string} text 
//      * @param {boolean} [isActive] 
//      * @returns 
//      */
//     getTabBtn = (listType, icon, text, isActive) => {
//         return html`
//             <button
//                 data-list="${listType}"
//                 type="button"
//                 class="btn btn-outline-dark rounded-5 mx-1
//                     ${(this.#lCurr === listType || isActive) ? 'active' : ''}"
//             >
//                 <i class="fa-solid ${icon} me-2"></i>${text}
//             </button>
//     `};

//     render() {
//         // console.log('RENDER FRIENDSLIST MAINN');

//         const listO = this.#listsMap.get(this.#lCurr);
//         const list = listO?.getList();

//         return html`
//             <div class="container p-3 h-100">
//                 <div class="container">
//                     <profile-search followlink ></profile-search>
//                 </div>
//                 <br />
//                 <a class="btn btn-primary mb-2 w-100" href="/chat" role="button">
//                     <i class="fa-solid fa-gamepad"></i>
//                     Chats
//                     ${this.unreadCountAll?.value ? html `
//                         <span class="badge rounded-pill bg-danger px-2">
//                             ${this.unreadCountAll?.value}
//                             <span class="visually-hidden">unread messages</span>
//                         </span>
//                     ` : ''}
//                 </a>
//                 <div
//                     @click=${this.buttonGroupSelectHandler.bind(this)}
//                     class="btn-group w-100  z-2"
//                     role="group"
//                     aria-label="Basic outlined example"
//                 >
//                     ${ this.getTabBtn( 'fv$friends', 'fa-user-check', 'Friends' ) }
//                     ${ this.getTabBtn( 'fv$rec', 'fa-user-plus', 'Requests', this.#lCurr === "fv$rec" || this.#lCurr === "fv$sent" ) }
//                     ${ this.getTabBtn( 'fv$blocked', 'fa-ban', 'Blocked' ) }
//                 </div>

//                 <div class="mt-3">
//                     ${html`
//                         <div>
//                             ${!(this.#lCurr === "fv$rec" || this.#lCurr === "fv$sent") ? '' : html`
//                                 <div
//                                     @click=${(e) => {this.buttonGroupSelectHandler(e)}}
//                                     class="btn-group w-100  z-2"
//                                     role="group"
//                                     aria-label="Basic outlined example"
//                                 >
//                                     ${ this.getTabBtn( 'fv$rec', 'fa-envelope', 'received' ) }
//                                     ${ this.getTabBtn( 'fv$sent', 'fa-paper-plane', 'sent' ) }
//                                 </div>
//                             `}
//                             ${!listO ? '' : html`
//                                 <div>
//                                     <h5 class="mt-3 mb-2">${listO.title}</h5>
//                                     ${!list || list.length === 0 ? 'Empty' : html`
//                                             <ul class="list-group w-100">
//                                                 ${ list.map( (data) => this.renderFriendlistEntry(data) ) }
//                                             </ul>
//                                     `}
//                                 </div>
//                             `}
//                         </div>
//                     `}
//                 </div>
//             </div>
//         `;
//     }
// }
// customElements.define('friends-view', FriendsView);
