/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

interface ServerBaseMessage {
    tag: string;
}

interface Pong extends ServerBaseMessage {
    tag: 'pong';
    client_timestamp_ms: number;
    server_timestamp_ms: number;
}

interface GameReady extends ServerBaseMessage {
    tag: 'server-game-ready';
    timestamp: number;
    court: PongGameplayTypes.GameObjData;
    ball: PongGameplayTypes.GameObjData;
    paddle_left: PongGameplayTypes.GameObjData;
    paddle_right: PongGameplayTypes.GameObjData;
    settings: PongGameplayTypes.GameSettings;
    timeout_time_sec: number;
    user_id_left: number;
    user_id_right: number;
}

interface GameStart extends ServerBaseMessage {
    tag: 'server-game-start';
    timestamp: number;
}

interface GameUpdate extends ServerBaseMessage {
    tag: 'server-game-update';
    timestamp: number;
    tickno: number;
    invalid_ticks: number;
    ball: PongGameplayTypes.GameObjPositionData;
    paddle_left: PongGameplayTypes.GameObjPositionData;
    paddle_right: PongGameplayTypes.GameObjPositionData;
}

interface GameEnd extends ServerBaseMessage {
    tag: 'server-game-end';
    timestamp: number;
    winner_id: number;
    loser_id: number;
    reason: PongGameplayTypes.GameEndReason;
}

interface GamePaused extends ServerBaseMessage {
    tag: 'server-game-paused';
    timestamp: number;
}

interface GameResumed extends ServerBaseMessage {
    tag: 'server-game-resumed';
    timestamp: number;
}

interface UserConnected extends ServerBaseMessage {
    tag: 'server-user-connected';
    timestamp: number;
    user_id: number;
}

interface UserDisconnected extends ServerBaseMessage {
    tag: 'server-user-disconnected';
    timestamp: number;
    user_id: number;
}

interface UserSurrendered extends ServerBaseMessage {
    tag: 'server-user-surrendered';
    timestamp: number;
    user_id: number;
}

interface Error extends ServerBaseMessage {
    tag: 'server-game-error';
    timestamp: number;
    error: string;
}

// Type alias for ServerMessage
type ServerMessage =
    | Pong
    | GameReady
    | GameStart
    | GameUpdate
    | GameEnd
    | GamePaused
    | GameResumed
    | UserConnected
    | UserDisconnected
    | UserSurrendered
    | Error;

type ServerMessageTags = ServerMessage['tag'];

type BroadcastCallback<T extends ServerMessageTags> = (broadcast: Extract<ServerMessage, { tag: T; }>) => void;

class TypedMap {
    private map = new Map<ServerMessageTags, BroadcastCallback<any>>();

    set<K extends ServerMessageTags>(key: K, value: BroadcastCallback<K>): void {
        this.map.set(key, value as unknown as BroadcastCallback<any>);
    }

    get<K extends ServerMessageTags>(key: K): BroadcastCallback<K> | undefined {
        return this.map.get(key) as BroadcastCallback<K> | undefined;
    }
}

// Example usage
const jo = new TypedMap();

jo.set('server-game-ready', (br) => {
    // `br` is inferred as `Extract<ServerMessage, { tag: 'server-game-ready' }>`
    // which is of type `GameReady`

    console.log(br.court);
    console.log(br.user_id_left);
});

jo.set('server-game-start', (br) => {
    // `br` is inferred as `GameStart`
    console.log(br.timestamp);
});
