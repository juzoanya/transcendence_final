import { ToastNotificationSuccessEvent, ToastNotificationUserEvent } from '../../components/bootstrap/BsToasts.js';
import BaseBase from '../../lib_templ/BaseBase.js';
import PubSub from '../../lib_templ/reactivity/PubSub.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { chatAPI, fetcher, sessionService } from './API.js';
import { ReconnectingSocket } from './Socket.js';

const chatErrors = {
    EMPTY_STRING: "EMPTY_STRING",
    ERROR_GET_MESSAGES: "ERROR_GET_MESSAGES",
    AUTH_ERROR: "AUTH_ERROR",
    ROOM_ACCESS_DENIED: "ROOM_ACCESS_DENIED",
    ACCESS_DENIED: "ACCESS_DENIED",
    ROOM_INVALID: "ROOM_INVALID",
}

const MSG_TYPE_NOTIFICATION_PAGE = 0
const MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED = 1
const MSG_TYPE_NOTIFICATION_TIMESPAN = 2
const MSG_TYPE_NOTIFICATION_NEW = 3
const MSG_TYPE_NOTIFICATION_UNREAD_COUNT = 4
const MSG_TYPE_NOTIFICATION_UPDATED = 5

const MSG_TYPE_CHAT_ROOM_ADD = 100
const MSG_TYPE_CHAT_ROOM_REMOVE = 101
const MSG_TYPE_CHAT_ROOM_UPDATE = 102
const MSG_TYPE_CHAT_MESSAGE_NEW = 104
const MSG_TYPE_CHAT_MESSAGE_UPDATED = 105
const MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 106
const MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 107
const MSG_TYPE_CHAT_MESSAGE_PAGE = 108

const MSG_TYPE_FRIEND_STATUS_CHANGED = 201

const MSG_TYPE_TOURNAMENT_GAME_NEXT = 301
const MSG_TYPE_GAME_START_REQUESTED = 302
const MSG_TYPE_TOURNAMENT_REFRESH = 303

// export class UserStatusChangeEvent extends Event {
//     static type = 'user-status-changed-event';
//     constructor(user_status) {
//         super(UserStatusChangeEvent.type, {bubbles: true});
//         console.log('UserStatusChangeEvent constructor');
        
//         this.user_status = user_status;
//     }
// }

export function detailedTimeAgo(now, timestamp) {
    const secondsPast = Math.floor(now - timestamp);
  
    const days = Math.floor(secondsPast / (3600 * 24));
    const hours = Math.floor((secondsPast % (3600 * 24)) / 3600);
    const minutes = Math.floor((secondsPast % 3600) / 60);
    const seconds = secondsPast % 60;
  
    let result = "";
    if (days > 0) result += `${days} day${days > 1 ? "s" : ""} `;
    if (hours > 0) result += `${hours} hour${hours > 1 ? "s" : ""} `;
    if (minutes > 0) result += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    // if (seconds > 0) result += `${seconds} second${seconds > 1 ? "s" : ""} `;
  
    return result.trim() + " ago";
}


/**
 * @template {MessageSocketTypes.NotificationData | APITypes.ChatMessageData} T
 * @template {APITypes.ChatRoomData} K
 */
export class MessageDataHandle {
    /** 
     * @param {MessageData<T>} msgData
     * @param {K | undefined} [roomInfo]
     */
    constructor(msgData, roomInfo) {
        this.#msgData = msgData;
    }
    #msgData;
    get messages() {
        return this.#msgData.messages;
    }
    get lastReadTimestamp() {
        return this.#msgData.lastReadTimestamp;
    }
    get unreadCount() {
        return this.#msgData.unreadCount;
    }
    get room() {
        return this.#msgData.room;
    }
    get fetchingPage() {
        return this.#msgData.fetchingPage;
    }
}


/**
 * @template {MessageSocketTypes.NotificationData | APITypes.ChatMessageData} T
 * @template {APITypes.ChatRoomData} K
 */
class MessageData {
    /** @param {K | undefined} [roomInfo] */
    constructor(roomInfo) {
        this.#handle = new MessageDataHandle(this, roomInfo);
        this.room = roomInfo;
    }
    room;
    unreadCount = 0;
    lastReadTimestamp = 0;
    lastMessageReceived = 0;
    currentPage = 1;
    /** @type {T[]} */
    messages = [];
    fetchingPage = false;

    #handle;
    getHandle() {
        // return new MessageDataHandle(this);
        return this.#handle;
    }

    /**
     *  data array needs to be in descending order of timestamps
     * @param {T | T[]} data 
     * @param {number} [newPage] 
     */
    addEnd(data, newPage) {
        // console.log('ADD END: ', data, ', current Page: ', this.currentPage, ', new Page: ', newPage);
        // if (newPage !== this.currentPage + 1) return;
        if (newPage !== -1 && data) {
            if (data instanceof Array) {
                for (let i = 0; i < data.length; ++i) {
                    this.messages.push( data[i]);
                }
            } else {
                this.messages.push(data);
            }
        }
        if (typeof newPage === "number")
            this.currentPage = newPage;
    }
    /**
     *  data array needs to be in descending order of timestamps
     * @param {T | T[]} data 
     * @param {number} [newPage] 
     */
    addFront(data, newPage) {
        // console.log('ADD FRONT: ', data, ', current Page: ', this.currentPage, ', new Page: ', newPage);
        // if (newPage === this.currentPage) return;
        if (data && newPage !== -1) {
            if (data instanceof Array) {
                for (let i = data.length - 1; i >= 0; i--) {
                    this.messages.unshift( data[i]);
                }
            } else {
                this.messages.unshift(data);
            }
        }
        if (typeof newPage === "number")
            this.currentPage = newPage;
    }
    /** @param {T} data @param {keyof T} lookup  */
    updateMessage(data, lookup) {
        const i = this.messages.findIndex(i => i[lookup] === data[lookup]);
        // console.log('update message: ', data, ', lookup: ', lookup, ' , index: ', i);
        if (i !== -1) this.messages[i] = data;
    }
    insertMessages() {}
}


//  * @typedef {{room: APITypes.ChatRoomData, messages: MessageData<APITypes.ChatMessageData> , handle: MessageDataHandle<APITypes.ChatMessageData> }} Chat
/**
 * @typedef {object} Chat
 * @property {APITypes.ChatRoomData} room
 * @property {MessageData<APITypes.ChatMessageData>} messages
 */


class ChatMap {
    /** @param {string} sessionUserName  */
    constructor(sessionUserName) {
        this.sessionUserName = sessionUserName;
    }
    sessionUserName;

    /** @param {string} username */
    getRoomForUser = (username) => this.privateChatLookup.get(username);

    /** @param {any} roomIdOrTitle */
    getRoomId = (roomIdOrTitle) => typeof roomIdOrTitle === 'number' ? roomIdOrTitle
        : typeof roomIdOrTitle === 'string' ? this.chatsMapLookup.get(roomIdOrTitle)
        : undefined

    /** @param {APITypes.TournamentData | APITypes.BasicUserData | string | number} data  */
    getChatroomHandle(data) {
        let roomId = this.getRoomId(data);
        // if (typeof roomId === 'number') return this.chatsMap.get(roomId);
        if (typeof roomId === 'number') return this.chatsMap.find(c => c.messages.room?.room_id === roomId);
        if (typeof data !== 'object') return undefined;
        if (typeof data.username === 'string') {
            roomId = this.getRoomId(`${this.sessionUserName}.${data.username}`);
            if (roomId == undefined) roomId = this.getRoomId(`${data.username}.${this.sessionUserName}`);
        } else if (typeof data.name === 'string') {
            roomId = this.getRoomId(data.name);
        }
        if (roomId != undefined)
            // return this.chatsMap.get(roomId);
            return this.chatsMap.find(c => c.messages.room?.room_id === roomId);
    }

    /**
     * @param {number} roomId 
     * @param {number} count
     */
    setUnreadCount(roomId, count) {
        const chat = this.chatsMap.find(c => c.messages.room?.room_id === roomId);
        if (chat && chat.messages.room) {
            chat.messages.room.unread_count = count;
            this.pubsubChat.publish(this.chatsMap);
            this.pubsubChatUnreadAll.publish(this.getChatUnreadAll());
        }
    }

    /**
     * @param {number | string} roomIdOrTitle
     * @param {APITypes.ChatMessageData} message
     * @param {number} unreadcount
     */
    addNewMessageBottom(roomIdOrTitle, message, unreadcount) {
        // console.log('ADD NEW MESSAGE');
        
        const roomId = this.getRoomId(roomIdOrTitle);
        // console.log('ADD NEW MESSAGE: room_id: ', roomId);
        if (typeof roomId === 'number') {
            // console.log('ADD NEW MESSAGE: room_id is number: ');
            // const chat = this.chatsMap.get(roomId);
            const chat = this.chatsMap.find(c => c.messages.room?.room_id === roomId);
            if (chat && chat.messages.room) {
                // console.log('ADD NEW MESSAGE: has chat handle: ');
                chat.messages.addEnd(message);
                // console.log('current unread count: ', chat.messages.room.unread_count);
                // console.log('new unread count: ', unreadcount);
                
                chat.messages.room.unread_count = unreadcount;
                chat.messages.lastMessageReceived = message.timestamp;
                this.sortChatsByLastMessage();
                // if (chat.messages.room?.unread_count != undefined) {
                //     // chat.messages.room.unread_count++;
                // }
                chat.pubsub.publish(chat.messages);
                this.pubsubChat.publish(this.chatsMap);
                this.pubsubChatUnreadAll.publish(this.getChatUnreadAll());
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number | string} roomIdOrTitle
     * @param {APITypes.ChatMessageData[]} messageList
     * @param {number} newPage 
     */
    pushMessagePageToTop(roomIdOrTitle, messageList, newPage) {
        const roomId = this.getRoomId(roomIdOrTitle);
        if (typeof roomId === 'number') {
            // const chat = this.chatsMap.get(roomId);
            const chat = this.chatsMap.find(c => c.messages.room?.room_id === roomId);
            // console.log('ChatMap: pushMessagePageToTop: roomId: ', roomId, ', chat: ', chat);
            
            if (chat) {
                // if (messageList.at(-1)?.username === 'coprea') {
                // }
                // console.log('set data: ', messageList);
                // console.log('last one: ', messageList.at(0));
                // console.log('last one: ', messageList.at(-1));
                
                
                const initial = chat.messages.messages.length === 0;
                // console.log('initial? : ', initial);
                chat.messages.addFront(messageList.reverse());
                chat.messages.currentPage = newPage;
                chat.messages.fetchingPage = false;
                if (initial) {
                    // console.log('is initial: message: ',messageList.at(0));
                    // console.log('is initial: message - stamp: ',messageList.at(0)?.timestamp);
                    
                    chat.messages.lastMessageReceived = messageList.at(-1)?.timestamp ?? 0;
                    // console.log('is initial: message - lastMessageReceived: ',chat.messages.lastMessageReceived);
                }
                this.sortChatsByLastMessage();
                // console.log('ChatMap: pushMessagePageToTop DONE publish: roomId: ', roomId, ', chat: ', chat);
                chat.pubsub.publish(chat.messages);
                this.pubsubChat.publish(this.chatsMap);
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number | string} roomIdOrTitle
     */
    setChatRoomPageExhausted(roomIdOrTitle) {
        const roomId = this.getRoomId(roomIdOrTitle);
        if (typeof roomId === 'number') {
            // const chat = this.chatsMap.get(roomId);
            const chat = this.chatsMap.find(c => c.messages.room?.room_id === roomId);
            if (chat) chat.messages.currentPage = -1;
            return true;
        }
        return false;
    }

    /**
     * @param {number | string} roomIdOrTitle
     * @returns {null | MessageSocketTypes.CommandGetChatMessagesPage | false}
     */
    setFetchNewChatMessagePage(roomIdOrTitle) {
        const roomId = this.getRoomId(roomIdOrTitle);
        if (typeof roomId !== 'number') return false;
            // const chat = this.chatsMap.get(roomId);
            const chat = this.chatsMap.find(c => c.messages.room?.room_id === roomId);
            if (chat == undefined) return false;
            if (chat.messages.fetchingPage == true || chat.messages.currentPage === -1) return null;
            chat.messages.fetchingPage = true;
            return {module: 'chat', command: 'get_chatmessages_page', room_id: roomId, page_number: chat.messages.currentPage};
    }

    getChatUnreadAll() {
        let unread = 0;
        this.chatsMap.forEach((c) => { unread += c.messages.room?.unread_count ?? 0; });
        return unread;
    }

    sortChatsByUnreadCount() {
        this.chatsMap.sort((chatA, chatB) => {
            if (chatA.messages.room && chatB.messages.room && chatA.messages.room.unread_count != undefined && chatB.messages.room.unread_count != undefined)
                return chatB.messages.room.unread_count - chatA.messages.room.unread_count;
            return 0;
        })
    }

    sortChatsByLastMessage() {
        // this.chatsMap.forEach(c => {
        //     console.log(`${c.messages.room?.title} : ${c.messages.lastMessageReceived}`);
        // })
        // console.log('SORT!!!');
        

        this.chatsMap.sort((chatA, chatB) => {
            
            // console.log('');
            // console.log('---')
            // console.log(`${chatA.messages.room?.title} : ${chatA.messages.lastMessageReceived}`);
            // console.log(`${chatB.messages.room?.title} : ${chatB.messages.lastMessageReceived}`);
            
            // console.log(`diff: ${chatB.messages.lastMessageReceived - chatA.messages.lastMessageReceived}`);
            
            return (chatB.messages.lastMessageReceived - chatA.messages.lastMessageReceived);
        })
        // console.log(`!!order`);
        // this.chatsMap.forEach(c => {
        //     console.log(`order: ${c.messages.room?.title}`);
        // })
    }

    /** @param {APITypes.ChatRoomData} chatRoom  */
    addOrUpdateChat(chatRoom) {
        // this.chatsMap.set(chatRoom.room_id, { messages: new MessageData(chatRoom), pubsub: new PubSub() });
        const chatIndex = this.chatsMap.findIndex(c => c.messages.room?.room_id === chatRoom.room_id);
        if (chatIndex !== -1) {
            this.chatsMap[chatIndex] = { messages: new MessageData(chatRoom), pubsub: new PubSub() };
        } else {
            this.chatsMap.push({ messages: new MessageData(chatRoom), pubsub: new PubSub() });
        }
        this.sortChatsByLastMessage();
        
        this.chatsMapLookup.set(chatRoom.title, chatRoom.room_id);
        if (chatRoom.type === 'private') {
            const u = chatRoom.users.find(u => u.username !== this.sessionUserName);
            if (u) this.privateChatLookup.set(u.username, chatRoom.title);
        }
        this.pubsubChat.publish(this.chatsMap);
    }

    /** @param {APITypes.ChatRoomData} chatRoom */
    removeChat(chatRoom) {
        // this.chatsMap.delete(chatRoom.room_id);
        const index = this.chatsMap.findIndex(c => c.messages.room?.room_id === chatRoom.room_id);
        if (index !== -1) this.chatsMap.splice(index, 1);
        this.chatsMapLookup.delete(chatRoom.title);
        if (chatRoom.type === 'private') {
            const u = chatRoom.users.find(u => u.username !== this.sessionUserName);
            if (u) this.privateChatLookup.delete(u.username);
        }
        this.pubsubChat.publish(this.chatsMap);
    }

    /** @param {string} chatRoomName  */
    isValidChatByRoomName(chatRoomName) {
        return this.chatsMapLookup.has(chatRoomName);
    }


    unreadCountAll = 0;

    // /** @type {ChatsMap} */
    // chatsMap = new Map;
    /** @type {ChatData[]} */
    chatsMap = [];
    /** @type {Map<string, number>} */
    chatsMapLookup = new Map();
    // /** @type {PubSub<ChatsMap>} */
    // pubsubChat = new PubSub();
    /** @type {PubSub<ChatData[]>} */
    pubsubChat = new PubSub();
    /** @type {PubSub<number>} */
    pubsubChatUnreadAll = new PubSub();
    /** @type {Map<string, string>} */
    privateChatLookup = new Map();
}


/**
 * @typedef {Map< number, { pubsub: PubSub<MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData>>,  messages: MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData> } >} ChatsMap
 * @typedef {{ pubsub: PubSub<MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData>>,  messages: MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData> }} ChatData
 */

export class GlobalSockHandler {
    /** @param {APITypes.UserData} userData  */
    constructor(userData) {
        this.userData = userData;
        this.#chatsMap = new ChatMap(userData.username);
        this.#notifications = new MessageData();
    }
    #chatsMap;
    #initialized = false;
    /** @type {ReconnectingSocket | undefined} */
    #socket;
    /** @type {MessageData<MessageSocketTypes.NotificationData>} */
    #notifications;

    /** @type {PubSub<MessageDataHandle<MessageSocketTypes.NotificationData> >} */
    #pubsubNotification = new PubSub();
    #pubsubStatus = new PubSub();
    /** @type {PubSub<number>} */
    #pubsubTournaments = new PubSub();


    closeSocket() {
        this.#initialized = false;
        this.#socket?.close();
    }



    async init() {
        this.#notifications = new MessageData();
        console.log('import.meta.env: ', import.meta.env);
        console.log('import.meta.env.VITE_GLOBAL_WEBSOCKET_URL: ', import.meta.env.VITE_GLOBAL_WEBSOCKET_URL);
        
        this.#socket = new ReconnectingSocket(`${import.meta.env.VITE_GLOBAL_WEBSOCKET_URL}`)
        this.#socket.addHandler("initial_connected", () => {
            // console.log('INITIAL CONNECTED');
            this.#initialized = true;
            this.#sendCommand({module: "notification", command: "get_notifications", page_number: this.#notifications.currentPage});
            this.#sendCommand({module: "notification", command: "get_unread_notifications_count"})
            this.#chatsMap.chatsMap.forEach((chat) => {
                // console.log('for room: ', room_id);
                if (!chat.messages.room) return;
                const cmd = this.#chatsMap.setFetchNewChatMessagePage(chat.messages.room?.room_id);
                if (cmd !== null && cmd !== false) {
                    this.#sendCommand(cmd);
                }
            })
            // this.#chatsMap.chatsMap.forEach((v, room_id) => {
            //     // console.log('for room: ', room_id);
                
            //     const cmd = this.#chatsMap.setFetchNewChatMessagePage(room_id);
            //     if (cmd !== null && cmd !== false) {
            //         this.#sendCommand(cmd);
            //     }
            // })
        });
        this.#socket.addHandler('error_json', (e) => {
            // console.log('json error: ', e);
            
        })
        this.#socket.addHandler("message", this.handleSocketMessage);
         /** @type {APITypes.ApiResponse<APITypes.ChatRoomData[]>} */
         const data =  await chatAPI.getChatRooms();
         if (data.success !== true) return;
         /** @type {Promise<APITypes.ApiResponse<APITypes.ChatMessageList>>[]} */
         const chatMessagePromises = [];
         data.data.forEach((room) => {
            //  console.log('room: ', room);
             this.#chatsMap.addOrUpdateChat(room);
         });
    }


    /** @param {MessageSocketTypes.ChatEvents} data */
    handleSocketChatEvent(data) {
        // console.log('handleSocketChatEvent: ', data);
        
        if (data.msg_type ===  MSG_TYPE_CHAT_ROOM_ADD) {
            this.#chatsMap.addOrUpdateChat(data.payload.chat_room);
            this.#sendCommand({module: 'chat', command: 'get_chatmessages_page', room_id: data.payload.chat_room.room_id, page_number: 1});
        } else if (data.msg_type === MSG_TYPE_CHAT_ROOM_REMOVE) {
            this.#chatsMap.removeChat(data.payload.chat_room);
        } else if (data.msg_type === MSG_TYPE_CHAT_ROOM_UPDATE) {
            this.#chatsMap.addOrUpdateChat(data.payload.chat_room);
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_NEW) {
            this.#chatsMap.addNewMessageBottom(data.payload.room_id, data.payload.chat_message, data.payload.count);
            this.#sendCommand({module: 'chat', command: 'get_unread_chatmessages_count', room_id: data.payload.room_id});
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT) {
            // console.log('unread_count_rew: ', data);
            
            this.#chatsMap.setUnreadCount(data.payload.room_id, data.payload.count);
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_PAGE) {
            this.#chatsMap.pushMessagePageToTop(data.payload.room_id, data.payload.chat_messages, data.payload.new_page_number);
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED) {
            this.#chatsMap.setChatRoomPageExhausted(data.payload.room_id);
        }
    }

    /** @param {MessageSocketTypes.NotificationContentTypes} type  */
    updateSessionUserDataByNotificationContentType(type) {
        switch (type) {
            case 'friendlist':
                sessionService.updateData(['user']);
                break;
            case 'friendrequest':
                sessionService.updateData(['friend_requests_received', 'friend_requests_sent'])
                break;
            case 'gamerequest':
                sessionService.updateData(['game_schedule', 'game_invitations_received', 'game_invitations_sent', 'tournaments'])
                break;
            default:
                break;
        }
    }

    /** @param {MessageSocketTypes.NotificationEvents} data */
    handleSocketNotificationEvent(data) {
        if (!this.#initialized) return;
        if(data.msg_type === MSG_TYPE_NOTIFICATION_PAGE) {
            this.#notifications.addEnd(data.payload.notifications, data.payload.new_page_number);
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_NEW) {
            this.#notifications.addFront(data.payload.notification);
            this.#notifications.unreadCount += 1;
            this.updateSessionUserDataByNotificationContentType(data.payload.notification.notification_type)
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED) {
            this.#notifications.currentPage = -1;
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_UNREAD_COUNT) {
            this.#notifications.unreadCount = data.payload.count;
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_UPDATED) {
            this.#notifications.updateMessage(data.payload.notification, 'notification_id');
            this.updateSessionUserDataByNotificationContentType(data.payload.notification.notification_type)
        }
        this.#pubsubNotification.publish(this.#notifications.getHandle())
    }

    /** @param {MessageSocketTypes.MessageSocketEvents} data */
    handleSocketMessage = (data) => {
        if (!this.#initialized) return;
        console.log('new message: ', data);
        if (data.msg_type === MSG_TYPE_FRIEND_STATUS_CHANGED) {
            userStatusMap.set(data.payload.user_id, data.payload.status);
            // console.log('dispatch event: UserStatusChangeEvent');
            
            this.#pubsubStatus.publish(data.payload.status);
        } else if (data.msg_type === MSG_TYPE_TOURNAMENT_GAME_NEXT) {
            // console.log('NEXT TOURNAMENT: ', data.tournament_id);
            document.dispatchEvent(new ToastNotificationSuccessEvent('your next Tournament Game has started'))
        } else if (data.msg_type === MSG_TYPE_TOURNAMENT_REFRESH) {
            console.log('REFRESH TOURNAMENT: ', data.payload.game_id);
            sessionService.updateData(['game_schedule', 'tournaments']).then(() => {
                this.#pubsubTournaments.publish(data.payload.game_id);
            })
        } else if (data.msg_type === MSG_TYPE_GAME_START_REQUESTED) {
            console.log('MSG_TYPE_GAME_START_REQUESTED: ', data.payload.game_id);
            
            const schedule = sessionService.getGameByScheduleId(data.payload.game_id);
            console.log('found schedule: ', schedule);
            
            if (schedule) {
                const user = schedule.player_one.id == this.userData.id ? schedule.player_two : schedule.player_one;
                // document.dispatchEvent(new ToastNotificationSuccessEvent('your next Tournament Game has started'))
                document.dispatchEvent(new ToastNotificationUserEvent(user, 'Start the Match', `/games/pong/play/${schedule.schedule_id}`, schedule, (s) => {
                    console.log('was dismuissed: ', s);
                    this.#sendCommand({module: 'game', command: 'game_dismissed', schedule_id: schedule.schedule_id});
                }));
            }
        } else if (data.module === 'chat') {
            this.handleSocketChatEvent(data)
        } else if (data.module === 'notification') {
            this.handleSocketNotificationEvent(data);
        }
    }

    /** @param {number} [room_id]  */
    getNextMessagePage(room_id) {
        if (!this.#initialized) return;
        if (typeof room_id === 'number') {
            const cmd = this.#chatsMap.setFetchNewChatMessagePage(room_id);
            if (cmd !== null && cmd !== false)
                this.#sendCommand(cmd)
        } else if (this.#notifications.currentPage !== -1 && this.#notifications.fetchingPage === false) {
            this.#notifications.fetchingPage = true;
            this.#sendCommand({module: 'notification', command: "get_notifications", page_number: this.#notifications.currentPage});
            this.#sendCommand({module: 'notification', command: "get_unread_notifications_count"})
        }
    }

    updateNotificationNaturalTime() {
        const now = Date.now() / 1000;
        this.#notifications.messages.forEach((m) => {
            // console.log('prev: ', m.natural_timestamp, ', now: ', detailedTimeAgo(now, m.timestamp));
            m.natural_timestamp = detailedTimeAgo(now, m.timestamp);
        })
        this.#pubsubNotification.publish(this.#notifications.getHandle());
    }

    /** @param {number} timestamp */
    setNotificationsAsReadUntil(timestamp) {
        if (!this.#initialized) return;
        if (typeof timestamp === "number" && !isNaN(timestamp) && timestamp > this.#notifications.lastReadTimestamp) {
            this.#sendCommand({module: 'notification', command: "mark_notifications_read", oldest_timestamp: timestamp});
            this.#notifications.lastReadTimestamp = timestamp;
        }
    }

    markChatMessagesAsRead(room_id) {
        const handle = this.#chatsMap.getChatroomHandle(room_id);
        if (handle && handle.messages.room !== undefined) {
            this.#sendCommand({module: 'chat', command: 'mark_chatmessages_read', 'room_id': handle.messages.room.room_id, oldest_timestamp: 0});
            handle.messages.room.unread_count = 0;
            handle.pubsub.publish(handle.messages);
            this.#chatsMap.pubsubChat.publish(this.#chatsMap.chatsMap);
            return true;
        }
        return false;
    }

    getRoomId = (value) => this.#chatsMap.getRoomId(value);
    
    
    /** @param {string} chatroom_name  */
    isValidChat = (chatroom_name) => this.#chatsMap.isValidChatByRoomName(chatroom_name); 

    /** @param {string} username */
    getChatRoomForUser = (username) => this.#chatsMap.getRoomForUser(username);


    getChatRoomUrl = (username) => true


    /**
     * @param {number} room_id 
     * @param {string} message 
     */
    sendChatMessage(room_id, message) {
        if (this.getRoomId !== undefined)
            this.#sendCommand({module: 'chat', command: 'send_chat_message', room_id, message})
    }


    /** @param {BaseBase} [host] @param {boolean} [force]  */
    subscribeNotifications(host, force) {
        return this.#pubsubNotification.subscribe(this.#notifications.getHandle(), host, force);
    }

    // /** @type {PubSub<ChatsMap>} */
    // #pubsubChat = new PubSub();

    /** @param {BaseBase} [host] @param {boolean} [force] */
    subscribeChats(host, force) {
        return this.#chatsMap.pubsubChat.subscribe(this.#chatsMap.chatsMap, host, force);
        // return this.#pubsubChat.subscribe(this.#chatsMap, host, force);
    }


    /** @param {BaseBase} [host] @param {boolean} [force] */
    subscribeUserStatusChange(host, force) {
        return this.#pubsubStatus.subscribe(undefined, host, force);
    }

    /** @param {BaseBase} [host] @param {boolean} [force] */
    subscribeUnreadChatsAll(host, force) {
        return this.#chatsMap.pubsubChatUnreadAll.subscribe(this.#chatsMap.getChatUnreadAll(), host, force);
    }

    /**
     * @param {APITypes.BasicUserData | APITypes.TournamentData | number} userOrTournament
     * @param {BaseBase} host
     * @param {(msg_type: keyof MessageSocketTypes.ChatEventTypes) => void} callback
     */
    subscribeSingleChat(userOrTournament, host, callback) {
        const handle = this.#chatsMap.getChatroomHandle(userOrTournament);
        // console.log('HANDLE OF ROOM: ', userOrTournament, ': ', handle);
        
        if (handle) return handle.pubsub.subscribe(handle.messages, host, true);
    }

    /** @param {MessageSocketTypes.ChatCommands | MessageSocketTypes.NotificationCommands | MessageSocketTypes.ActionCommands} command */
    #sendCommand = (command) => {
        // console.log('send command socket1');
        if (!this.#initialized) return;
        // console.log('send command socket2');
        
        if (!this.#socket || !this.#socket.isConnected())
            return false;
        // console.log('send command socket3');
        this.#socket.sendMessage(command);
        return true;
    }

    /** @param {(value: number) => void} cb */
    subscribeTournament = (cb) => {
        return this.#pubsubTournaments.subscribe(-1, cb, true);
    }
}

/** @type {Map<number, 'online' | 'offline' | 'none'>} */
export const userStatusMap = new Map();
