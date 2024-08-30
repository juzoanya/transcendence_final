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

        // console.log('queue after: ', this.#updateQueueNew.map(u => u.tickno));
    }

    /** @param {ArrayBuffer} data  */
    handleSnapshotMessage(data) {
        const currT = performance.now();
        const list = parseSnapshot(data);
        console.log('\n----> NEW snapshots: ', list.map(u => u.tickno));
        const diff = currT - this.lastSnapshottime;
        if (diff < 1000) {
            this.maxlastsnap = Math.max(this.maxlastsnap, diff);
        }
        this.minlastsnap = Math.min(this.minlastsnap, diff);
        console.log('time since last: ', diff, ', max: ', this.maxlastsnap, ', min: ', this.minlastsnap);
        this.lastSnapshottime = currT;
        
        // list.forEach(s => {
        //     console.log(`tick ${s.tickno} time: ${s.timestamp_ms} ball x: ${s.ball.x} y: ${s.ball.y} dx: ${s.ball.dx} dy: ${s.ball.dy}`);
        // });
        this.insertNewSnapshots(list);
        // if (list.length === 1 && list[0].tickno === 1) {
        //     this.#predictedTick = 1;
        //     // this.gameTime = this.#tickDuration;
        //     super.startGame();
        // }
        if (this.moveCommandBuffer.length > 0) {
            this.#pushCommandToSocket({cmd: 'client-move-list', movements: this.moveCommandBuffer});
            this.moveCommandBuffer = [];
        }
        return;

       
        
        
        // // console.log('time since last snapshot: ', currT - this.lastSnapshot);
        // this.lastSnapshot = currT;
        
        
        // // console.log('updatedata: ', list);
        // let changed = [], neww = [], ahead = 0;
        
        // let i = 0, size_new = list.length, size_old = this.#updateQueueNew.length;
        // while (size_new > 0 && size_old > 0 && list[i] && this.#updateQueueNew[0] &&list[i].tickno < this.#updateQueueNew[0].tickno) {
        //     ++i;
        // }
        // ahead = i;
        // while (i < size_new && i < size_old && this.#updateQueueNew[i] && list[i] &&this.#updateQueueNew[i].tickno === list[i].tickno) {
        //     this.#updateQueueNew[i] = list[i];
        //     changed.push(i);
        //     ++i;
        // }
        // while (i < size_new) {
        //     this.#updateQueueNew.push(list[i]);
        //     neww.push(i);
        //     ++i;
        // }

        // console.log('updatequeue after insertion of new snapshots: ', this.#updateQueueNew.map(u => u.tickno));
        
        // // console.log('ahead: ', ahead, ', updated: ', changed, ', new: ', neww);
        
        // if (this.moveCommandBuffer.length > 0) {
        //     this.#pushCommandToSocket({cmd: 'client-move-list', movements: this.moveCommandBuffer});
        //     this.moveCommandBuffer = [];
        // }
        // this.#updateQueueNew.push(list[0]);
        return;
    }

    handleSocketMessage = (data) => {
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
            this.#interpolationTimeMs = 200;
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
 

    /** @param {number} elapsedMs @param {number} workerCurrentTimeMs  */
    renderByTimestamp(elapsedMs, workerCurrentTimeMs) {
        this.#serverGameTime += elapsedMs;
        this.calcTick(elapsedMs);
        this.#lastWorkerTimeOnRender = workerCurrentTimeMs;

        const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
        const q = this.#updateQueueNew;
        let shifted = 0;
        while (q.length >= 2 && q[1].timestamp_ms < renderTime) {
            q.shift();
            shifted++;
        }
        const elapsedSec = elapsedMs / 1000;
        if (q.length >= 2) {
            const cU = q[0];
            const nU = q[1];
            const elapsed = (renderTime - cU.timestamp_ms) / (nU.timestamp_ms - cU.timestamp_ms);
            // console.log('');
            // console.log('renderTime: ', renderTime, 'interp ms: ', this.#interpolationTimeMs, 'elapsed: ', elapsed, 'queuelen: ', q.length, 'removed from queue: ', shifted);
            // console.log('cU.timestamp_ms: ', cU.timestamp_ms, 'tick: ', cU.tickno);
            // console.log('nU.timestamp_ms: ', nU.timestamp_ms, 'tick: ', nU.tickno);
            // if (this.manager.side === "left") {
            //     this.manager.paddleLeft.update(elapsedSec);
            //     this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed, false);
            // } else {
            //     this.manager.paddleRight.update(elapsedSec);
            //     this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed, false)
            // }
            // this.manager.ball.interpolate(cU.ball, nU.ball, elapsed, true);
            // this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
            // this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
            // this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
        } else {
            // console.log('extrapolate remote');
            this.manager.paddleRight.update(elapsedSec);
            this.manager.paddleLeft.update(elapsedSec);
            this.manager.ball.updateBall(elapsedSec, this.manager.paddleLeft, this.manager.paddleRight);
        }
        this.manager.draw(this.manager.scoreBreak == false, 0);
    }

    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
        // this.renderByTimestamp(elapsedMs, workerCurrentTimeMs);
        this.renderByTimestampNew(elapsedMs, workerCurrentTimeMs);
    }

    // /** @param {number} elapsedMs */
    // predictNewSnapshot(elapsedMs) {      
        
    //     this.#serverGameTime += elapsedMs;
        
    //     let oldPredicted = this.#predictedTick;
    //     const [tickbuffer, predictedTicks] = this.getUpdatedTicks(this.#tickbuffer + elapsedMs, this.#predictedTick, this.#tickDuration);
    //     this.#tickbuffer = tickbuffer;
    //     this.#predictedTick = predictedTicks;
    //     const tickDurationSec = this.#tickDuration / 1000;

    //     // console.log('oldPredictedTickno: ', oldPredicted);
    //     // console.log('newPredictedTickno: ', predictedTicks);
        

    //     let lastSnapshot =this.#updateQueueNew.at(-1);
    //     if (lastSnapshot == undefined) {
    //         // console.log('CREATE LAST SNAPSHOT');
            
    //         let x, y, dx, dy;
    //         lastSnapshot = {
    //             paddle_left: ({x, y, dx, dy} = this.manager.paddleLeft),
    //             paddle_right: ({x, y, dx, dy} = this.manager.paddleRight),
    //             ball: {x:this.manager.ball.x, y:this.manager.ball.y, dx:0, dy:0},
    //             tickno: 0,
    //             timestamp_ms: this.#serverGameTime
    //         }
    //     }
    //     // console.log('lastSnapshot: ', lastSnapshot);

    //     let oldServerTime = this.#serverGameTime;
    //     // if (lastSnapshot) {

    //     //     let lastSnapshotTick = lastSnapshot.tickno;
            
    //     //     /** @type {PongServerTypes.GameObjPosBinary} */
    //     //     let paddle_left = lastSnapshot.paddle_left,  paddle_right = lastSnapshot.paddle_right, ball = lastSnapshot.ball;
            
    //     //     // console.log('queue before prediction: ', this.#updateQueueNew.map(i => i.tickno));
            
    //     //     while (lastSnapshotTick < predictedTicks + 1) {
    //     //         // oldServerTime += this.#tickDuration;
    //     //         lastSnapshotTick++;
    //     //         const timeSnap = this.#tickDuration * lastSnapshotTick;
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - FROM: paddle left x: ${paddle_left.x} y: ${paddle_left.y} dx: ${paddle_left.dx} dy: ${paddle_left.dy}`);
    //     //         paddle_left = this.manager.paddleLeft.getPredictedXY(paddle_left, tickDurationSec),
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - TO: paddle left x: ${paddle_left.x} y: ${paddle_left.y} dx: ${paddle_left.dx} dy: ${paddle_left.dy}`);
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - FROM: paddle right x: ${paddle_right.x} y: ${paddle_right.y} dx: ${paddle_right.dx} dy: ${paddle_right.dy}`);
    //     //         paddle_right = this.manager.paddleRight.getPredictedXY(paddle_right, tickDurationSec),
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - TO: paddle right x: ${paddle_right.x} y: ${paddle_right.y} dx: ${paddle_right.dx} dy: ${paddle_right.dy}`);
    //     //         // ball = this.manager.scoreBreak ? ball : this.manager.ball.getPredictedXY(ball, tickDurationSec, this.manager.paddleLeft, this.manager.paddleRight),
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - FROM: ball x: ${ball.x} y: ${ball.y} dx: ${ball.dx} dy: ${ball.dy}`);
    //     //         ball = this.manager.ball.getPredictedXY(ball, tickDurationSec, this.manager.paddleLeft, this.manager.paddleRight),
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - TO: ball x: ${ball.x} y: ${ball.y} dx: ${ball.dx} dy: ${ball.dy}`);
    //     //         // console.log(`predict tick: ${lastSnapshotTick} time: ${timeSnap} - STATE OF BALL: ball x: ${this.manager.ball.x} y: ${this.manager.ball.y} dx: ${this.manager.ball.dx} dy: ${this.manager.ball.dy}`);
    //     //         this.#updateQueueNew.push({predicted: true, paddle_left, paddle_right, ball, tickno: lastSnapshotTick, timestamp_ms: timeSnap});
    //     //     }
    //     // }


        
    // }

    // /** @param {PongClientTypes.MovementKey | PongClientTypes.MovementMouse} move  */
    // rePredictSnapshot(move) {
    //     const tick = this.#predictedTick;
    //     // console.log('REPREDICT SNAPSHOT:tick: ', tick,' move: ', move);
    //     // console.log('REPREDICT my queue: ', this.#updateQueueNew.map(i => i.tickno));
        
    //     const snapshot = this.#updateQueueNew.find(i => i.tickno === tick);
    //     const nextSnapshot = this.#updateQueueNew.find(i => i.tickno+1 === tick);
    //     if (snapshot && nextSnapshot && nextSnapshot.predicted === true) {
    //         if (this.manager.side === 'left') {
    //             // console.log('REPREDICT PADDLE: ', this.manager.paddleLeft);
                
    //             nextSnapshot.paddle_left = this.manager.paddleLeft.getPredictedXY(snapshot.paddle_left, this.#tickDuration, move);
    //         } else {
    //             nextSnapshot.paddle_right = this.manager.paddleLeft.getPredictedXY(snapshot.paddle_right, this.#tickDuration, move);
    //         }
    //     }
    // }

    gameTime = 0;
    /** @param {number} elapsedMs  */
    renderByTimestampNew(elapsedMs, workerCurrentTimeMs) {
        this.gameTime += elapsedMs;

    this.#lastWorkerTimeOnRender = workerCurrentTimeMs;

        this.predictNewSnapshot(elapsedMs);
        // const q = this.#updateQueueNew;
        const renderTime = this.#serverGameTime - this.#interpolationTimeMs;

        // const lastInterpolatedTick = this.#predictedTick - this.interpolationRatio;
        const lastInterpolatedTick = this.#predictedTick - 6;
        // console.log('lastInterpolatedTick: ', lastInterpolatedTick, 'new queue after prediction, before filter: ', this.#updateQueueNew.map(i => i.tickno));
        // console.log('new queue after prediction, before filter: ', this.#updateQueueNew.map(i => i.tickno));
        // this.#updateQueueNew = this.#updateQueueNew.filter((u => u.timestamp_ms > renderTime - this.#tickDuration));
        // this.#updateQueueNew = this.#updateQueueNew.find(u => u.timestamp_ms > renderTime)
        // this.#updateQueueNew = this.#updateQueueNew.filter((u => u.tickno > lastInterpolatedTick));
        // console.log('queue after filter: ', this.#updateQueueNew.map(i => i.tickno));
        
    
        // let i = 0, curr, neww;
        // while (i < this.#updateQueueNew.length) {
        //     if (this.#updateQueueNew[i].tickno > lastInterpolatedTick) {
        //         neww = this.#updateQueueNew[i];
        //         curr = this.#updateQueueNew[i-1];
        //     }
        //     i++;
        // }
        // while (curr && this.#updateQueueNew[0] && this.#updateQueueNew[0].tickno < curr.tickno) {
        //     this.#updateQueueNew.shift();
        // }
        // let i = 0, curr, neww;
        // while (i < this.#updateQueueNew.length) {
        //     if (this.#updateQueueNew[i].timestamp_ms > renderTime) {
        //         neww = this.#updateQueueNew[i];
        //         curr = this.#updateQueueNew[i-1];
        //     }
        //     i++;
        // }
        // while (curr && this.#updateQueueNew[0] && this.#updateQueueNew[0].timestamp_ms < curr.timestamp_ms) {
        //     this.#updateQueueNew.shift();
        // }

        while (this.#updateQueueNew[1] && this.#updateQueueNew[1].timestamp_ms < renderTime) {
            this.#updateQueueNew.shift();
        }
        const curr = this.#updateQueueNew[0];
        const neww = this.#updateQueueNew[1];

        if (elapsedMs > 18) {
            console.log('elapsed: ', elapsedMs);
        }
        
        // console.log('new queue after prediction, after filter: ', this.#updateQueueNew.map(i => i.tickno));
        
        
    //    |    |  r |    |    |
    //    1    2    3    4    5
        
        const clientCurr = this.#updateQueueNew.at(-2);
        const clientNeww = this.#updateQueueNew.at(-1);
        if (curr && neww && clientCurr && clientNeww) {

          

            const prevPred = curr.predicted ? 'previcted' : 'from server';
            const newPred = neww.predicted ? 'previcted' : 'from server';

            // console.log(`interpolate prev: ${prevPred} ${curr.tickno}  -  to new: ${newPred} ${neww.tickno}`);
            

            const elapsed = (renderTime - curr.timestamp_ms) / (neww.timestamp_ms - curr.timestamp_ms);
            // const elapsed = this.#tickbuffer / this.#tickDuration;

            // console.log('');
            // console.log('renderTime: ', renderTime, 'interp ms: ', this.#interpolationTimeMs, 'elapsed: ', elapsed, 'queuelen: ', q.length);
            // console.log('cU.timestamp_ms: ', q[0].timestamp_ms, 'tick: ', q[0].tickno);
            // console.log('nU.timestamp_ms: ', q[1].timestamp_ms, 'tick: ', q[1].tickno);


            // if (this.manager.side === 'left') {
            //     this.manager.paddleLeft.interpolate(clientCurr.paddle_left, clientNeww.paddle_left, elapsed, false, false)
            //     this.manager.paddleRight.interpolate(curr.paddle_right, neww.paddle_right, elapsed, false, true);
            // } else {
            //     this.manager.paddleRight.interpolate(clientCurr.paddle_right, clientNeww.paddle_right, elapsed, false, false);
            //     this.manager.paddleLeft.interpolate(curr.paddle_left, neww.paddle_left, elapsed, false, true)
            // }
                this.manager.paddleRight.interpolate(curr.paddle_right, neww.paddle_right, elapsed, false, true);
                this.manager.paddleLeft.interpolate(curr.paddle_left, neww.paddle_left, elapsed, false, true)


            this.manager.ball.interpolate(curr.ball, neww.ball, elapsed, true, true);

            // this.interpolateEntities(curr, neww, elapsed);
        }
        this.manager.draw(this.manager.scoreBreak == false, this.#updateQueueNew.length);
    }

    // /** @param {number} elapsedMs  */
    // renderByTick(elapsedMs) {
    //     const q = this.#updateQueueNew;
    //     const shifted = 
    //     this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
    //     this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
    //     this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
    // }

    // /**
    //  * @param {PongServerTypes.GameUpdateBinaryItem} cU 
    //  * @param {PongServerTypes.GameUpdateBinaryItem} nU 
    //  * @param {number} elapsed 
    //  */
    // interpolateEntities(cU, nU, elapsed) {
    //     this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed, false);
    //     this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed, false)
    //     this.manager.ball.interpolate(cU.ball, nU.ball, elapsed, true);
    // }


    // getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeSec = () => this.getGameTimeMs()/1000;

    /** @type {PongClientTypes.ClientMovement[]} */
    moveCommandBuffer = [];

    /** @param {PongClientTypes.ClientMoveDirection} [action] @param {number} [new_y]  */
    pushMove(action, new_y) {
        // const elapsedMs = performance.now() - this.#lastWorkerTimeOnRender;
        // let tickbuffer = this.#tickbuffer + elapsedMs;
        // let predictedTick = this.#predictedTick;
        // while (tickbuffer > this.#tickDuration) {
        //     predictedTick += 1;
        //     tickbuffer -= this.#tickDuration
        // }
        const [tickdiff, tickno] = this.getUpdatedTicks(this.#tickbuffer + (performance.now() - this.#lastWorkerTimeOnRender), this.#predictedTick, this.#tickDuration);
        /** @type {PongClientTypes.MovementKey | PongClientTypes.MovementMouse | undefined} */
        let move;
        if (action != undefined) {
            move = {tickno, tickdiff, action};
        } else if (new_y != undefined) {
            move = {tickno, tickdiff, new_y};
        }
        // console.log('REPREDICT - Push move: ', move);
        
        if(move != undefined) {
            // console.log('REPREDICT - call this.rePredictSnapshot');
            this.rePredictSnapshot(move);
            this.moveCommandBuffer.push(move);
        }
        return;
        // this.#pushCommandToSocket({
        //     cmd: "client-move",
        //     action,
        //     new_y,
        //     timestamp_sec: this.getGameTimeSec(),
        //     tickno: predictedTick,
        //     tickdiff: tickbuffer
        // })
    }

    /** @type {PongClientTypes.ClientMoveDirection | null} */
    lastKeyAction = null;
    /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
    handleKey (d) {
        let action;
        if (this.manager.side === "left") {
            action = this.manager.paddleLeft.handleKey(false, d, "ArrowUp", "ArrowDown");
        } else {
            action = this.manager.paddleRight.handleKey(false, d, "ArrowUp", "ArrowDown");
        }
        // console.log('REPREDICT: ---> MOVE done: ', action);
        if (typeof action === "string") {
            // console.log('REPREDICT: ---> MOVE');
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
            // console.log('push new y to server: ', new_y);
            // if (e > 50) {
            //     console.log('push new y to server: ', new_y);
            //     this.#lastMoveTime = c;
            // }
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

