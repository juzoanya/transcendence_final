/* eslint-disable prettier/prettier */
/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
/* eslint-disable jsdoc/no-undefined-types */
/* eslint-disable no-unused-vars */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
import { sessionService } from '../../services/api/API.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {GameWorkerManager} worker
 */
const useMouseTouchEvents = (canvas, worker) => {
    /** @type {Set<number>} */
    const currTouches = new Set();

    /**
     * @param {number} nbr 
     * @param {number} radius 
     * @param {number} offset 
     * @param {number} scale 
     * @returns {[number, number]}
     */
    const getOffsTuple = (nbr, radius, offset, scale) => radius === 0 ?
        [(nbr - offset) / scale, (nbr - offset) / scale]
        : [((nbr - radius/2) - offset) / scale, ((nbr + radius/2) - offset) / scale]

    /**
     * @param {Touch | MouseEvent} e
     * @returns {ToWorkerGameMessageTypes.GameTouchRect} */
    const setGameTouchAndGetGameTouchRect = (e) => {
        const ident = (e instanceof MouseEvent) ? -1 : e.identifier;
        currTouches.add(ident);
        const mouseRadius = 30;
        const rect = canvas.getBoundingClientRect();
        const [left, right] = getOffsTuple(e.clientX, (e instanceof MouseEvent) ? mouseRadius : e.radiusX, rect.x, canvas.width / window.devicePixelRatio) 
        const [top, bottom] = getOffsTuple(e.clientY, (e instanceof MouseEvent) ? mouseRadius : e.radiusY, rect.y, canvas.height / window.devicePixelRatio) 
        const data = {ident, left, right, top, bottom, y: e.clientY / (canvas.height / window.devicePixelRatio)};
        return data;
    }

    /**
     * @param {TouchList} touchList
     * @param {(touch: Touch)=>void} iterFunc
     */
    const iterTouches = (touchList, iterFunc) => {
        for (let i = 0; i < touchList.length; i++) {
            if (typeof iterFunc === "function")
                iterFunc(touchList[i]);
        }
    };

    /** @param {number} ident */
    const removeTouchByIdent = (ident) => currTouches.delete(ident);

    /** @param {number} ident */
    const currentHasTouch = (ident) => currTouches.has(ident);

    /**
     * @param {Touch | MouseEvent} e 
     * @param {"start" | "move"} msg 
     */
    const setTouchAndPostWorker = (e, msg) => {
        if ( msg === "start" || (msg === "move" && currTouches.has((e instanceof Touch) ? e.identifier : -1)) )
            worker.postMessage({message: "worker_game_touch", touchRect: setGameTouchAndGetGameTouchRect(e), type: msg})
    }

    /** @param {number} [ident] */
    const removeTouchAndPostWorker = (ident) => {
        if (currTouches.has(ident ?? -1))
            worker.postMessage({message: "worker_game_touch", ident: ident ?? -1, type: "end"});
        removeTouchByIdent(ident ?? -1);
    }

    /** @param {TouchEvent} e */
    const handleTouchStart = (e) => {iterTouches(e.changedTouches, (touch) => {setTouchAndPostWorker(touch, "start")})};
    /** @param {TouchEvent} e */
    const handleTouchMove = (e) => {iterTouches(e.changedTouches, (touch) => {e.preventDefault();  setTouchAndPostWorker(touch, "move")})};
    /** @param {TouchEvent} e */
    const handleTouchEnd = (e) => {iterTouches(e.changedTouches, (touch) => {removeTouchAndPostWorker(touch.identifier)})};

    /** @param {MouseEvent} e */
    const handleMouseStart = (e) => {setTouchAndPostWorker(e, "start")};
    /** @param {MouseEvent} e */
    const handleMouseMove = (e) => {setTouchAndPostWorker(e, "move")};
    /** @param {MouseEvent} e */
    const handleMouseEnd = (e) => {removeTouchAndPostWorker()};

    // canvas.addEventListener('touchstart', handleTouchStart, {passive: true});
    // canvas.addEventListener('touchmove', handleTouchMove, {passive: true});
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('mousedown', handleMouseStart);
    window.addEventListener('mousemove', handleMouseMove);
    // window.addEventListener('mouseleave', handleMouseEnd);
    window.addEventListener('mouseup', handleMouseEnd);

    const removeHandlers = () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
        window.removeEventListener('mousedown', handleMouseStart);
        window.removeEventListener('mousemove', handleMouseMove);
        // window.removeEventListener('mouseleave', handleMouseEnd);
        window.removeEventListener('mouseup', handleMouseEnd);
    }

    return {
        removeHandlers,
        removeTouchByIdent
    }
}


class GameWorkerManager {
    /**
     * @param {(msg: FromWorkerGameMessageTypes.FromWorkerMessage) => void} onMessageCb
     * @param {(ev: Event) => void} onErrorCb
     * @param {(ev: MessageEvent) => void} onMessageErrorCb
     */
    constructor(onMessageCb, onMessageErrorCb, onErrorCb ) {
        this.worker = new Worker(new URL('../games/pong/game_worker/worker.js', import.meta.url), {
            type: 'module',
        })
        // this.worker = new Worker(scriptURL, { type: 'module' });
        this.worker.onmessage = (ev) => { if (typeof onMessageCb === 'function') onMessageCb(ev.data); };
        this.worker.onerror = (ev) => { if (typeof onErrorCb === 'function') onErrorCb(ev); };
        this.worker.onmessageerror = (ev) => { if (typeof onMessageErrorCb === 'function') onMessageErrorCb(ev); };
    }

    terminate() {
        this.worker.terminate();
    }

    /**
     * @param {ToWorkerGameMessageTypes.ToWorkerMessage} message
     * @param {Transferable[]} [transfer]
     */
    postMessage(message, transfer = []) {
        // console.log('POST MESSAGE FROM HUB: transfer: ', transfer);
        
        this.worker.postMessage(message, transfer);
    }
}

/** @type {WorkerOptions} */

export default class GameHub {
    static currentUser = sessionService.subscribe();

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {APITypes.GameScheduleItem} gameData
     * @param {boolean} isRemote
     * @returns {GameHub | undefined}
     */
    static startGame(canvas, gameData, isRemote) {
        if (GameHub.currentUser.value)
            return new GameHub(canvas, gameData, isRemote);
        return undefined;
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {APITypes.GameScheduleItem} gameData
     * @param {boolean} isRemote
     */
    constructor(canvas, gameData, isRemote) {
        if (!(canvas instanceof HTMLCanvasElement))
            throw new Error('No Canvas Element or no Worker Files');

        this.canvas = canvas;

        /** @param {FromWorkerGameMessageTypes.FromWorkerMessage} msg  */
        const onWorkerMessage = (msg) => {
            console.log('worker message: ', msg);
            const handler = this.#workerMessageEventMap.get(msg.message);
            if (handler && typeof handler === "function") handler(msg);
        }
        const onWorkerError = (ev) => {
            console.log(ev);
            this.quitGame();
            throw new Error('WORKER ERROR');
        }
        const onWorkerMessageError = (ev) => {
            this.quitGame();
            throw new Error('WORKER MESSAGE ERROR');
        }
        this.worker = new GameWorkerManager(
            onWorkerMessage,
            onWorkerMessageError,
            onWorkerError,
        );

        
        window.addEventListener('keydown', (e) => { this.handleKey(e); });
        window.addEventListener('keyup', (e) => { this.handleKey(e); });

        this.touchHandler = useMouseTouchEvents(canvas, this.worker);
        try {
            const url = new URL(window.location.origin);
            const socketUrl = `${import.meta.env.VITE_GLOBAL_WEBSOCKET_URL}game/${gameData.schedule_id}/`;
            const offscreencanvas = canvas.transferControlToOffscreen();
            
            console.log('create msg to worker: userid: ', GameHub.currentUser.value?.user?.id);
            this.worker.postMessage(
                {
                    message: isRemote ? 'game_worker_create_remote' : 'game_worker_create_local',
                    offscreencanvas,
                    socketUrl,
                    data: gameData,
                    userId: GameHub.currentUser.value?.user?.id ?? -1,
                },
                [offscreencanvas],
            );
        } catch (error) {
            console.log('unable to connect to game websocket: ', error);
        }

    }

    /**
     * 
     * @param {number} canvasX 
     * @param {number} canvasY 
     * @param {number} newCanvasWidth 
     * @param {number} newCanvasHeight 
     * @param {number} dpr 
     */
    resizeCanvas(canvasX, canvasY, newCanvasWidth, newCanvasHeight, dpr) {
        this.worker.postMessage({
            message: 'worker_game_resize',
            canvasX,
            canvasY,
            width: newCanvasWidth,
            height: newCanvasHeight,
            dpr,
        });
    }

    /**
     * @template T
     * @typedef {(br: Extract<FromWorkerGameMessageTypes.FromWorkerMessage, { message: T; }>) => void} FromWorkerMessageCallback
     */

    /** @type {Map<FromWorkerGameMessageTypes.FromWorkerMessageTags, FromWorkerMessageCallback<any> >} */
    #workerMessageEventMap = new Map();

    /**
     * @template {FromWorkerGameMessageTypes.FromWorkerMessageTags} K
     * @param {K} tag
     * @param { FromWorkerMessageCallback<K> } handler
     */
    on(tag, handler) {
        if (!this.#workerMessageEventMap.has(tag))
            this.#workerMessageEventMap.set(tag, handler);
    }
   

    

    /** @param {KeyboardEvent} e */
    handleKey = (e) => {
        this.worker.postMessage({
            message: 'worker_game_key',
            key: e.key,
            type: e.type
        });
    }

    #started = false;
    #quited = false;
    #paused = false;
    #otherDisconnected = false;
    #youDisconnected = false;
    startGame() {
        this.worker.postMessage({ message: 'worker_game_start' });
    }

    quitGame() {
        console.log('QUIT GAME');
        window.removeEventListener('keydown', (e) => { this.handleKey(e); });
        window.removeEventListener('keyup', (e) => { this.handleKey(e); });
        this.touchHandler.removeHandlers();
        this.worker.postMessage({ message: 'worker_game_quit' });
    }

    pauseGame() {
        this.worker.postMessage({ message: 'worker_game_pause' });
    }

    continueGame() {
        this.worker.postMessage({ message: 'worker_game_resume' });
    }
}


// /**
//  * @param {HTMLCanvasElement} canvas
//  * @param {GameWorkerManager} worker
//  */
// const useMouseTouchEvents = (canvas, worker) => {
//     /** @type {Set<number>} */
//     const currTouches = new Set();

//     /**
//      * @param {number} nbr 
//      * @param {number} radius 
//      * @param {number} offset 
//      * @param {number} scale 
//      * @returns {[number, number]}
//      */
//     const getOffsTuple = (nbr, radius, offset, scale) => radius === 0 ?
//         [(nbr - offset) / scale, (nbr - offset) / scale]
//         : [((nbr - radius/2) - offset) / scale, ((nbr + radius/2) - offset) / scale]

//     /**
//      * @param {Touch | MouseEvent} e
//      * @returns {ToWorkerGameMessageTypes.GameTouchRect} */
//     const setGameTouchAndGetGameTouchRect = (e) => {
//         const ident = (e instanceof MouseEvent) ? -1 : e.identifier;
//         currTouches.add(ident);
//         const mouseRadius = 30;
//         const rect = canvas.getBoundingClientRect();
//         const [left, right] = getOffsTuple(e.clientX, (e instanceof MouseEvent) ? mouseRadius : e.radiusX, rect.x, canvas.width / window.devicePixelRatio) 
//         const [top, bottom] = getOffsTuple(e.clientY, (e instanceof MouseEvent) ? mouseRadius : e.radiusY, rect.y, canvas.height / window.devicePixelRatio) 
//         const data = {ident, left, right, top, bottom, y: e.clientY / (canvas.height / window.devicePixelRatio)};
//         return data;
//     }

//     /**
//      * @param {TouchList} touchList
//      * @param {(touch: Touch)=>void} iterFunc
//      */
//     const iterTouches = (touchList, iterFunc) => {
//         for (let i = 0; i < touchList.length; i++) {
//             if (typeof iterFunc === "function")
//                 iterFunc(touchList[i]);
//         }
//     };

//     /** @param {number} ident */
//     const removeTouchByIdent = (ident) => currTouches.delete(ident);

//     /** @param {number} ident */
//     const currentHasTouch = (ident) => currTouches.has(ident);

//     /**
//      * @param {Touch | MouseEvent} e 
//      * @param {"start" | "move"} msg 
//      */
//     const setTouchAndPostWorker = (e, msg) => {
//         if ( msg === "start" || (msg === "move" && currTouches.has((e instanceof Touch) ? e.identifier : -1)) )
//             worker.postMessage({message: "worker_game_touch", touchRect: setGameTouchAndGetGameTouchRect(e), type: msg})
//     }

//     /** @param {number} [ident] */
//     const removeTouchAndPostWorker = (ident) => {
//         if (currTouches.has(ident ?? -1))
//             worker.postMessage({message: "worker_game_touch", ident: ident ?? -1, type: "end"});
//         removeTouchByIdent(ident ?? -1);
//     }

//     /** @param {TouchEvent} e */
//     const handleTouchStart = (e) => {iterTouches(e.changedTouches, (touch) => {setTouchAndPostWorker(touch, "start")})};
//     /** @param {TouchEvent} e */
//     const handleTouchMove = (e) => {iterTouches(e.changedTouches, (touch) => {e.preventDefault();  setTouchAndPostWorker(touch, "move")})};
//     /** @param {TouchEvent} e */
//     const handleTouchEnd = (e) => {iterTouches(e.changedTouches, (touch) => {removeTouchAndPostWorker(touch.identifier)})};

//     /** @param {MouseEvent} e */
//     const handleMouseStart = (e) => {setTouchAndPostWorker(e, "start")};
//     /** @param {MouseEvent} e */
//     const handleMouseMove = (e) => {setTouchAndPostWorker(e, "move")};
//     /** @param {MouseEvent} e */
//     const handleMouseEnd = (e) => {removeTouchAndPostWorker()};

//     canvas.addEventListener('touchstart', handleTouchStart);
//     canvas.addEventListener('touchmove', handleTouchMove);
//     canvas.addEventListener('touchend', handleTouchEnd);
//     canvas.addEventListener('touchcancel', handleTouchEnd);
//     window.addEventListener('mousedown', handleMouseStart);
//     window.addEventListener('mousemove', handleMouseMove);
//     // window.addEventListener('mouseleave', handleMouseEnd);
//     window.addEventListener('mouseup', handleMouseEnd);

//     const removeHandlers = () => {
//         canvas.removeEventListener('touchstart', handleTouchStart);
//         canvas.removeEventListener('touchmove', handleTouchMove);
//         canvas.removeEventListener('touchend', handleTouchEnd);
//         canvas.removeEventListener('touchcancel', handleTouchEnd);
//         window.removeEventListener('mousedown', handleMouseStart);
//         window.removeEventListener('mousemove', handleMouseMove);
//         // window.removeEventListener('mouseleave', handleMouseEnd);
//         window.removeEventListener('mouseup', handleMouseEnd);
//     }

//     return {
//         removeHandlers,
//         removeTouchByIdent
//     }
// }


// class GameWorkerManager {
//     /**
//      * @param {(msg: FromWorkerGameMessageTypes.FromWorkerMessage) => void} onMessageCb
//      * @param {(ev: Event) => void} onErrorCb
//      * @param {(ev: MessageEvent) => void} onMessageErrorCb
//      */
//     constructor(onMessageCb, onMessageErrorCb, onErrorCb ) {
//         this.worker = new Worker(new URL('../games/pong/game_worker/worker.js', import.meta.url), {
//             type: 'module',
//         })
//         // this.worker = new Worker(scriptURL, { type: 'module' });
//         this.worker.onmessage = (ev) => { if (typeof onMessageCb === 'function') onMessageCb(ev.data); };
//         this.worker.onerror = (ev) => { if (typeof onErrorCb === 'function') onErrorCb(ev); };
//         this.worker.onmessageerror = (ev) => { if (typeof onMessageErrorCb === 'function') onMessageErrorCb(ev); };
//     }

//     terminate() {
//         this.worker.terminate();
//     }

//     /**
//      * @param {ToWorkerGameMessageTypes.ToWorkerMessage} message
//      * @param {Transferable[]} [transfer]
//      */
//     postMessage(message, transfer = []) {
//         this.worker.postMessage(message, transfer);
//     }
// }

// /** @type {WorkerOptions} */

// export default class GameHub {
//     static currentUser = sessionService.subscribe();

//     /**
//      * @param {HTMLCanvasElement} canvas
//      * @param {APITypes.GameScheduleItem} gameData
//      * @param {boolean} isRemote
//      * @returns {Promise<GameHub | undefined>}
//      */
//     static async startGame(canvas, gameData, isRemote) {
//         if (GameHub.currentUser.value)
//             return new GameHub(canvas, gameData, isRemote);
//         return undefined;
//     }

//     /**
//      * @param {HTMLCanvasElement} canvas
//      * @param {APITypes.GameScheduleItem} gameData
//      * @param {boolean} isRemote
//      */
//     constructor(canvas, gameData, isRemote) {
//         if (!(canvas instanceof HTMLCanvasElement))
//             throw new Error('No Canvas Element or no Worker Files');

//         this.gameData = gameData;
//         this.canvas = canvas;

//         this.worker = new GameWorkerManager(
//             this.onWorkerMessage.bind(this),
//             this.onWorkerMessageError.bind(this),
//             this.onWorkerError.bind(this),
//         );

//         this.gameData.player_one.score = 0;
//         this.gameData.player_two.score = 0;
//         this.gameData.player_one.won = false;
//         this.gameData.player_two.won = false;

        
//         window.addEventListener('keydown', (e) => { this.handleKey(e); });
//         window.addEventListener('keyup', (e) => { this.handleKey(e); });

//         this.touchHandler = useMouseTouchEvents(canvas, this.worker);
        

//         try {
//             const url = new URL(window.location.origin);
//             const socketUrl = `wss://api.${url.host}/ws/game/${this.gameData.schedule_id}/`;
//             const offscreencanvas = canvas.transferControlToOffscreen();
//             console.log('create msg to worker: userid: ', GameHub.currentUser.value?.user?.id);
//             this.worker.postMessage(
//                 {
//                     message: isRemote ? 'game_worker_create_remote' : 'game_worker_create_local',
//                     offscreencanvas,
//                     socketUrl,
//                     data: this.gameData,
//                     userId: GameHub.currentUser.value?.user?.id ?? -1,
//                 },
//                 [offscreencanvas],
//             );
//         } catch (error) {
//             console.log('unable to connect to game websocket: ', error);
//         }

//     }

//     onWorkerError(ev) {
//         console.log(ev);
//         this.quitGame();
//         throw new Error('WORKER ERROR');
//     }

//     onWorkerMessageError(ev) {
//         this.quitGame();
//         throw new Error('WORKER MESSAGE ERROR');
//     }

//     /** @param {FromWorkerGameMessageTypes.FromWorkerMessage} msg  */
//     onWorkerMessage(msg) {
//         console.log('worker message: ', msg);
//         if (msg.message === "from-worker-game-touch-valid") {
//             console.log('new validity message: ', msg);
//             // console.log('my map: ', this.currTouches);
//             if (!msg.valid) {
//                 console.log('remove from touch list');
//                 this.touchHandler.removeTouchByIdent(msg.ident);
//                 // this.currTouches.delete(msg.identifier);
//             }
//         }
//     }

//     /** @param {KeyboardEvent} e */
//     handleKey = (e) => {
//         this.worker.postMessage({
//             message: 'worker_game_key',
//             key: e.key,
//             type: e.type
//         });
//     }

//     startGame() {
//         this.worker.postMessage({ message: 'worker_game_start' });
//     }

//     quitGame() {
//         window.removeEventListener('keydown', (e) => { this.handleKey(e); });
//         window.removeEventListener('keyup', (e) => { this.handleKey(e); });
//         // this.canvas.removeEventListener('touchstart', this.handleTouchStart);
//         // this.canvas.removeEventListener('touchmove', this.handleTouchMove);
//         // this.canvas.removeEventListener('touchend', this.handleTouchEnd);
//         // this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
//         this.touchHandler.removeHandlers();
//         this.worker.postMessage({ message: 'worker_game_quit' });
//     }

//     pauseGame() {
//         this.worker.postMessage({ message: 'worker_game_pause' });
//     }

//     continueGame() {
//         this.worker.postMessage({ message: 'worker_game_resume' });
//     }

//     /**
//      * 
//      * @param {number} canvasX 
//      * @param {number} canvasY 
//      * @param {number} newCanvasWidth 
//      * @param {number} newCanvasHeight 
//      * @param {number} dpr 
//      */
//     resizeCanvas(canvasX, canvasY, newCanvasWidth, newCanvasHeight, dpr) {
//         this.worker.postMessage({
//             message: 'worker_game_resize',
//             canvasX,
//             canvasY,
//             width: newCanvasWidth,
//             height: newCanvasHeight,
//             dpr,
//         });
//     }

//     get scorePlayerOne() {
//         return this.gameData.player_one.score;
//     }

//     get scorePlayerTwo() {
//         return this.gameData.player_two.score;
//     }

//     get playerOneWon() {
//         return this.gameData.player_one.won;
//     }

//     get playerTwoWon() {
//         return this.gameData.player_two.won;
//     }
// }
































// import { sessionService } from '../../services/api/API.js';
// import { msg_to_main, msg_to_worker } from '../exchange/game_msg.js';

// class GameWorkerManager {
//     /**
//      * @param {string} scriptURL
//      * @param {boolean} useModule
//      */
//     constructor(scriptURL, useModule) {
//         this.worker = new Worker(
//             scriptURL,
//             useModule ? { type: 'module' } : undefined,
//         );
//         this.worker.onmessage = this.onmessage;
//         this.worker.onerror = this.onerror;
//         this.worker.onmessageerror = this.onmessageerror;
//     }

//     terminate() {
//         this.worker.terminate();
//     }

//     /**
//      * @param {ToWorkerGameMessageTypes.GameWorkerMessage} message
//      * @param {Transferable[]} [transfer]
//      */
//     postMessage(message, transfer = []) {
//         this.worker.postMessage(message, transfer);
//     }

//     /**
//      * @param {MessageEvent} ev
//      */
//     onmessage(ev) {}

//     /**
//      * @param {ErrorEvent} ev
//      */
//     onerror(ev) {}

//     /**
//      * @param {MessageEvent} ev
//      */
//     onmessageerror(ev) {}
// }

// /** @type {WorkerOptions} */

// export default class GameHub {
//     static games = {
//         pong: 'pong',
//     };

//     static gamesWorker = {
//         pong: '/public/game_worker/worker.js',
//     };

//     static currentUser = sessionService.subscribe(null);

//     /**
//      * @param {string} game
//      * @param {HTMLCanvasElement} canvas
//      * @param {APITypes.GameScheduleItem} gameData
//      * @param {import('./../exchange/game_msg.js').GameSettings} [gameSettings]
//      * @returns {Promise<GameHub | undefined>}
//      */
//     static async startGame(game, canvas, gameData, gameSettings) {
//         if (GameHub.currentUser.value)
//             return new GameHub(game, canvas, gameData, gameSettings);
//         return undefined;
//     }

//     /**
//      * @param {string} game
//      * @param {HTMLCanvasElement} canvas
//      * @param {APITypes.GameScheduleItem} gameData
//      * @param {import('./../exchange/game_msg.js').GameSettings} [gameSettings]
//      */
//     constructor(game, canvas, gameData, gameSettings) {
//         if (
//             !GameHub.gamesWorker[game] ||
//             !(canvas instanceof HTMLCanvasElement)
//         )
//             throw new Error('No Canvas Element or no Worker Files');

//         this.gameData = gameData;
//         this.gameSettings = gameSettings;

//         this.worker = new GameWorkerManager(GameHub.gamesWorker[game], true);

//         this.gameData.player_one.score = 0;
//         this.gameData.player_two.score = 0;
//         this.gameData.player_one.won = false;
//         this.gameData.player_two.won = false;

//         this.worker.onmessage = (ev) => {
//             if (
//                 ev.data === msg_to_main.player_1_score &&
//                 this.gameData.player_one.score
//             ) {
//                 this.gameData.player_one.score++;
//             } else if (
//                 ev.data === msg_to_main.player_2_score &&
//                 this.gameData.player_two.score
//             ) {
//                 this.gameData.player_two.score++;
//             } else if (ev.data === msg_to_main.player_1_win) {
//                 this.gameData.player_one.won = true;
//                 this.pauseGame();
//             } else if (ev.data === msg_to_main.player_2_win) {
//                 this.gameData.player_two.won = true;
//                 this.pauseGame();
//             }
//         };
//         this.worker.onerror = (ev) => {
//             console.log(ev);
//             this.terminateGame();
//             throw new Error('WORKER ERROR');
//         };
//         this.worker.onmessageerror = () => {
//             this.terminateGame();
//             throw new Error('WORKER MESSAGE ERROR');
//         };

//         const pushKey = (e) => {
//             this.worker.postMessage({
//                 message: 'worker_game_keyevent',
//                 keyevent: e.type,
//                 key: e.key,
//             });
//         };

//         window.addEventListener('keydown', pushKey);
//         window.addEventListener('keyup', pushKey);
//         // window.addEventListener("mousemove", (e) => {

//         // })

//         this.canvas = canvas;
//     }

//     //   #quitGameAndPushResult() {}

//     #gameTerminated = false;

//     //   #gameInited = false;

//     #gameStarted = false;

//     #gameQuited = false;

//     initGame() {
//         console.log('init game hub');
//         // console.log('game inited: ', this.#gameInited);
//         console.log('game started: ', this.#gameStarted);
//         // if (this.#gameInited || this.#gameTerminated) return;
//         console.log('init game hub yoo');
//         // this.#gameInited = true;

//         try {
//             const url = new URL(window.location.origin);
//             const socketUrl = `wss://api.${url.host}/ws/game/${this.gameData.schedule_id}/`;
//             console.log('socket url: ', socketUrl);
//             const offscreencanvas = this.canvas.transferControlToOffscreen();
//             this.worker.postMessage(
//                 {
//                     message: 'game_worker_create_remote',
//                     // message: 'game_worker_create_local',
//                     offscreencanvas,
//                     socketUrl,
//                 },
//                 [offscreencanvas],
//             );
//         } catch (error) {
//             console.log('unable to connect to game websocket: ', error);
//         }
//     }

//     terminateGame() {
//         console.log('terminate game');
//         // console.log('game inited: ', this.#gameInited);
//         console.log('game started: ', this.#gameStarted);
//         // if (!this.#gameInited) return;
//         console.log('terminate game yoo');
//         this.worker.postMessage({ message: 'worker_game_terminate' });
//         // this.#gameInited = false;
//         this.worker.terminate();
//     }

//     startGame() {
//         console.log('start game');
//         // console.log('game inited: ', this.#gameInited);
//         console.log('game started: ', this.#gameStarted);
//         // if (!this.#gameInited || this.#gameStarted) return;
//         console.log('start game yoo');
//         this.worker.postMessage({ message: 'worker_game_start' });
//         this.#gameStarted = true;
//     }

//     quitGame() {
//         console.log('quit game');
//         // if (!this.#gameInited || !this.#gameStarted) return;
//         console.log('start game yoo');
//         this.worker.postMessage({ message: 'worker_game_quit' });
//         this.#gameStarted = false;
//     }

//     pauseGame() {
//         this.worker.postMessage({ message: 'worker_game_pause' });
//     }

//     continueGame() {
//         this.worker.postMessage({ message: 'worker_game_resume' });
//     }

//     resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
//         console.log('resize canvas');
//         this.worker.postMessage({
//             message: 'worker_game_resize',
//             width: newCanvasWidth,
//             height: newCanvasHeight,
//             dpr,
//         });
//     }

//     get scorePlayerOne() {
//         return this.gameData.player_one.score;
//     }

//     get scorePlayerTwo() {
//         return this.gameData.player_two.score;
//     }

//     get playerOneWon() {
//         return this.gameData.player_one.won;
//     }

//     get playerTwoWon() {
//         return this.gameData.player_two.won;
//     }
// }
