import { PongObjManager } from './PongObjManager';
import { getSocketErrorMessage, parseSnapshot, printCommandResponse, pushMessageToMainThread, ServerMessageMap, useMedian, WebsocketErrorCode } from './utils';
import { Pong } from './Pong';
import { GameSocket } from './Socket';



export class PongRemote extends Pong {
    /**@type {GameSocket | undefined} */
    #socket = undefined;

    lastSnapshottime = performance.now();
    maxlastsnap = 0;
    minlastsnap = 4334565436;

    /** @param {PongServerTypes.GameUpdateBinaryItem[]} snapshots  */
    insertNewSnapshots(snapshots) {
        // console.log('snapshots: ', snapshots.map(u => u.tickno));
        // console.log('queue before: ', this.#updateQueueNew.map(u => u.tickno));
        
        snapshots.forEach((snapshot) => {
            const last = this.#updateQueueNew.at(-1);
            if (last == undefined || snapshot.tickno > last.tickno) {
                this.#updateQueueNew.push(snapshot);
                // console.log('PUSH BACK NEW SNAPSHOT');
                
            } else {
                const i = this.#updateQueueNew.findIndex(u => u.tickno === snapshot.tickno);
                if (i !== -1) {
                    // console.log('OLD SNAPSHOT tick: ', this.#updateQueueNew[i].tickno);
                    // console.log('OLD SNAPSHOT time: ', this.#updateQueueNew[i].timestamp_ms);
                    // console.log('OLD SNAPSHOT ball x: ', this.#updateQueueNew[i].ball.x);
                    // console.log('OLD SNAPSHOT ball y: ', this.#updateQueueNew[i].ball.y);
                    // console.log('REPLACE SNAPSHOT tick: ', snapshot.tickno);
                    // console.log('REPLACE SNAPSHOT time: ', snapshot.timestamp_ms);
                    // console.log('REPLACE SNAPSHOT ball x: ', snapshot.ball.x);
                    // console.log('REPLACE SNAPSHOT ball y: ', snapshot.ball.y);
                    
                    this.#updateQueueNew[i] = snapshot;
                }
            }
        });
    }

    /** @param {ArrayBuffer} data  */
    handleSnapshotMessage(data) {
        const list = parseSnapshot(data);
        console.log('new snapshots: ', list.map(i => i.tickno));
        
        this.insertNewSnapshots(list);
        if (this.moveCommandBuffer.length > 0) {
            this.#pushCommandToSocket({cmd: 'client-move-list', movements: this.moveCommandBuffer});
            this.moveCommandBuffer = [];
        }
    }

    handleSocketMessage = (data) => {
        console.log('new msg: ', data);
        
        try {
            if (data instanceof ArrayBuffer) {
                this.handleSnapshotMessage(data);
            } else {
                
                
                /** @type {PongTypes.GeneralServerMessage} */
                const message = data;
                /** @type {PongTypes.ServerMessageCallback<any> | undefined} */
                let func;
                if ('tag' in message) {
                    if (message.tag !== "server-game-update") {
                        console.log('server message: ', message.tag);

                    }
                    func = this.#messageHandlerMap.getHandler(message.tag);
                    if (func) func(message);
                } else if ('cmd' in message) {
                    if (message.status_code !== WebsocketErrorCode.OK)
                        pushMessageToMainThread({message: "from-worker-error", error: message.message, errorCode: message.status_code})
                    func = this.#messageHandlerMap.getHandler(message.cmd);
                    if (func) func(message);
                }
            }
        } catch (error) {
            console.log('PONG REMOTE: ERROR HANDLE SERVER MESSAGE: ', error);
            this.#socket?.close();
            super.quitGame();
        }
    }

    /** @param {ToWorkerGameMessageTypes.Create} d  */
    constructor(d) {
        if (!d.socketUrl) throw new Error('no socket url provided');
        super(d.offscreencanvas, true, d.userId);
        this.socketUrl = d.socketUrl;
        
        this.#socket = new GameSocket(d.socketUrl)
        this.#socket.addHandler("message", this.handleSocketMessage);
        this.#socket.addHandler("disconnected", () => {
            pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: this.manager.userId ?? -1})
            super.pauseGame();
        });
        this.#socket.addHandler("reconnected", () => {
            pushMessageToMainThread({message: "from-worker-client-reconnected", user_id: this.manager.userId ?? -1})
            super.resumeGame();
        });
        this.#socket.addHandler("reconnected_failure", () => {
            super.quitGame();
            self.close();
        });
        
        this.#socket.addHandler("closed",/** @param {CloseEvent} e */ (e) => {
            console.log('closed: ', e);
            if (e.code >= 4000 && e.code !== WebsocketErrorCode.OK)
                pushMessageToMainThread({message: "from-worker-error", error: e.reason, errorCode: e.code})
        });

        this.interpolationRatio = 4;
        this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
            this.#interpolationTimeMs =  (this.interpolationRatio / b.settings.tick_rate) * 1000;
            // this.#interpolationTimeMs = 200;
            this.#tickDuration = 1000/b.settings.tick_rate
            // console.log('tickduration: ', this.#tickDuration);
            // console.log('this.#interpolationTimeMs: ', this.#interpolationTimeMs);
            
            
            this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
            this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
            this.reconnectTimeoutMs = b.reconnect_timeout_sec * 1000;
            // console.log('start_timeout_sec: ', b.start_timeout_sec);
            // console.log('reconnectTimeoutMs: ', this.reconnectTimeoutMs);
            pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: b.start_timeout_sec});
            this.frame.renderAtMostOnce();
        });
        this.#messageHandlerMap.setHandler("server-game-start", (b) => {
            // this.#serverGameTime = b.timestamp_ms;
            this.#serverGameTime = 0;
            console.log('start game: ', b.timestamp_ms);
            pushMessageToMainThread({message: "from-worker-game-started", ballTimeoutSec: this.manager.ballTimeout/1000});
            super.startGame();
            // this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
        })
        this.#messageHandlerMap.setHandler("server-game-update", (b) => {
            // // console.log('ON SERVER UPDATE');
            for (let i = 0; i < b.invalid_ticks; i++) {
            //     console.log('REMOVE');
                this.#updateQueue.pop()
            }
            // Error handling message: You cannot call this from an async context - use a thread or sync_to_async.

            // console.log('predicted time to real time diff: ', this.getGameTimeMs() - b.timestamp_ms);
            // this.#serverGameTime = b.timestamp_ms
            this.#updateQueue.push(b);
            this.#updateQueue.sort((upd1, upd2)=>upd1.timestamp_ms - upd2.timestamp_ms)
            this.#recentFrame += 1;
        });
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
    /** @type {PongClientTypes.ClientCommand | null} */
    #lastCommand = null;
    /** @type {PongClientTypes.ClientMoveDirection | undefined} */
    #lastMove;
    #serverOffset = useMedian();
    #serverRTT = useMedian();
    #recentFrame = 0;
    #interpolationTimeMs = 200;
    #lastWorkerTimeOnRender = performance.now();
    
    #tickDuration = 0
    #predictedTick = 0
    #tickbuffer = 0

    #serverGameTime = performance.now();
    
    /** @type {PongServerTypes.GameUpdate[]} */
    #updateQueue = [];
    /** @type {PongServerTypes.GameUpdateBinaryItem[]} */
    #updateQueueNew = [];

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
 
    calcTick(elapsedMs) {
        this.#tickbuffer += elapsedMs;
        while (this.#tickbuffer > this.#tickDuration) {
            this.#predictedTick += 1;
            this.#tickbuffer = this.#tickbuffer - this.#tickDuration
        }
    }

    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) {
        console.log('render');
        this.renderByTimestampNew(elapsedMs, workerCurrentTimeMs);
    }

    /** @param {number} elapsedMs  */
    renderByTimestampNew(elapsedMs, workerCurrentTimeMs) {
        console.log('render2');
        
        this.#serverGameTime += elapsedMs;
        this.#lastWorkerTimeOnRender = workerCurrentTimeMs;
        const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
        console.log('render, queue: ', this.#updateQueueNew.map(i => i.tickno));
        
        while (this.#updateQueueNew[1] && this.#updateQueueNew[1].timestamp_ms < renderTime) {
            this.#updateQueueNew.shift();
        }
        const curr = this.#updateQueueNew[0];
        const neww = this.#updateQueueNew[1];

        if (elapsedMs > 18) {
            console.log('elapsed: ', elapsedMs);
        }
        
        if (curr && neww) {
            const elapsed = (renderTime - curr.timestamp_ms) / (neww.timestamp_ms - curr.timestamp_ms);
            this.manager.paddleRight.interpolate(curr.paddle_right, neww.paddle_right, elapsed, false, true);
            this.manager.paddleLeft.interpolate(curr.paddle_left, neww.paddle_left, elapsed, false, true)
            this.manager.ball.interpolate(curr.ball, neww.ball, elapsed, true, true);
        } else {
            const els = elapsedMs / 1000;
            this.manager.paddleLeft.update(els)
            this.manager.paddleRight.update(els);
            this.manager.ball.updateBall(els, this.manager.paddleLeft, this.manager.paddleRight);
        }
        this.manager.draw(this.manager.scoreBreak == false);
    }

    getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeSec = () => this.getGameTimeMs()/1000;

    /** @type {PongClientTypes.ClientMovement[]} */
    moveCommandBuffer = [];

    /** @param {PongClientTypes.ClientMoveDirection} [action] @param {number} [new_y]  */
    pushMove(action, new_y) {
        const [tickdiff, tickno] = this.getUpdatedTicks(this.#tickbuffer + (performance.now() - this.#lastWorkerTimeOnRender), this.#predictedTick, this.#tickDuration);
        /** @type {PongClientTypes.MovementKey | PongClientTypes.MovementMouse | undefined} */
        let move;
        if (action != undefined) {
            move = {tickno, tickdiff, action};
        } else if (new_y != undefined) {
            move = {tickno, tickdiff, new_y};
        }
        if(move != undefined) {
            this.moveCommandBuffer.push(move);
        }
        return;
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
            if (this.#lastMoveTime - c > this.#tickDuration) {
                this.pushMove(undefined, new_y);
                this.#lastMoveTime = c;
            }
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
        this.#socket?.close();
        this.#messageHandlerMap.setHandler("server-user-surrendered", (b) => {
        })
        this.#messageHandlerMap.setHandler("client-leave-game", (r) => {
            printCommandResponse(r);
        })
    }

   
    /** @param {PongClientTypes.ClientCommand} command */
    #pushCommandToSocket = (command) => {
        try {
            command.id = this.#commandNbr;
            // this.#commandStack.set(this.#commandNbr.toString(), command);
            this.#commandNbr += 1;
            this.lastCommand = command
            this.#socket?.sendMessage(command);
        } catch (error) {
            console.log('error sent to socket: ', error);
            console.log('PONG REMOTE: pushCommandToSocket ERROR');
            this.#socket?.close();
            super.quitGame();
        }
    }
}
