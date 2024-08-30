declare namespace WebsocketModules {
    export type CHAT_MODULE = "chat";
    export type NOTIFICATION_MOUDLE = "notification";
}

declare namespace ChatTypes {

    interface CommandError {
        error: string;
        message: string;
    }

    interface CommandSendMessage {
        command: "send";
        room_id: number;
        message: string;
    }
    interface ChatMessageEvent {
        msg_type: "MSG_TYPE_MESSAGE" | 0,
        user_id: number;
        username: string;
        avatar: string;
        message: string;
        timestamp: string;
    }

    interface CommandJoin {
        command: "join";
        room: number;
        type: "private" | "tournament";
    }
    interface CommandLeave {
        command: "leave";
        room: number;
    }
    interface UserJoinedLeftEvent {
        msg_type: "MSG_TYPE_CONNECTED_USER_COUNT" | 1;
        connected_user_count: number;
    }

    interface CommandGetRoomChatMessages {
        command: "get_room_chat_messages";
        room_id: any;
        page_number: any;
    }

    interface CommandGetRoomChatMessagesResponse {
        messages_data: "messages_data";
        messages: ChatMessageEvent[] | null;
        new_page_number: number;
    }

    export type ChatServerMessages = CommandError
        | ChatMessageEvent
        | UserJoinedLeftEvent
        | CommandGetRoomChatMessagesResponse;

    export type ChatCommands = CommandSendMessage
        | CommandJoin
        | CommandLeave
        | CommandGetRoomChatMessages;
}

// declare namespace ChatTypes {

//     interface BaseChatCommand {
//         module: WebsocketModules.CHAT_MODULE;
//     }
//     interface BaseChatCommandResponse extends BaseChatCommand {
//         success: boolean;
//         payload: any;
//     }

//     export interface CmdGetChatConversations extends BaseChatCommand {
//         command: "get_chat_conversations";
//         page: number;
//     }

//     export interface OtherChatConversationData {
//         conversation_ident: number;
//         users: APITypes.BasicUserData[];
//         created_at: string;
//         last_activity: string;
//         type: "single" | "group";

//     }

//     export interface CmdGetChatConversationsResponse extends BaseChatCommandResponse {
//         command: "get_chat_conversations";
//         payload: {
//             conversations: OtherChatConversationData[] | null;
//             next_page: number;
//         };
//     }
//     export interface CmdGetConversationMessages extends BaseChatCommand {
//         command: "get_conversation_messages";
//         conversation_ident: string;
//         page: number;
//     }

//     export interface OtherChatMessageData {
//         user_id: number;
//         message_ident: string;
//         message: string;
//         natural_timestamp: string;
//     }
//     export interface CmdGetConversationMessagesResponse extends BaseChatCommandResponse {
//         command: "get_conversation_messages";
//         payload: {
//             conversation_ident: string;
//             messages: OtherChatMessageData[] | null;
//             next_page: number;
//         };
//     }
//     export interface EventPageExhaused {
//         event: "page_exhausted";
//         conversation_ident: string;
//     }
//     export interface CmdPostMessage extends BaseChatCommand {
//         command: "post_conversation_message";
//         payload: {
//             conversation_ident: string;
//             message: string;
//         };
//     }
//     export interface EventNewMessage {
//         event: "new_conversation_message";
//         conversation_ident: string;
//         message: OtherChatMessageData;
//     }

//     export type ChatCommands = CmdGetChatConversations | CmdGetConversationMessages;
//     export type ChatCommandResponse = CmdGetChatConversationsResponse | CmdGetConversationMessagesResponse;
//     export type ChatEvent = EventPageExhaused | EventNewMessage;


// }