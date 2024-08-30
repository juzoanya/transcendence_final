import { GameSocket } from './Socket';

/** @type {GameSocket | undefined} */
let socket;

/** @type {Array<PongClientTypes.MovementKey | PongClientTypes.MovementMouse>} */
let moveCommandBuffer = [];

/** @type {PongServerTypes.GameUpdateBinaryItem[]} */
let updateQueue = [];

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
        socket?.close();
        clearInterval(updateInterval);
        self.close()
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



const handleSocketMessage = (data) => {
    // console.log('SOCKETWORKER SOCKET MSG: ', data);
    try {
        if (data instanceof ArrayBuffer) {
            const list = parseSnapshot(data);

            
            // console.log('PARSE UPDATE');
            
            // setTimeout(() => {
            //     console.log('SEND UPDATE AFTER TIMEOUT');
            //     pushToMainWorker({message: 'from-worker-socket-new-snapshots', snapshots: updateQueue});
            //     updateQueue = [];
            // }, 10);
            // insertNewSnapshots(list);
            /** @type {FromWorkerSocketMessageTypes.NewSnapshots} */
            const msg = {
                message: 'from-worker-socket-new-snapshots',
                snapshots: list,
            };
            pushToMainWorker(msg);
            if (moveCommandBuffer.length > 0) {
                pushCommandToSocket({cmd: 'client-move-list', movements: moveCommandBuffer});
                moveCommandBuffer = [];
            }
        } else {
            /** @type {PongTypes.GeneralServerMessage} */
            const message = data;
            if ('tag' in message) {
                
                
                if (message.tag === 'hello' || message.tag === 'pong') {
                    if (message.tag == 'pong') {
                        /** @type {FromWorkerSocketMessageTypes.SocketTimes} */
                        const msg = {
                            message: 'from-worker-socket-times',
                            rtt: socket?.rttMedian.getMedian() ?? 0,
                            serverClientTimeDiff: socket?.timediffMedian.getMedian() ?? 0
                        }
                        pushToMainWorker(msg);
                    }
                    return;
                }
                pushToMainWorker({message: 'from-worker-socket-message', broadcast: message});
            } else if ('cmd' in message) {
                pushToMainWorker({message: 'from-worker-socket-message', response: message});
            }
        }
    } catch (error) {
        pushToMainWorker({message: 'from-worker-socket-error', error: `${error}`})
        socket?.close();
        clearInterval(updateInterval);
        self.close()
    }
}

let updateInterval;

/** @param {MessageEvent} ev */
self.onmessage = (ev) => {
    /** @type {ToWorkerSocketMessageTypes.ToWorkerMessage} */
    const msg = ev.data;
    switch (msg.message) {
        case 'socket_worker_create':
            socket = new GameSocket(msg.socketUrl);
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
        case 'socket_worker_client_clear_snapshots':
            while (updateQueue[1] && updateQueue[1].timestamp_ms < msg.timestampMs) {
                updateQueue.shift();
            }
            break;
        
        case 'socket_worker_client_start_updates':
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