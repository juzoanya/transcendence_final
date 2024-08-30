
declare namespace MessageSocketTypes {
    export type NotificationContentTypes = 'friendrequest' | 'friendlist' | 'gamerequest';

    export type ModuleType = 'notification' | 'chat';

    export interface ModuleNotification {
        module: 'notification';
    }
    export interface ModuleChat {
        module: 'chat';
    }


    export interface GetGeneralNotifications extends ModuleNotification {
        command: 'get_notifications';
        page_number: number;
    }
    export interface GetUnreadNotificationCount extends ModuleNotification {
        command: 'get_unread_notifications_count';
    }
    export interface MarkAllNotificationsAsRead extends ModuleNotification {
        command: 'mark_notifications_read';
        oldest_timestamp: number;
    }
    export type NotificationCommands =
        | GetGeneralNotifications
        | GetUnreadNotificationCount
        | MarkAllNotificationsAsRead;


    export interface NotificationData {
        notification_type: NotificationContentTypes;
        notification_id: number;
        description: string;
        action_id: number;
        is_active: boolean;
        is_read: number;
        natural_timestamp: string;
        timestamp: number;
        actions: {
            redirect_url: string;
        };
        user: APITypes.BasicUserData;
    }

    export enum NotificationMessageTypes {
        MSG_TYPE_NOTIFICATIONS_DATA = 0, // New 'general' notifications data payload incoming
        MSG_TYPE_PAGINATION_EXHAUSTED = 1, // No more 'general' notifications to retrieve
        MSG_TYPE_NEW_NOTIFICATION = 3,
        MSG_TYPE_UNREAD_NOTIFICATIONS_COUNT = 4, // Send the number of unread "general" notifications to the template
        MSG_TYPE_UPDATED_NOTIFICATION = 5
    }


    export interface NotificationsList extends ModuleNotification {
        msg_type: NotificationMessageTypes.MSG_TYPE_NOTIFICATIONS_DATA;
        payload: {
            notifications: NotificationData[];
            new_page_number: number;
        };
    }
    export interface NewNotification extends ModuleNotification {
        msg_type: NotificationMessageTypes.MSG_TYPE_NEW_NOTIFICATION;
        payload: {
            notification: NotificationData;
            count: number;
        };
    }
    export interface NotificationUpdate extends ModuleNotification {
        msg_type: NotificationMessageTypes.MSG_TYPE_UPDATED_NOTIFICATION;
        payload: {
            notification: NotificationData;
        };
    }
    export interface PaginationExhausted extends ModuleNotification {
        msg_type: NotificationMessageTypes.MSG_TYPE_PAGINATION_EXHAUSTED;
        payload: null;
    }
    export interface NotificationCount extends ModuleNotification {
        msg_type: NotificationMessageTypes.MSG_TYPE_UNREAD_NOTIFICATIONS_COUNT;
        payload: {
            count: number;
        };
    }
    export type NotificationEvents = NotificationsList
        | NewNotification
        | NotificationUpdate
        | NotificationCount
        | PaginationExhausted;

    export type NotificationEventMsgType = NotificationEvents['msg_type'];

    export interface CommandSendChatMessage extends ModuleChat {
        command: 'send_chat_message';
        room_id: number;
        message: string;
    }
    export interface CommandGetChatMessagesPage extends ModuleChat {
        command: 'get_chatmessages_page';
        room_id: number;
        page_number: number;
    }
    export interface CommandGetChatMessagesTimespen extends ModuleChat {
        command: 'get_chatmessages_timespan';
        room_id: number;
        oldest_timestamp: number;
        newest_timestamp: number;
    }
    export interface CommandGetUnreadChatMessagesCount extends ModuleChat {
        command: 'get_unread_chatmessages_count';
        room_id: number;
    }
    export interface CommandMarkAllChatMessages extends ModuleChat {
        command: 'mark_chatmessages_read';
        room_id: number;
        oldest_timestamp: number;
    }
    export type ChatCommands =
        | CommandSendChatMessage
        | CommandGetChatMessagesPage
        | CommandGetChatMessagesTimespen
        | CommandGetUnreadChatMessagesCount
        | CommandMarkAllChatMessages;

    export enum ChatEventTypes {
        MSG_TYPE_CHAT_ROOM_ADD = 100,
        MSG_TYPE_CHAT_ROOM_REMOVE = 101,
        MSG_TYPE_CHAT_ROOM_UPDATE = 102,

        MSG_TYPE_CHAT_MESSAGE_NEW = 104,
        MSG_TYPE_CHAT_MESSAGE_UPDATED = 105,
        MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 106,
        MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 107,
        MSG_TYPE_CHAT_MESSAGE_PAGE = 108,
    }


    export interface EventChatMessageNew extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_MESSAGE_NEW;
        payload: {
            room_id: number;
            chat_message: APITypes.ChatMessageData;
            count: number;
        };
    }
    export interface EventChatRoomAdd extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_ROOM_ADD;
        payload: {
            chat_room: APITypes.ChatRoomData;
        };
    }
    export interface EventChatRoomRemove extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_ROOM_REMOVE;
        payload: {
            chat_room: APITypes.ChatRoomData;
        };
    }
    export interface EventChatRoomUpdate extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_ROOM_UPDATE;
        payload: {
            chat_room: APITypes.ChatRoomData;
        };
    }

    export interface EventChatMessageList extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_MESSAGE_PAGE;
        payload: {
            room_id: number;
            chat_messages: APITypes.ChatMessageData[];
            new_page_number: number;
        };
    }
    export interface EventChatMessageUpdate extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_MESSAGE_UPDATED;
        payload: {
            room_id: number;
            chat_message: APITypes.ChatMessageData;
        };
    }
    export interface EventChatMessagePaginationExhausted extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED;
        payload: {
            room_id: number;
        };
    }
    export interface EventChatMessageUnreadCount extends ModuleChat {
        msg_type: ChatEventTypes.MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT;
        payload: {
            room_id: number;
            count: number;
        };
    }
    export type ChatEvents =
        | EventChatMessageNew
        | EventChatRoomAdd
        | EventChatRoomRemove
        | EventChatRoomUpdate
        | EventChatMessageList
        | EventChatMessageUpdate
        | EventChatMessagePaginationExhausted
        | EventChatMessageUnreadCount;

    export type ChatEventMsgType = ChatEvents['msg_type'];

    export interface GameCommand {
        module: 'game';
        command: 'game_dismissed';
        schedule_id: number;
    }

    export type ActionCommands =
            | GameCommand

    export enum ActionTypes {
        MSG_TYPE_FRIEND_STATUS_CHANGED = 201,
        MSG_TYPE_TOURNAMENT_GAME_NEXT = 301,
        MSG_TYPE_GAME_START_REQUESTED = 302,
        MSG_TYPE_TOURNAMENT_REFRESH = 303,
    }

    
    export interface GameMessage {
        module: 'game';
        msg_type: ActionTypes.MSG_TYPE_GAME_START_REQUESTED | ActionTypes.MSG_TYPE_TOURNAMENT_GAME_NEXT | ActionTypes.MSG_TYPE_TOURNAMENT_REFRESH;
        payload: {
            game_id: number;
        }
    }
    export interface FriendStatusChanged {
        module: 'friend';
        msg_type: ActionTypes.MSG_TYPE_FRIEND_STATUS_CHANGED;
        payload: {
            user_id: number;
            status: 'online' | 'offline';
        };
    }

    export type ActionEvents =
        | FriendStatusChanged
        | GameMessage

    export type MessageSocketEvents = ChatEvents | NotificationEvents | ActionEvents;
}
// export enum NotificationMessageTypes {
//     MSG_TYPE_NOTIFICATIONS_DATA = 'MSG_TYPE_NOTIFICATIONS_DATA', // New 'general' notifications data payload incoming
//     MSG_TYPE_PAGINATION_EXHAUSTED = 'MSG_TYPE_PAGINATION_EXHAUSTED', // No more 'general' notifications to retrieve
//     MSG_TYPE_NEW_NOTIFICATION = 'MSG_TYPE_NEW_NOTIFICATION',
//     MSG_TYPE_UNREAD_NOTIFICATIONS_COUNT = 'MSG_TYPE_UNREAD_NOTIFICATIONS_COUNT', // Send the number of unread "general" notifications to the template
//     MSG_TYPE_UPDATED_NOTIFICATION = 'MSG_TYPE_UPDATED_NOTIFICATION'
// }
// export enum ChatEventTypes {
//     MSG_TYPE_CHAT_ROOM_ADD = 'MSG_TYPE_CHAT_ROOM_ADD',
//     MSG_TYPE_CHAT_ROOM_REMOVE = 'MSG_TYPE_CHAT_ROOM_REMOVE',
//     MSG_TYPE_CHAT_USER_ADD = 'MSG_TYPE_CHAT_USER_ADD',
//     MSG_TYPE_CHAT_USER_REMOVE = 'MSG_TYPE_CHAT_USER_REMOVE',
//     MSG_TYPE_CHAT_MESSAGE_NEW = 'MSG_TYPE_CHAT_MESSAGE_NEW',
//     MSG_TYPE_CHAT_MESSAGE_UPDATED = 'MSG_TYPE_CHAT_MESSAGE_UPDATED',
//     MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 'MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT',
//     MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 'MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED',
//     MSG_TYPE_CHAT_MESSAGE_PAGE = 'MSG_TYPE_CHAT_MESSAGE_PAGE',
// }


// declare namespace NotificationTypes {
//     export interface AcceptFriendRequest {
//         command: 'accept_friend_request';
//         notification_id: number;
//     }
//     export interface RejectFriendRequest {
//         command: 'reject_friend_request';
//         notification_id: number;
//     }
//     export interface AcceptGameInvitation {
//         command: 'accept_game_invitation';
//         notification_id: number;
//     }
//     export interface RejectGameInvitation {
//         command: 'reject_game_invitation';
//         notification_id: number;
//     }
//     export interface GetGeneralNotifications {
//         command: 'get_notifications';
//         page_number: number;
//     }
//     export interface GetNewGeneralNotifications {
//         command: 'get_new_notifications';
//         newest_timestamp: number;
//     }
//     export interface RefreshGeneralNotifications {
//         command: 'refresh_notifications';
//         oldest_timestamp: number;
//         newest_timestamp: number;
//     }
//     export interface GetUnreadNotificationCount {
//         command: 'get_unread_notifications_count';
//     }
//     export interface MarkAllNotificationsAsRead {
//         command: 'mark_notifications_read';
//         oldest_timestamp: number;
//     }
//     export type NotificationCommand =
//         | AcceptFriendRequest
//         | RejectFriendRequest
//         | AcceptGameInvitation
//         | RejectGameInvitation
//         | GetGeneralNotifications
//         | GetNewGeneralNotifications
//         | RefreshGeneralNotifications
//         | GetUnreadNotificationCount
//         | MarkAllNotificationsAsRead;

//     // export interface NotificationData {
//     //     notification_type: string;
//     //     notification_id: number;
//     //     description: string;
//     //     is_active?: boolean;
//     //     is_read: number;
//     //     natural_timestamp: number;
//     //     timestamp: number;
//     //     actions: {
//     //         redirect_url: string;
//     //     };
//     //     from: {
//     //         image_url: string;
//     //     };
//     // }
//     export interface NotificationData {
//         notification_type: string;
//         notification_id: number;
//         description: string;
//         action_id: number;
//         is_active: boolean;
//         is_read: number;
//         natural_timestamp: number;
//         timestamp: number;
//         actions: {
//             redirect_url: string;
//         };
//         user: APITypes.BasicUserData;
//     }

//     export interface GetChatConversations {
//         command: 'chat.get_chat_conversations';
//         page: number;
//     }
// }

// declare namespace NotificationMessageTypes {
//     // eslint-disable-next-line no-shadow
//     export enum NotificationMessageEnum {
//         MSG_TYPE_NOTIFICATIONS_DATA = 0, // New 'general' notifications data payload incoming
//         MSG_TYPE_PAGINATION_EXHAUSTED = 1, // No more 'general' notifications to retrieve
//         MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = 4, // Send the number of unread "general" notifications to the template
//     }
//     // MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = 2, // Retrieved all 'general' notifications newer than the oldest visible on screen
//     // MSG_TYPE_GET_NEW_NOTIFICATIONS = 3, // Get any new notifications
//     // MSG_TYPE_UPDATED_NOTIFICATION = 5, // Update a notification that has been altered

//     export interface NotificationsList {
//         msg_type: NotificationMessageEnum.MSG_TYPE_NOTIFICATIONS_DATA;
//         notifications: NotificationTypes.NotificationData[];
//         new_page_number: number;
//     }
//     export interface PaginationExhausted {
//         msg_type: NotificationMessageEnum.MSG_TYPE_PAGINATION_EXHAUSTED;
//     }
//     export interface NotificationCount {
//         msg_type: NotificationMessageEnum.MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT;
//         count: number;
//     }
//     export interface ProgressBarDisplay {
//         progress_bar: boolean;
//     }
//     // export interface RefreshNotificationsList {
//     //     msg_type: NotificationMessageEnum.MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD;
//     //     notifications: NotificationTypes.NotificationData[];
//     // }
//     // export interface NewNotificationsList {
//     //     msg_type: NotificationMessageEnum.MSG_TYPE_GET_NEW_NOTIFICATIONS;
//     //     notifications: NotificationTypes.NotificationData[];
//     //     count?: number;
//     // }
//     // export interface NotificationUpdate {
//     //     msg_type: NotificationMessageEnum.MSG_TYPE_UPDATED_NOTIFICATION;
//     //     notification: NotificationTypes.NotificationData;
//     // }


//     export type NotificationMessage = NotificationsList
//         | NotificationCount
//         | PaginationExhausted;
//     // | NotificationUpdate
//     // | RefreshNotificationsList
//     // | NewNotificationsList

//     export type NotificationMessageTags = NotificationMessage['msg_type'];

// }
