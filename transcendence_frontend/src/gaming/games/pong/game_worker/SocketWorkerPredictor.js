import PongBall from './Ball';
import GameCourt from './GameCourt';
import { ballDefault, courtDefault, paddleLeftDefault, paddleRightDefault } from './localInitial';
import PongPaddle from './Paddle';
import { GameSocket } from './Socket';
import { Tick } from './utils';


/** @type {GameSocket | undefined} */
let socket;

/** @type {Array<PongClientTypes.MovementKey | PongClientTypes.MovementMouse>} */
let moveCommandBuffer = [];

/** @type {PongServerTypes.GameUpdateBinaryItem[]} */
let updateQueue = [];

function closeMe() {
    socket?.close();
    cancelAnimationFrame(currentFrame);
    clearInterval(updateInterval);
    clearInterval(sendInterval);
    self.close()
}

/** @param {FromWorkerSocketMessageTypes.FromWorkerMessage} msg  */
function pushToMainWorker(msg) {
    self.postMessage(msg);
}

 /** @param {PongClientTypes.ClientCommand} command */
 const pushCommandToSocket = (command) => {
    try {
        socket?.sendMessage(command);
    } catch (error) {
        pushToMainWorker({message: 'from-worker-socket-error', error: `${error}`})
        closeMe();
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
    return (da);
}

/** @param {PongServerTypes.GameUpdateBinaryItem[]} snapshots  */
const insertNewSnapshots = (snapshots) => {

    cleanupOldSnapshots();

    snapshots.forEach((snapshot) => {
        const last = updateQueue.at(-1);
        if (last == undefined || snapshot.tickno > last.tickno) {
            updateQueue.push(snapshot);
        } else {
            const i = updateQueue.findIndex(u => u.tickno === snapshot.tickno);
            if (i !== -1) {
                updateQueue[i] = snapshot;
            }
        }
    });
}

function cleanupOldSnapshots() {
    // console.log('cleanupOldSnapshots: queuelen: ', updateQueue.length);
    
    while (updateQueue.length > maxTicksInQueue) {
        updateQueue.shift();
    }
}

function sendUpdates() {

    pushToMainWorker({message: 'from-worker-socket-update', snapshots: updateQueue});
}

/** @param {number} elapsedMs */
function predictNewSnapshot(elapsedMs) {      
    if (!tick || !gameObjects) {
        throw new Error("No Tick or GameObjects!");
    }

    tick.update(elapsedMs);

    cleanupOldSnapshots();

    let lastSnapshot = updateQueue.at(-1);
    
    // console.log('new queue before prediction, before filter: ', updateQueue.map(i => i.tickno));
    
    if (lastSnapshot && gameObjects && gameObjects.pL && gameObjects.pR && gameObjects.b && gameObjects.c) {
        let lastSnapshotTick = lastSnapshot.tickno;
        
        /** @type {PongServerTypes.GameObjPosBinary} */
        let paddle_left = lastSnapshot.paddle_left,  paddle_right = lastSnapshot.paddle_right, ball = lastSnapshot.ball;
        while (lastSnapshotTick < tick.tick) {
            lastSnapshotTick++;
            paddle_left = gameObjects.pL.getPredictedXY(paddle_left, tick.tickDurationSec);
            paddle_right = gameObjects.pR.getPredictedXY(paddle_right, tick.tickDurationSec),
            ball = gameObjects.b.getPredictedXY(ball, tick.tickDurationSec, gameObjects.pL, gameObjects.pR),
            updateQueue.push({predicted: true, paddle_left, paddle_right, ball, tickno: lastSnapshotTick, timestamp_ms: tick.gameTimeMs});
        }
    }
}

/** @param {PongPaddle | PongBall} o @returns {PongServerTypes.GameObjPosBinary} */
function getInitialSnapshotData(o) {
    const {x, y, dx, dy} = o;
    return {x, y, dx, dy};
}

function makeInitialSnapshots() {
    if (!tick) return;
    let lastSnapshot;

    /** @type {PongServerTypes.GameUpdateBinaryItem} */
    lastSnapshot = {
        predicted: true,
        paddle_left: getInitialSnapshotData(gameObjects.pL),
        paddle_right: getInitialSnapshotData(gameObjects.pR),
        ball: getInitialSnapshotData(gameObjects.b),
        tickno: tick.tick,
        timestamp_ms: tick.gameTimeMs
    }
    updateQueue.push(lastSnapshot);

    /** @type {PongServerTypes.GameObjPosBinary} */
    let paddle_left = lastSnapshot.paddle_left,  paddle_right = lastSnapshot.paddle_right, ball = lastSnapshot.ball;
    while (tick.tick < 3) {
        tick.update(tick.tickDurationMs);
        paddle_left = gameObjects.pL.getPredictedXY(paddle_left, tick.tickDurationSec);
        paddle_right = gameObjects.pR.getPredictedXY(paddle_right, tick.tickDurationSec);
        ball = gameObjects.b.getPredictedXY(ball, tick.tickDurationSec, gameObjects.pL, gameObjects.pR);
        updateQueue.push({predicted: true, paddle_left, paddle_right, ball, tickno: tick.tick, timestamp_ms: tick.gameTimeMs});
    }

    console.log('initial: ', updateQueue.map(i => i.tickno));
    
}

/** @param {PongServerTypes.GameReady} [data]  */
function createGameObjects(data) {
    if (data) {
        gameObjects = {
            pL: new PongPaddle(data.paddle_left),
            pR: new PongPaddle(data.paddle_right),
            b: new PongBall(data.ball, false),
            c: new GameCourt(data.court),
        }
    }
}

let gameObjects = {
    pL: new PongPaddle(paddleLeftDefault),
    pR: new PongPaddle(paddleRightDefault),
    b: new PongBall(ballDefault, false),
    c: new GameCourt(courtDefault),
}

/** @type {Tick | undefined} */
let tick;
let maxTicksInQueue = 8;
let currentFrame;
let lastTimestampMs;
function makePrediction() {

    try {
        const timestampMs = performance.now();
    
        if (lastTimestampMs == undefined) {
            lastTimestampMs = timestampMs;
        }
        const elapsedMs = timestampMs - lastTimestampMs;
        lastTimestampMs = timestampMs;
        predictNewSnapshot(elapsedMs);
    } catch (error) {
        console.log(`makePrediction error: ${error}`);
        
    }
    // currentFrame = requestAnimationFrame(makePrediction);
}



const handleSocketMessage = (data) => {
    // console.log('SOCKETWORKER SOCKET MSG: ', data);
    try {
        if (data instanceof ArrayBuffer) {
            const list = parseSnapshot(data);

            
            // console.log('PARSE UPDATE');
            insertNewSnapshots(list);
          
            if (moveCommandBuffer.length > 0) {
                pushCommandToSocket({cmd: 'client-move-list', movements: moveCommandBuffer});
                moveCommandBuffer = [];
            }
        } else {
            /** @type {PongTypes.GeneralServerMessage} */
            const message = data;
            if ('tag' in message) {
                
                
                if (message.tag === 'hello' || message.tag === 'pong') {
                    return;
                }
                pushToMainWorker({message: 'from-worker-socket-message', broadcast: message});
            } else if ('cmd' in message) {
                pushToMainWorker({message: 'from-worker-socket-message', response: message});
            }
        }
    } catch (error) {
        pushToMainWorker({message: 'from-worker-socket-error', error: `${error}`})
        closeMe();
    }
}

let updateInterval;
let sendInterval;

let calccanvas;

/** @param {MessageEvent} ev */
self.onmessage = (ev) => {
    /** @type {ToWorkerSocketMessageTypes.ToWorkerMessage} */
    const msg = ev.data;
    switch (msg.message) {
        case 'socket_worker_create':
            socket = new GameSocket(msg.socketUrl);
            calccanvas = msg.calccanvas;

            socket.addHandler("message", handleSocketMessage);

            socket.addHandler("disconnected", () => {
                pushToMainWorker({message: 'from-worker-socket-disconnected'});
            });
            socket.addHandler("reconnected", () => {
                pushToMainWorker({message: 'from-worker-socket-reconnected'});
            });
            socket.addHandler("reconnected_failure", () => {
                pushToMainWorker({message: 'from-worker-socket-reconnect-failure'});
            });
            socket.addHandler("closed",/** @param {CloseEvent} e */ (e) => {
                pushToMainWorker({message: 'from-worker-socket-closed', code: e.code, reason: e.reason, wasClean: e.wasClean});
            });

          
            break;
        case 'socket_worker_client_move':
            moveCommandBuffer.push(msg.move);
            break;
        case 'socket_worker_client_command':
            pushCommandToSocket(msg.command);
            break;
        case 'socket_worker_close':
            closeMe();
            break;
        case 'socket_worker_client_clear_snapshots':
            // while (updateQueue[1] && updateQueue[1].timestamp_ms < msg.timestampMs) {
            //     updateQueue.shift();
            // }
            break;

        case 'socket_worker_get_update':
            sendUpdates();
            break;
        
        case 'socket_worker_client_start_updates':
            console.log('CREATE SOCKETWORKER: CALCCANVAS: ', calccanvas);
            
            if (msg.data != undefined) {
                // tick = new Tick(msg.data.settings.tick_rate);
                // createGameObjects(msg.data);
                // makeInitialSnapshots();
                // currentFrame = requestAnimationFrame(makePrediction);
                // if (updateInterval == undefined) {
                //     updateInterval = setInterval(makePrediction, tick.tickDurationMs*4);
                // }
                // if (sendInterval == undefined) {
                //     sendInterval = setInterval(sendUpdates, tick.tickDurationMs);
                // }
            }
            // if (updateInterval == undefined) {
            //     updateInterval = setInterval(() => {
            //         pushToMainWorker({message: 'from-worker-socket-new-snapshots', snapshots: updateQueue});
            //     }, msg.interval);
            // }
            break;
        
        default:
            break;
    }
}

// const startUpdateInterval = () => {

// }

// const pushUpdates = () => {
//     pushToMainWorker({message: 'from-worker-socket-new-snapshots', snapshots: updateQueue});
//     self.closed
//     setTimeout(pushUpdates, timeout);
// }