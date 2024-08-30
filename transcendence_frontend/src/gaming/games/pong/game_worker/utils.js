import DrawObj from './DrawObj.js';

const CMD_RATE = 66;
const UPDATE_RATE = 66;
const INTERP = 66;
const INTERP_RATIO = 66;


export const getGameRates = (tickrate) => {

};


export class Tick {

    /**
     * @param {number} tickrate
     * @param {number} [gameStartTime]
     */
    constructor(tickrate, gameStartTime) {
        this.#tickDurationMs = 1000/tickrate;
        this.#tickDurationSec = 1000/this.#tickDurationMs;
        this.#gameTime = gameStartTime ?? 0;
    }
    #tickDurationMs;
    #tickDurationSec;
    #tickBuffer = 0;
    #tick = 0;
    #gameTime;

    get gameTimeMs() {
        return this.#gameTime + this.#tick * this.#tickDurationMs;
    }

    get tickDurationSec() {
        return this.#tickDurationSec;
    }
    get tickDurationMs() {
        return this.#tickDurationMs;
    }

    get runningTick() {
        return this.#tick;
    }
    get tick() {
        return this.#tick;
    }

    get tickBuffer() {
        return this.#tickBuffer;
    }

    /** @param {number} elapsedMs  */
    calcTempTick(elapsedMs) {
        let tickBuffer = this.#tickBuffer;
        let tick = this.#tick;
        tickBuffer += elapsedMs;
        while (tickBuffer >= this.#tickDurationMs) {
            tick += 1;
            tickBuffer -= this.#tickDurationMs;
        }
        return [tickBuffer, tick];
    }

    /** @param {number} elapsedMs  */
    update(elapsedMs) {
        this.#tickBuffer += elapsedMs;
        while (this.#tickBuffer >= this.#tickDurationMs) {
            this.#tick += 1;
            this.#tickBuffer -= this.#tickDurationMs;
        }
    }
}


/**
 * @param {ArrayBuffer} data
 * @returns {PongServerTypes.GameUpdateBinaryItem[]}
 */
export function parseSnapshot(data) {
    const dataview = new DataView(data);
    /** @type {PongServerTypes.GameUpdateBinaryItem[]} */
    const da = [];
    const size = dataview.getUint32(0, true);

    let i = 0, k = 0;
    let offs = 4;
    while (i < size && k < 2) {
        da.push({
            tickno: dataview.getUint32(offs, true),
            timestamp_ms: dataview.getFloat32(offs + 4, true),
            ball: {
                x: dataview.getFloat32(offs + 8, true),
                y: dataview.getFloat32(offs + 12, true),
                dx: dataview.getFloat32(offs + 16, true),
                dy: dataview.getFloat32(offs + 20, true),
            },
            paddle_left: {
                x: dataview.getFloat32(offs + 24, true),
                y: dataview.getFloat32(offs + 28, true),
                dx: dataview.getFloat32(offs + 32, true),
                dy: dataview.getFloat32(offs + 36, true),
            },
            paddle_right: {
                x: dataview.getFloat32(offs + 40, true),
                y: dataview.getFloat32(offs + 44, true),
                dx: dataview.getFloat32(offs + 48, true),
                dy: dataview.getFloat32(offs + 52, true),
            }
        })
        offs += 56;
        ++i;
        ++k;
    }
    // console.log('\n\nNEW UPDATE DECODED:');
    // da.forEach((i) => {
    //     console.log('tickno: ', i.tickno);
    // })
    // console.log('timestamp: ', i.timestamp_ms);
    // console.log('ball x: ', i.ball.x);
    // console.log('ball y: ', i.ball.y);
    // console.log('paddle_left x: ', i.paddle_left.x);
    // console.log('paddle_left y: ', i.paddle_left.y);
    // console.log('paddle_right x: ', i.paddle_right.x);
    // console.log('paddle_right y: ', i.paddle_right.y);

    return (da);
}


/** @param {FromWorkerGameMessageTypes.FromWorkerMessage} message */
export const pushMessageToMainThread = (message) => {
    self.postMessage(message);
}

export const useMedian = () => {
    let median = 0;
    let sum = 0;
    let count = 0;
    /** @param {number} val */
    const addValue = (val) => {
        sum += val;
        count += 1;
        median = sum / count;
    }
    const getMedian = () => median;
    return ({addValue, getMedian});
}


/**
 * @param {number} time
 * @returns {(newTime: number) => number}
 */
// eslint-disable-next-line no-unused-vars
export function useFps(time) {
    let currTime = time ?? performance.now();
    let fpsCount = 0;
    let currFps = 0;
    return (newTime) => {
        fpsCount += 1000;
        const diff = newTime - currTime;
        if (diff > 1000) {
            currFps = Math.floor(fpsCount / diff);
            currTime = newTime;
            fpsCount = 0;
        }
        return currFps;
    };
}


/**
 * @template {PongTypes.GeneralServerTags} Tgen
 */
export class ServerMessageMap {
    constructor() {
        /** @type {Map<Tgen, PongServerTypes.BroadcastCallback<any> | PongClientTypes.CommandResponseCallback<any> >} */
        this.map = new Map();
    }

    /**
     * @template {Tgen} K
     * @param {K} key
     * @param { PongTypes.ServerMessageCallback<K> } value
     */
    setHandler(key, value) {
        if (!this.map.has(key))
            this.map.set(key, value);
    }

    /**
     * @template {Tgen} K
     * @param {K} key
     * @returns {PongTypes.ServerMessageCallback<K> | undefined}
     */
    getHandler(key) {
        const value = this.map.get(key);
        if (value) {
            return /** @type {PongTypes.ServerMessageCallback<K>} */ (value);
        }
        return undefined;
    }
    /**
     * @template {Tgen} K
     * @param {K} key
     * @returns {boolean}
     */
    has(key) {
        return this.map.has(key)
    }
}

// /**
//  * @template {PongTypes.GeneralServerTags} Tgen
//  */
// export class WorkerMessageMap {
//     constructor() {
//         /** @type {Map<Tgen, PongServerTypes.BroadcastCallback<any> | PongClientTypes.CommandResponseCallback<any> >} */
//         this.map = new Map();
//     }

//     /**
//      * @template {Tgen} K
//      * @param {K} key
//      * @param { PongTypes.ServerMessageCallback<K> } value
//      */
//     setHandler(key, value) {
//         if (!this.map.has(key))
//             this.map.set(key, value);
//     }

//     /**
//      * @template {Tgen} K
//      * @param {K} key
//      * @returns {PongTypes.ServerMessageCallback<K> | undefined}
//      */
//     getHandler(key) {
//         const value = this.map.get(key);
//         if (value) {
//             return /** @type {PongTypes.ServerMessageCallback<K>} */ (value);
//         }
//         return undefined;
//     }
//     /**
//      * @template {Tgen} K
//      * @param {K} key
//      * @returns {boolean}
//      */
//     has(key) {
//         return this.map.has(key)
//     }
// }


export const WebsocketErrorCode = {
    OK: 4000,
    NON_CLOSING_ERROR: 4100,
    GAME_ALREADY_CREATED: 4101,
    USER_ALREADY_JOINED_GAME: 4102,
    INVALID_COMMAND: 4103,
    DEFAULT_ERROR: 4199,
    CLOSING_ERROR: 4200,
    NOT_AUTHENTICATED: 4201,
    ALREADY_RUNNING_GAME_SESSION: 4202,
    INVALID_SCHEDULE_ID: 4203,
    INVALID_USER_ID: 4204,
    USER_NO_PARTICIPANT: 4205,
    JOIN_TIMEOUT: 4206,
    RECONNECT_TIMEOUT: 4207,
    IDLE_TIMEOUT: 4208,
    INTERNAL_ERROR: 4209,
};

export function getSocketErrorMessage(code) {
    switch (code) {
        case WebsocketErrorCode.OK:
            return 'OK';
        case WebsocketErrorCode.NON_CLOSING_ERROR:
            return 'Non-closing error';
        case WebsocketErrorCode.GAME_ALREADY_CREATED:
            return 'Game already created';
        case WebsocketErrorCode.USER_ALREADY_JOINED_GAME:
            return 'User already joined game';
        case WebsocketErrorCode.INVALID_COMMAND:
            return 'Invalid command';
        case WebsocketErrorCode.DEFAULT_ERROR:
            return 'Default error';
        case WebsocketErrorCode.CLOSING_ERROR:
            return 'Closing error';
        case WebsocketErrorCode.NOT_AUTHENTICATED:
            return 'Not authenticated';
        case WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION:
            return 'Already running game session';
        case WebsocketErrorCode.INVALID_SCHEDULE_ID:
            return 'Invalid schedule ID';
        case WebsocketErrorCode.INVALID_USER_ID:
            return 'Invalid user ID';
        case WebsocketErrorCode.USER_NO_PARTICIPANT:
            return 'User no participant';
        case WebsocketErrorCode.JOIN_TIMEOUT:
            return 'Join timeout';
        case WebsocketErrorCode.RECONNECT_TIMEOUT:
            return 'Reconnect timeout';
        case WebsocketErrorCode.IDLE_TIMEOUT:
            return 'Idle timeout';
        case WebsocketErrorCode.INTERNAL_ERROR:
            return 'Internal error';
        default:
            return 'Unknown error code';
    }
}

/** @param {PongClientTypes.ClientCommandResponse} msg */
export function printCommandResponse(msg) {
    console.log('----- COMMAND RESPONSE ----');
    console.log(`cmd ${msg.cmd}`);
    console.log(`id ${msg.id}`);
    console.log(`success ${msg.success}`);
    console.log(`message ${msg.message}`);
    console.log(`status_code ${msg.status_code}`);
}

// /** @type {Map<string, PongClientTypes.ClientCommand>} */
// const commandStack = new Map();
// let commandNbr = 1;
// /** @type {PongClientTypes.ClientCommand} */
// let lastCommand;
// /** @type {PongClientTypes.ClientMoveDirection | undefined} */
// let lastMove;
