import { PongObjManager } from './PongObjManager';
import { getSocketErrorMessage, parseSnapshot, printCommandResponse, pushMessageToMainThread, ServerMessageMap, Tick, useMedian, WebsocketErrorCode } from './utils';
import { Pong } from './Pong';
import { GameSocket } from './Socket';



export class PongRemote extends Pong {
    lastSnapshottime = performance.now();
    maxlastsnap = 0;
    minlastsnap = 4334565436;

   

    /** @param {PongServerTypes.GameUpdateBinaryItem} snapshot  */
    printSnapshot(snapshot) {
        console.log(`tick: ${snapshot.tickno} time: ${snapshot.timestamp_ms} - paddle left x: ${snapshot.paddle_left.x} y: ${snapshot.paddle_left.y} dx: ${snapshot.paddle_left.dx} dy: ${snapshot.paddle_left.dy}`);
        console.log(`tick: ${snapshot.tickno} time: ${snapshot.timestamp_ms} - paddle right x: ${snapshot.paddle_right.x} y: ${snapshot.paddle_right.y} dx: ${snapshot.paddle_right.dx} dy: ${snapshot.paddle_right.dy}`);
        console.log(`tick: ${snapshot.tickno} time: ${snapshot.timestamp_ms} - ball x: ${snapshot.ball.x} y: ${snapshot.ball.y} dx: ${snapshot.ball.dx} dy: ${snapshot.ball.dy}`);
    }


    /** @param {ToWorkerGameMessageTypes.Create} d  */
    constructor(d) {
        if (!d.socketUrl) throw new Error('no socket url provided');
        super(d.offscreencanvas, true, d.userId);
        this.socketUrl = d.socketUrl;
        this.socketworker = new Worker(new URL('./SocketWorkerPredictor.js', import.meta.url), {
            type: 'module',
        });

        this.socketworker.onerror = (error) => {
            console.log('SocketWorker: error: ', error);
        }
        this.socketworker.onmessageerror = (error) => {
            console.log('SocketWorker: onmessageerror: ', error);
        }
        this.#pushCommandToSocketWorker({message: 'socket_worker_create', socketUrl: d.socketUrl});

        this.socketworker.onmessage = (ev) => {
            /** @type {FromWorkerSocketMessageTypes.FromWorkerMessage} */
            const msg = ev.data;
            console.log('onSocketWorkerMessage: ', msg.message, ', ', msg.message === 'from-worker-socket-update' ? msg.snapshots.map(i => i.tickno) : '');
            
            switch (msg.message) {
                case 'from-worker-socket-update':
                    // console.log('new update: ', msg.snapshots.map(i => i.tickno));
                    
                    this.#updateQueue = msg.snapshots;
                    break;
                case 'from-worker-socket-disconnected':
                    pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: this.manager.userId ?? -1})
                    super.pauseGame();
                    break;
                case 'from-worker-socket-closed':
                    console.log('closed: ', msg);
                if (msg.code >= 4000 && msg.code !== WebsocketErrorCode.OK)
                    pushMessageToMainThread({message: "from-worker-error", error: msg.reason, errorCode: msg.code})
                    this.socketworker.terminate();
                    self.close();
                    break;
                case 'from-worker-socket-reconnect-failure':
                    super.quitGame();
                    this.socketworker.terminate();
                    self.close();
                    break;
                case 'from-worker-socket-reconnected':
                    pushMessageToMainThread({message: "from-worker-client-reconnected", user_id: this.manager.userId ?? -1})
                    super.resumeGame();
                    break;
                case 'from-worker-socket-error':
                    this.socketworker.terminate();
                    self.close();
                    break;
                case 'from-worker-socket-message':
                    /** @type {PongTypes.ServerMessageCallback<any> | undefined} */
                    let func;
                    if (msg.broadcast) {
                        func = this.#messageHandlerMap.getHandler(msg.broadcast.tag);
                        if (func) func(msg.broadcast);
                    } else if (msg.response) {
                        if (msg.response.status_code !== WebsocketErrorCode.OK)
                            pushMessageToMainThread({message: "from-worker-error", error: msg.response.message, errorCode: msg.response.status_code})
                        func = this.#messageHandlerMap.getHandler(msg.response.cmd);
                        if (func) func(msg.response);
                    }
                    break;
                case 'from-worker-socket-new-snapshots':
                    break;
                
                default:
                    break;
            }
        }
        

        this.interpolationRatio = 2;
        this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
            this.initialGameData = b;
            this.#interpolationTimeMs =  (this.interpolationRatio / b.settings.tick_rate) * 1000;
            this.tick = new Tick(b.settings.tick_rate)

            this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
            this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
            pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: b.start_timeout_sec});
            this.frame.renderAtMostOnce();
        });
        this.#messageHandlerMap.setHandler("server-game-start", (b) => {
            console.log('start game: ', b.timestamp_ms);
            this.#pushCommandToSocketWorker({message: 'socket_worker_client_start_updates', data: this.initialGameData});
            pushMessageToMainThread({message: "from-worker-game-started", ballTimeoutSec: this.manager.ballTimeout/1000});
            super.startGame();
            // this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
        })
        this.#messageHandlerMap.setHandler("server-user-connected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-connected", user_id: b.user_id})
        });
        this.#messageHandlerMap.setHandler("server-user-disconnected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: b.user_id})
            super.pauseGame();
        });
        this.#messageHandlerMap.setHandler("server-user-reconnected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-reconnected", user_id: b.user_id})
            super.resumeGame();
        });
        this.#messageHandlerMap.setHandler("server-game-paused", (b) => {
            super.pauseGame();
            pushMessageToMainThread({message: "from-worker-game-paused"});
        });
        this.#messageHandlerMap.setHandler("server-game-resumed", (b) => {
            super.resumeGame();
            pushMessageToMainThread({message: "from-worker-game-resumed"});
        });
        this.#messageHandlerMap.setHandler("client-move", (r) => {
            // console.log('command-response: ', r);
            const prev = this.#commandStack.get(r.id.toString());
            // console.log('command was: ', prev);
        })
        this.#messageHandlerMap.setHandler("server-game-player-scored", (b) => {
            console.log('-----> SCORED');
            
            setTimeout(() => {
                this.manager.remoteScored(b.side);
            }, this.#interpolationTimeMs);
        })
        this.#messageHandlerMap.setHandler("server-game-end", (b) => {
            this.manager.remoteEndGame(b.winner_side, b.reason, b.game_result);
            // this.manager.makeAction(b.winner_side, "remote-game-end-message-main-winner-side", b.reason, b.game_result)
            super.quitGame();
        });

        
    }
    /** @type {Map<string, PongClientTypes.ClientCommand>} */
    #commandStack = new Map();
    #commandNbr = 1;
    /** @type {PongClientTypes.ClientMoveDirection | undefined} */
    #lastMove;
    #interpolationTimeMs = 200;
    #lastWorkerTimeOnRender = performance.now();
    

    #gameTime = 0;
    
    /** @type {PongServerTypes.GameUpdateBinaryItem[]} */
    #updateQueue = [];

    #messageHandlerMap = new ServerMessageMap();
    

    /**
     * @param {number} newTickBuffer 
     * @param {number} predictedTick 
     * @param {number} tickDuration 
     * @returns {[number, number]}
     */
    getUpdatedTicks(newTickBuffer, predictedTick, tickDuration) {
        while (newTickBuffer > tickDuration) {
            predictedTick += 1;
            newTickBuffer -= tickDuration;
        }
        return [newTickBuffer, predictedTick];
    }
 

    elapsmax = 0;
    elapsmin = 37594225;
    lastt = performance.now();
    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) {
        // this.renderByTimestamp(elapsedMs, workerCurrentTimeMs);

        const bef = performance.now();

        this.elapsmax = Math.max(this.elapsmax, elapsedMs);
        this.elapsmin = Math.min(this.elapsmin, elapsedMs);
        if (elapsedMs > 18) {
            console.log('elapsed: ', elapsedMs, ', max: ',this.elapsmax, ', min: ', this.elapsmin);
        }
        const aft = performance.now();
        console.log('time to process: ', aft - bef);
                

        this.renderByTimestampNew(elapsedMs, workerCurrentTimeMs);
    }

    /** @param {PongClientTypes.MovementKey | PongClientTypes.MovementMouse} move  */
    rePredictSnapshot(move) {
        const snapshot = this.#updateQueue.find(i => i.tickno === this.tick.runningTick);
        const nextSnapshot = this.#updateQueue.find(i => i.tickno === this.tick.tick);
        if (snapshot && nextSnapshot && nextSnapshot.predicted === true) {
            if (this.manager.side === 'left') {
                nextSnapshot.paddle_left = this.manager.paddleLeft.getPredictedXY(snapshot.paddle_left, this.tick.tickDurationSec, move);
            } else {
                nextSnapshot.paddle_right = this.manager.paddleLeft.getPredictedXY(snapshot.paddle_right, this.tick.tickDurationSec, move);
            }
        }
    }

    lastcurr;
    lastnew;
    /** @param {number} elapsedMs  */
    renderByTimestampNew(elapsedMs, workerCurrentTimeMs) {
        this.#gameTime += elapsedMs;

        this.#pushCommandToSocketWorker({message: 'socket_worker_get_update'});

        this.#lastWorkerTimeOnRender = workerCurrentTimeMs;

        // console.log('new queue after prediction, before filter: ', this.#updateQueue.map(i => i.tickno));
        const prevRenderTime = (this.#gameTime - elapsedMs) - this.#interpolationTimeMs;
        const renderTime = this.#gameTime - this.#interpolationTimeMs;
        

       
        // let shifted = 0;
        // while (this.#updateQueueNew[1] && this.#updateQueueNew[1].timestamp_ms < renderTime) {
        //     this.#updateQueueNew.shift();
        //     shifted++;
        // }
        // this.#pushCommandToSocketWorker({message: 'socket_worker_client_clear_snapshots', timestampMs: renderTime});
 
        
        // this.#updateQueueNew = this.#updateQueueNew.filter(i => i.timestamp_ms > prevRenderTime);
        // this.lastcurr = this.#updateQueueNew.find(i => i.timestamp_ms > prevRenderTime);
        // this.lastnew = this.#updateQueueNew.find(i => i.timestamp_ms > renderTime);


        // if (this.lastcurr && this.lastnew) {
        //     const elapsed = (renderTime - this.lastcurr.timestamp_ms) / (this.lastnew.timestamp_ms - this.lastcurr.timestamp_ms);
           
        //     this.manager.paddleRight.interpolate(this.lastcurr.paddle_right, this.lastnew.paddle_right, elapsed, false, true);
        //     this.manager.paddleLeft.interpolate(this.lastcurr.paddle_left, this.lastnew.paddle_left, elapsed, false, true)
        //     this.manager.ball.interpolate(this.lastcurr.ball, this.lastnew.ball, elapsed, true, true);
        // }
        

        // const clientCurr = this.#updateQueueNew.at(-2);
        // const clientNeww = this.#updateQueueNew.at(-1);
        // if (clientCurr && clientNeww && this.lastcurr && this.lastnew) {
        //     const elapsed = (renderTime - this.lastcurr.timestamp_ms) / (this.lastnew.timestamp_ms - this.lastcurr.timestamp_ms);
        //     const elapsedC = this.#tickbuffer / this.#tickDuration;
        //     if (this.manager.side === 'left') {
        //         this.manager.paddleLeft.interpolate(clientCurr.paddle_left, clientNeww.paddle_left, elapsedC, false, false)
        //         this.manager.paddleRight.interpolate(this.lastcurr.paddle_right, this.lastnew.paddle_right, elapsed, false, true);
        //     } else {
        //         this.manager.paddleRight.interpolate(clientCurr.paddle_right, clientNeww.paddle_right, elapsedC, false, false);
        //         this.manager.paddleLeft.interpolate(this.lastcurr.paddle_left, this.lastnew.paddle_left, elapsed, false, true)
        //     }
        //     this.manager.ball.interpolate(this.lastcurr.ball, this.lastnew.ball, elapsed, true, true);
        // }

        // let shifted = 0;
        // while (this.#updateQueueNew[1] && this.#updateQueueNew[1].timestamp_ms < renderTime) {
        //     this.#updateQueueNew.shift();
        //     shifted++;
        // }
        // const curr = this.#updateQueueNew.find(i => i.timestamp_ms > prevRenderTime);
        // const neww = this.#updateQueueNew.find(i => i.timestamp_ms > renderTime);
        
        
        // const clientCurr = this.#updateQueueNew.find(i => i.timestamp_ms > prevRenderTime + this.#interpolationTimeMs);
        // const clientNeww = this.#updateQueueNew.find(i => i.timestamp_ms > renderTime + this.#interpolationTimeMs);
        // if (clientCurr && clientNeww && curr && neww) {
        //     const elapsed = (renderTime - curr.timestamp_ms) / (neww.timestamp_ms - curr.timestamp_ms);
        //     const elapsedC = this.#tickbuffer / this.#tickDuration;
        //     if (this.manager.side === 'left') {
        //         this.manager.paddleLeft.interpolate(clientCurr.paddle_left, clientNeww.paddle_left, elapsedC, false, false)
        //         this.manager.paddleRight.interpolate(curr.paddle_right, neww.paddle_right, elapsed, false, true);
        //     } else {
        //         this.manager.paddleRight.interpolate(clientCurr.paddle_right, clientNeww.paddle_right, elapsedC, false, false);
        //         this.manager.paddleLeft.interpolate(curr.paddle_left, neww.paddle_left, elapsed, false, true)
        //     }
        //     this.manager.ball.interpolate(curr.ball, neww.ball, elapsed, true, true);
        // }


        let shifted = 0;
        while (this.#updateQueue[1] && this.#updateQueue[1].timestamp_ms < renderTime) {
            this.#updateQueue.shift();
            shifted++;
        }
        const curr = this.#updateQueue[0];
        const next = this.#updateQueue[1];

        // const curr = this.#updateQueue.find(u => u.timestamp_ms > prevRenderTime);
        // const next = this.#updateQueue.find(u => u.timestamp_ms > renderTime);
        // this.#updateQueue = this.#updateQueue.filter(u => u.tickno >= (curr ? curr.tickno : 0));

        if (curr && next) {
            const elapsed = (renderTime - curr.timestamp_ms) / (next.timestamp_ms - curr.timestamp_ms);
           
            // if (this.manager.side === 'left') {
            //     this.manager.paddleLeft.update(elapsedMs/1000);
            //     this.manager.paddleRight.interpolate(curr.paddle_right, next.paddle_right, elapsed, false, true);
            // } else {
            //     this.manager.paddleRight.update(elapsedMs/1000);
            //     this.manager.paddleLeft.interpolate(curr.paddle_left, next.paddle_left, elapsed, false, true)
            // }

            this.manager.paddleRight.interpolate(curr.paddle_right, next.paddle_right, elapsed, false, true);
            this.manager.paddleLeft.interpolate(curr.paddle_left, next.paddle_left, elapsed, false, true)
            this.manager.ball.interpolate(curr.ball, next.ball, elapsed, true, true);
        } else {
            const el = elapsedMs/1000;
            this.manager.paddleRight.update(el);
            this.manager.paddleLeft.update(el);
            this.manager.ball.updateBall(el, this.manager.paddleLeft, this.manager.paddleRight);
        }

        this.manager.draw(this.manager.scoreBreak == false, this.#updateQueue.length);
    }

    getGameTimeMs = () => this.#gameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeSec = () => this.getGameTimeMs()/1000;



    /** @param {PongClientTypes.ClientMoveDirection} [action] @param {number} [new_y]  */
    pushMove(action, new_y) {
        const [tickdiff, tickno] = this.tick.calcTempTick(performance.now() - this.#lastWorkerTimeOnRender);
        /** @type {PongClientTypes.MovementKey | PongClientTypes.MovementMouse | undefined} */
        let move;
        if (action != undefined) {
            move = {tickno, tickdiff, action};
        } else if (new_y != undefined) {
            move = {tickno, tickdiff, new_y};
        }
        if(move != undefined) {
            this.rePredictSnapshot(move);
            this.#pushCommandToSocketWorker({message: 'socket_worker_client_move', move});
        }
    }

    /** @type {PongClientTypes.ClientMoveDirection | null} */
    lastKeyAction = null;
    /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
    handleKey (d) {
        let action;
        if (this.manager.side === "left") {
            action = this.manager.paddleLeft.handleKey(true, d, "ArrowUp", "ArrowDown");
        } else {
            action = this.manager.paddleRight.handleKey(true, d, "ArrowUp", "ArrowDown");
        }
        if (typeof action === "string") {
            if (this.lastKeyAction != action) {
                this.pushMove(action, undefined);
                this.lastKeyAction = action;
            }
        }
    }
    #lastMoveTime = performance.now();
    /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d  */
    handleMouseTouch(d) {
        let new_y;
        const paddle = this.manager.side === "left" ? this.manager.paddleLeft : this.manager.paddleRight;
        new_y = paddle.handleMouseTouch(true, d);
        if (d.touchRect && typeof new_y === "boolean")
            pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: new_y})
        else if (typeof new_y === "number") {
            const c = performance.now();
            const e = c - this.#lastMoveTime;
            this.pushMove(undefined, new_y);
        }
    }

    pauseGame() {
        this.#pushCommandToSocket({ cmd: 'client-pause' });
        this.#messageHandlerMap.setHandler("client-pause", (r) => {
            printCommandResponse(r);
        })
    }
    resumeGame() {
        this.#pushCommandToSocket({ cmd: 'client-resume' });
        this.#messageHandlerMap.setHandler("client-resume", (r) => {
            printCommandResponse(r);
        })
    }
    startGame() {
        this.#pushCommandToSocket({ cmd: 'client-ready' });
        this.#messageHandlerMap.setHandler("client-ready", (r) => {
            printCommandResponse(r);
        })
    }
    quitGame() {
        console.log('PONG REMOTE: quitGame');
        
        this.#pushCommandToSocket({ cmd: 'client-leave-game' });
        super.quitGame();
        this.socketworker.terminate();
        this.#messageHandlerMap.setHandler("server-user-surrendered", (b) => {
        })
        this.#messageHandlerMap.setHandler("client-leave-game", (r) => {
            printCommandResponse(r);
        })
    }

   
    /** @param {ToWorkerSocketMessageTypes.ToWorkerMessage} msg */
    #pushCommandToSocketWorker = (msg, transfer=[]) => {
        try {
            this.socketworker.postMessage(msg, transfer);
        } catch (error) {
            console.log('error sent to socket worker: ', error);
            this.socketworker.terminate();
            super.quitGame();
        }
    }
   
    /** @param {PongClientTypes.ClientCommand} command */
    #pushCommandToSocket = (command) => {
        try {
            command.id = this.#commandNbr;
            this.#commandNbr += 1;
            this.lastCommand = command;
            this.#pushCommandToSocketWorker({message: 'socket_worker_client_command', command})
        } catch (error) {
            console.log('error sent to socket: ', error);
            this.socketworker.terminate();
            super.quitGame();
        }
    }
}

// export class PongRemote extends Pong {

    
//     socketReconnectAttempt = false;
//     /**@type {WebSocket | undefined} */
//     socket = undefined;
//     socketOn = false;
//     heartBeatInterval;
//     heartBeatTimeout;
//     reconnectInterval;
//     reconnectTimeout;
//     reconnectTimeoutMs = 5000;
//     reconnectIntervalMs = 1000;
//     socketUrl;
//     heartbeat_ms;

//     /** @param {ToWorkerGameMessageTypes.Create} d  */
//     constructor(d) {
//         if (!d.socketUrl) throw new Error('no socket url provided');
//         super(d.offscreencanvas, true, d.userId);
//         this.socketUrl = d.socketUrl;
//         this.#messageHandlerMap.setHandler("hello", (b) => {
            
//             // // console.log('SET NEW INTERVAL: hello');
//             this.heartbeat_ms = b.heartbeat_ms;
//             this.startHeartBeat();
//         });

//         this.#messageHandlerMap.setHandler("pong", (b) => {
//             const t1 = b.client_timestamp_ms, t2 = b.server_timestamp_ms, t3 = this.getGameTimeMs()
//             this.#serverRTT.addValue((t3 - t1) / 2)

//             this.#interpolationTimeMs = Math.max(60, Math.min(this.#serverRTT.getMedian() * 4, 150));
//             // // console.log('clear timeout!: ', this.heartBeatTimeout);

//             clearTimeout(this.heartBeatTimeout);
//             this.heartBeatTimeout = undefined;
//         })

//         this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
//             const interpolationRatio = 3;
//             // this.#interpolationTimeMs =  (interpolationRatio / b.settings.tick_rate) * 1000;
//             // // console.log('ready msg, data: ', b);
//             // // console.log('myuserid: ', this.manager.userId);
//             this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
//             this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
//             this.reconnectTimeoutMs = b.reconnect_timeout_sec * 1000;
//             // console.log('start_timeout_sec: ', b.start_timeout_sec);
//             // console.log('reconnectTimeoutMs: ', this.reconnectTimeoutMs);
//             pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: b.start_timeout_sec});
//             this.frame.renderAtMostOnce();
//         });
//         this.#messageHandlerMap.setHandler("server-game-start", (b) => {
//             this.#serverGameTime = b.timestamp;
//             pushMessageToMainThread({message: "from-worker-game-started", ballTimeoutSec: this.manager.ballTimeout/1000});
//             super.startGame();
//             // this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
//         })
//         this.#messageHandlerMap.setHandler("server-game-update", (b) => {
//             // // console.log('ON SERVER UPDATE');
//             for (let i = 0; i < b.invalid_ticks; i++) {
//             //     console.log('REMOVE');
//                 this.#updateQueue.pop()
//             }
//             this.#updateQueue.push(b);
//             this.#updateQueue.sort((upd1, upd2)=>upd1.timestamp - upd2.timestamp)
//             this.#recentFrame += 1;
//         });
//         this.#messageHandlerMap.setHandler("server-user-disconnected", (b) => {
//             pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: b.user_id})
//         });
//         this.#messageHandlerMap.setHandler("client-move", (r) => {
//             // console.log('command-response: ', r);
//             const prev = this.#commandStack.get(r.id.toString());
//             // console.log('command was: ', prev);
//         })
//         this.#messageHandlerMap.setHandler("server-game-player-scored", (b) => {
//             this.manager.makeAction(b.side, "remote-set-score-message-main")
//         })
//         this.#messageHandlerMap.setHandler("server-game-end", (b) => {
//             this.manager.makeAction(b.winner_side, "remote-game-end-message-main-winner-side", b.reason)
//             super.quitGame();
//         });

//         this.connectSocket();
//     }
//     /** @type {Map<string, PongClientTypes.ClientCommand>} */
//     #commandStack = new Map();
//     #commandNbr = 1;
//     /** @type {PongClientTypes.ClientCommand | null} */
//     #lastCommand = null;
//     /** @type {PongClientTypes.ClientMoveDirection | undefined} */
//     #lastMove;
//     #serverOffset = useMedian();
//     #serverRTT = useMedian();
//     #recentFrame = 0;
//     #interpolationTimeMs = 100;
//     #lastWorkerTimeOnRender = performance.now();

//     #serverGameTime = performance.now();
    
//     /** @type {PongServerTypes.GameUpdate[]} */
//     #updateQueue = [];

    
    
 

//     /**
//      * @param {number} workerCurrentTimeMs 
//      * @param {number} workerLastTimeMs 
//      * @param {number} elapsedMs 
//      * @param {number} serverCurrentTimeMs 
//      */
//     render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
//         this.#serverGameTime += elapsedMs;
//         this.#lastWorkerTimeOnRender = workerCurrentTimeMs;
//         // // console.log('elapsed ms: ', elapsedMs);
//         const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
//         // // console.log('render remote');
//         // const renderTime = currUnixTimeStampMs - this.interpMs;
//         while (this.#updateQueue.length >= 2 && this.#updateQueue[1].timestamp < renderTime) {
//             this.#updateQueue.shift();
//             // // console.log('shift queue');
//         }
//         if (this.#updateQueue.length >= 2) {
//             // // console.log('queuelen: ', this.#updateQueue.length);
//             const cU = this.#updateQueue[0];
//             const nU = this.#updateQueue[1];
//             // // console.log('interpolate remote');
//             const elapsed = (renderTime - cU.timestamp) / (nU.timestamp - cU.timestamp);
//             this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
//             this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
//             this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
//         } else {
//             // console.log('extrapolate remote');
//             const elapsedSec = elapsedMs / 1000;
//             this.manager.paddleRight.update(elapsedSec);
//             this.manager.paddleLeft.update(elapsedSec);
//             this.manager.ball.updateBall(elapsedSec);
//         }
//         this.manager.draw();
//     }

//     // getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
//     getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
//     getGameTimeSec = () => this.getGameTimeMs()/1000;

//     /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
//     handleKey (d) {
//         let action;
//         if (this.manager.side === "left") {
//             action = this.manager.paddleLeft.handleKey(true, d, "ArrowUp", "ArrowDown");
//         } else {
//             action = this.manager.paddleRight.handleKey(true, d, "ArrowUp", "ArrowDown");
//         }
//         if (typeof action === "string")
//             this.#pushCommandToSocket({cmd: "client-move", action, timestamp_sec: this.getGameTimeSec()});
//     }
//     /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d  */
//     handleMouseTouch(d) {
//         let new_y;
//         const paddle = this.manager.side === "left" ? this.manager.paddleLeft : this.manager.paddleRight;
//         new_y = paddle.handleMouseTouch(true, d);
//         if (d.touchRect && typeof new_y === "boolean")
//             pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: new_y})
//         else if (typeof new_y === "number")
//             this.#pushCommandToSocket({cmd: "client-move", new_y, timestamp_sec: this.getGameTimeSec()})
//     }

//     pauseGame() {
//         this.#pushCommandToSocket({ cmd: 'client-pause' });
//         this.#messageHandlerMap.setHandler("server-game-paused", (b) => {
//             super.pauseGame();
//         });
//         this.#messageHandlerMap.setHandler("client-pause", (r) => {
//             printCommandResponse(r);
//         })
//     }
//     resumeGame() {
//         this.#pushCommandToSocket({ cmd: 'client-resume' });
//         this.#messageHandlerMap.setHandler("server-game-resumed", (b) => {
//             super.resumeGame();
//         });
//         this.#messageHandlerMap.setHandler("client-resume", (r) => {
//             printCommandResponse(r);
//         })
//     }
//     startGame() {
//         this.#pushCommandToSocket({ cmd: 'client-ready' });
//         this.#messageHandlerMap.setHandler("client-ready", (r) => {
//             printCommandResponse(r);
//         })
//     }
//     quitGame() {
//         this.#pushCommandToSocket({ cmd: 'client-leave-game' });
//         super.quitGame();
//         this.#messageHandlerMap.setHandler("server-user-surrendered", (b) => {
//         })
//         this.#messageHandlerMap.setHandler("client-leave-game", (r) => {
//             printCommandResponse(r);
//         })
//     }

   
//     /** @param {PongClientTypes.ClientCommand} command */
//     #pushCommandToSocket = (command) => {
//         try {
//             command.id = this.#commandNbr;
//             // this.#commandStack.set(this.#commandNbr.toString(), command);
//             this.#commandNbr += 1;
//             this.lastCommand = command
//             this.socket?.send(JSON.stringify(command));
//         } catch (error) {
//             // console.log('error sent to socket: ', error);
//             this.cleanUpCloseSocket();
//         }
//     }
// }

