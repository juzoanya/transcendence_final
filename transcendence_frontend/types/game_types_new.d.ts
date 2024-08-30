/* eslint-disable prettier/prettier */
declare namespace PongGameplayTypes {
    // Enums

    export type ServeMode = 'serve-winner' | 'serve-loser' | 'serve-random';
    export type InitialServe = 'initial-serve-left' | 'initial-serve-right';
    export type ServeSide = 'serve-left' | 'serve-right';
    export type PongGameSides = 'left' | 'right';
    export type GameEndReason = 'reguar' | 'surrender' | 'timeout';

    // TypedDict equivalents
    export interface GameSettings {
        point_wait_time_ms: number;
        serve_mode: ServeMode;
        initial_serve_to: InitialServe;
        max_score: number;
        tick_rate: number;
    }

    export interface GameObjData {
        x: number;
        y: number;
        w: number;
        h: number;
        speed_x: number;
        speed_y: number;
        dx: number;
        dy: number;
        bound_top: number;
        bound_bottom: number;
        bound_left: number;
        bound_right: number;
    }

    // export interface GameObjDataInit {
    //     court: PongGameplayTypes.GameObjData;
    //     ball: PongGameplayTypes.GameObjData;
    //     paddle_left: PongGameplayTypes.GameObjData;
    //     paddle_right: PongGameplayTypes.GameObjData;
    //     settings: PongGameplayTypes.GameSettings;
    // }

    export interface GameObjPositionData {
        x: number;
        y: number;
        dx: number;
        dy: number;
    }

    // export interface GameUpdateData {
    //     ball: PongGameplayTypes.GameObjPositionData;
    //     paddle_left: PongGameplayTypes.GameObjPositionData;
    //     paddle_right: PongGameplayTypes.GameObjPositionData;
    // }
}

declare namespace PongServerTypes {
    export interface ServerBaseMessage {
        tag: string;
    }

    export interface Hello extends ServerBaseMessage {
        tag: 'hello';
        heartbeat_ms: number;
    }
    export interface Pong extends ServerBaseMessage {
        tag: 'pong';
        client_timestamp_ms: number;
        server_timestamp_ms: number;
    }

    export interface GameReady extends ServerBaseMessage {
        tag: 'server-game-ready';
        timestamp_ms: number;
        court: PongGameplayTypes.GameObjData;
        ball: PongGameplayTypes.GameObjData;
        paddle_left: PongGameplayTypes.GameObjData;
        paddle_right: PongGameplayTypes.GameObjData;
        settings: PongGameplayTypes.GameSettings;
        start_timeout_sec: number;
        reconnect_timeout_sec: number;
        user_id_left: number;
        user_id_right: number;
    }

    export interface GameStart extends ServerBaseMessage {
        tag: 'server-game-start';
        timestamp_ms: number;
    }

    export interface GameObjPosBinary {
        x: number;
        y: number;
        dx: number;
        dy: number;
        tickno?: number;
    }
    export interface GameUpdateBinaryItem {
        tickno: number;
        timestamp_ms: number;
        ball: GameObjPosBinary;
        paddle_left: GameObjPosBinary;
        paddle_right: GameObjPosBinary;
        predicted?: boolean;
    }

    export interface GameUpdate extends ServerBaseMessage {
        tag: 'server-game-update';
        timestamp_ms: number;
        tickno: number;
        invalid_ticks: number;
        ball: PongGameplayTypes.GameObjPositionData;
        paddle_left: PongGameplayTypes.GameObjPositionData;
        paddle_right: PongGameplayTypes.GameObjPositionData;
    }

    export interface GameEnd extends ServerBaseMessage {
        tag: 'server-game-end';
        winner_side: PongGameplayTypes.PongGameSides;
        loser_side: string;
        winner_id: number;
        loser_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
        reason: PongGameplayTypes.GameEndReason;
        game_result: APITypes.GameScheduleItem;
    }
    export interface PlayerScored extends ServerBaseMessage {
        tag: 'server-game-player-scored';
        side: PongGameplayTypes.PongGameSides;
        who_scored_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
    }

    export interface GamePaused extends ServerBaseMessage {
        tag: 'server-game-paused';
    }

    export interface GameResumed extends ServerBaseMessage {
        tag: 'server-game-resumed';
    }

    export interface UserConnected extends ServerBaseMessage {
        tag: 'server-user-connected';
        user_id: number;
    }

    export interface UserDisconnected extends ServerBaseMessage {
        tag: 'server-user-disconnected';
        user_id: number;
    }

    export interface UserReconnected extends ServerBaseMessage {
        tag: 'server-user-reconnected';
        user_id: number;
    }

    export interface UserSurrendered extends ServerBaseMessage {
        tag: 'server-user-surrendered';
        user_id: number;
    }
    export interface GameDismissed extends ServerBaseMessage {
        tag: 'server-game-dismissed';
        user_id: number;
    }

    export interface ServerInternalErr extends ServerBaseMessage {
        tag: 'server-game-error';
        timestamp: number;
        error: string;
        name: string;
        message: string;
    }

    // Type alias for ServerMessage
    export type ServerMessage =
        | Hello
        | Pong
        | GameReady
        | GameStart
        | GameUpdate
        | PlayerScored
        | GameEnd
        | GamePaused
        | GameResumed
        | UserConnected
        | UserDisconnected
        | UserReconnected
        | UserSurrendered
        | ServerInternalErr
        | GameDismissed

    export type ServerMessageTags = ServerMessage['tag'];

    export type BroadcastCallback<T> = (br: Extract<PongServerTypes.ServerMessage, { tag: T; }>) => void;
}

declare namespace PongClientTypes {
    interface ClientBaseCommand {
        cmd: string;
        id?: number;
    }

    export interface Ping extends ClientBaseCommand {
        cmd: 'ping';
        client_timestamp_ms: number;
    }

    type ClientMoveDirection = 'up' | 'down' | 'release_up' | 'release_down';

    interface ClientUserPayload {
        user_id: number;
    }

    interface ClientReadyCommand extends ClientBaseCommand {
        cmd: 'client-ready';
    }

    interface ClientMoveCommand extends ClientBaseCommand {
        cmd: 'client-move';
        timestamp_sec: number;
        timestamp_ms?: number;
        action?: ClientMoveDirection;
        new_y?: number;
        tickno?: number;
        tickdiff?: number;
    }
    // tick_diff?: number;

    interface MovementKey {
        tickno: number;
        tickdiff: number;
        action: ClientMoveDirection
    }
    interface MovementMouse {
        tickno: number;
        tickdiff: number;
        new_y: number;
    }
    type ClientMovement = MovementKey | MovementMouse;

    interface ClientMoveCommandList extends ClientBaseCommand {
        cmd: 'client-move-list';
        movements: ClientMovement[]
    }


    interface ClientPauseCommand extends ClientBaseCommand {
        cmd: 'client-pause';
    }

    interface ClientResumeCommand extends ClientBaseCommand {
        cmd: 'client-resume';
    }

    interface ClientJoinCommand extends ClientBaseCommand {
        cmd: 'client-join-game';
        schedule_id: number;
    }

    interface ClientLeaveCommand extends ClientBaseCommand {
        cmd: 'client-leave-game';
    }

    type ClientCommand =
        | Ping
        | ClientJoinCommand
        | ClientReadyCommand
        | ClientMoveCommand
        | ClientMoveCommandList
        | ClientPauseCommand
        | ClientResumeCommand
        | ClientLeaveCommand;

    type ClientCommandTags = ClientCommand['cmd'];

    export interface ClientCommandResponse {
        success: boolean;
        cmd: ClientCommand['cmd'];
        id: number;
        message: string;
        status_code: number;
    }
    export type CommandResponseCallback<T> = (res: ClientCommandResponse & { cmd: T; }) => void;
}

declare namespace PongTypes {
    export type GeneralServerMessage = PongServerTypes.ServerMessage | PongClientTypes.ClientCommandResponse;
    export type GeneralServerTags = PongServerTypes.ServerMessageTags | PongClientTypes.ClientCommandTags;
    export type ServerMessageCallback<T> =
        T extends PongServerTypes.ServerMessageTags ? PongServerTypes.BroadcastCallback<T>
        : T extends PongClientTypes.ClientCommandTags ? PongClientTypes.CommandResponseCallback<T>
        : never;
}

declare namespace FromWorkerGameMessageTypes {
    export interface GameTouchValid {
        message: 'from-worker-game-touch-valid';
        valid: boolean;
        ident: number;
    }
    export interface GamePaused {
        message: 'from-worker-game-paused';
    }
    export interface GameResumed {
        message: 'from-worker-game-resumed';
    }
    export interface ClientConnected {
        message: 'from-worker-client-connected';
        user_id: number;
    }
    export interface ClientDisconnected {
        message: 'from-worker-client-disconnected';
        user_id: number;
    }
    export interface ClientReconnected {
        message: 'from-worker-client-reconnected';
        user_id: number;
    }
    export interface GameReady {
        message: 'from-worker-game-ready';
        startTimeoutSec: number;
    }
    export interface GameStarted {
        message: 'from-worker-game-started';
        ballTimeoutSec: number;
    }
    export interface GameError {
        message: 'from-worker-error';
        error: string;
        errorCode: number;
    }

    export interface PlayerScored {
        message: 'from-worker-player-scored';
        side: PongGameplayTypes.PongGameSides;
        who_scored_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
    }

    export interface GameEnd {
        message: 'from-worker-game-done';
        winner_side: PongGameplayTypes.PongGameSides;
        loser_side: string;
        winner_id: number;
        loser_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
        reason: PongGameplayTypes.GameEndReason;
        game_result: APITypes.GameScheduleItem | null;
    }
    export interface GameDismissed {
        message: 'from-worker-game-dismissed';
        user_id: number;
    }

    export type FromWorkerMessage =
        | GameTouchValid
        | GameReady
        | GameStarted
        | GamePaused
        | GameResumed
        | ClientConnected
        | ClientDisconnected
        | ClientReconnected
        | GameError
        | PlayerScored
        | GameEnd
        | GameDismissed

    export type FromWorkerMessageTags = FromWorkerMessage['message'];
}

declare namespace ToWorkerGameMessageTypes {
    export interface Create {
        message: 'game_worker_create_remote' | 'game_worker_create_local';
        offscreencanvas: OffscreenCanvas;
        calccanvas?: OffscreenCanvas;
        socketUrl?: string;
        data: APITypes.GameScheduleItem;
        userId: number;
    }
    export interface Init {
        message: 'worker_game_init';
    }
    export interface Start {
        message: 'worker_game_start';
    }
    export interface Quit {
        message: 'worker_game_quit';
    }
    export interface Pause {
        message: 'worker_game_pause';
    }
    export interface Resume {
        message: 'worker_game_resume';
    }
    export interface Terminate {
        message: 'worker_game_terminate';
    }
    export interface Resize {
        message: 'worker_game_resize';
        canvasX: number;
        canvasY: number;
        width: number;
        height: number;
        dpr: number;
    }
    export interface KeyEvent {
        message: 'worker_game_key';
        type: string;
        key: string;
    }
    export interface GameTouchRect {
        ident: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
        y: number;
    }
    export interface GameTouchEvent {
        message: 'worker_game_touch';
        type: 'start' | 'move' | 'end';
        touchRect?: GameTouchRect;
        ident?: number;
    }
    export interface MouseEvent {
        message: 'worker_game_mouseevent';
        posX: number;
        posY: number;
    }
    export interface ChangeColor {
        message: 'worker_game_change_color';
        colorWhite: string;
        colorBlack: string;
    }

    export type ToWorkerMessage =
        | Create
        | Init
        | Start
        | Quit
        | Pause
        | Resume
        | Terminate
        | Resize
        | KeyEvent
        | MouseEvent
        | ChangeColor
        | GameTouchEvent;

    export type ToWorkerMessageTags = ToWorkerMessage['message'];
}


declare namespace FromWorkerSocketMessageTypes {
    export interface Disconnected {
        message: 'from-worker-socket-disconnected';
    }
    export interface Reconnected {
        message: 'from-worker-socket-reconnected';
    }
    export interface ReconnectFailure {
        message: 'from-worker-socket-reconnect-failure';
    }
    export interface Closed {
        message: 'from-worker-socket-closed';
        code: number;
        reason: string;
        wasClean: boolean;
    }
    export interface NewSnapshots {
        message: 'from-worker-socket-new-snapshots';
        snapshots: PongServerTypes.GameUpdateBinaryItem[];
    }
    export interface SocketError {
        message: 'from-worker-socket-error';
        error: string;
        code?: number;
    }
    export interface SocketMessage {
        message: 'from-worker-socket-message';
        broadcast?: PongServerTypes.ServerMessage
        response?: PongClientTypes.ClientCommandResponse
    }
    export interface SocketUpdates {
        message: 'from-worker-socket-update';
        snapshots: PongServerTypes.GameUpdateBinaryItem[];
        currentTick?: number;
        tickBuffer?: number;
    }
    export interface SocketTimes {
        message: 'from-worker-socket-times';
        rtt: number;
        serverClientTimeDiff: number;
    }

   
    export type FromWorkerMessage =
            | Disconnected
            | Reconnected
            | ReconnectFailure
            | Closed
            | NewSnapshots
            | SocketError
            | SocketMessage
            | SocketUpdates
            | SocketTimes

       

    export type FromWorkerMessageTags = FromWorkerMessage['message'];
}

declare namespace ToWorkerSocketMessageTypes {
    export interface Close {
        message: 'socket_worker_close';
    }
    export interface GetUpdate {
        message: 'socket_worker_get_update';
    }
    export interface Create {
        message: 'socket_worker_create';
        socketUrl: string;
        calccanvas?: OffscreenCanvas;
    }
    export interface ClientMove {
        message: 'socket_worker_client_move';
        move: PongClientTypes.MovementKey | PongClientTypes.MovementMouse
    }
    export interface ClientCommand {
        message: 'socket_worker_client_command';
        command: PongClientTypes.ClientCommand
    }
    export interface ClearSnapshots {
        message: 'socket_worker_client_clear_snapshots';
        timestampMs: number;
    }
    export interface StartUpdates {
        message: 'socket_worker_client_start_updates';
        interval?: number;
        tickrate?: number;
        gameStartTime?: number;
        data?: PongServerTypes.GameReady;
    }
   
    export type ToWorkerMessage =
        | Create
        | ClientMove
        | ClientCommand
        | ClearSnapshots
        | StartUpdates
        | Close
        | GetUpdate
}



// declare namespace WorkerGameTypes {
//     export type GeneralWorkerMessage = FromWorkerGameMessageTypes.FromWorkerMessage | ToWorkerGameMessageTypes.ToWorkerMessage;
//     export type GeneralServerTags = PongServerTypes.ServerMessageTags | PongClientTypes.ClientCommandTags;
//     export type ServerMessageCallback<T> =
//         T extends PongServerTypes.ServerMessageTags ? PongServerTypes.BroadcastCallback<T>
//         : T extends PongClientTypes.ClientCommandTags ? PongClientTypes.CommandResponseCallback<T>
//         : never;
// }