



/**
 * @typedef {"initial_connecting" | "reconnecting" | "initial_connected" | "reconnected" | "disconnected" | "closing" | "closed" | "failure"} SocketState
 */

/**
 * @typedef {"none" | "invalid_url" | "reconnecting_failed"} SocketError
 */

/**
 * @typedef {"initial_connected" | "connected" | "disconnected" | "closed" | "error_socket" | "error_json" | "reconnected" | "reconnected_failure" | "message"} SocketEvent
 */

/**
 * @typedef {"connecting"| "connected" | "closing" | "closed"} ConnectState
 */
/**
 * @typedef {"connecting"| "connected" | "closing" | "closed"} SockState
 */

export class SockStateError extends Error {}
export class InvalidSocketStateError extends Error {}

export class SocketStateC {
    #connecting = false;
    #connected = false;
    #disconnected = false;
    #wasDisconnected = false;
    #closing = false;
    #closed = true;
    /** @type {SocketError} */
    #errorState = 'none';
    #failure = false;
    /** @returns {SocketState} */
    get state() {
        if (!this.#failure) {
            if (this.#connecting) return this.#disconnected ? 'reconnecting' : 'initial_connecting';
            else if (this.#connected) return this.#wasDisconnected ? 'reconnected' : 'initial_connected';
            else if (this.#closed) return 'closed';
            else if (this.#closing) return 'closing';
            else if (this.#disconnected) return 'disconnected';
        }
        return 'failure';
    }

    isInitialConnecting = () => this.#connecting && !this.#disconnected;
    isReconnecting = () => this.#connecting && this.#disconnected;
    isConnecting = () => this.isInitialConnecting() || this.isReconnecting();

    isInitialConnected = () => this.#connected && !this.#wasDisconnected;
    isReconnected = () => this.#connected && this.#wasDisconnected;
    isConnected = () => this.isInitialConnected() || this.isReconnected();

    isDisconnected = () => !this.#connecting && this.#disconnected;
    isClosing = () => this.#closing;
    isClosed = () => !this.#connecting && this.#closed;
    isOffline = () => this.isDisconnected() || this.isClosed();
    isFailure = () => this.#failure;

    sockassert() {
        throw new SockStateError(`${this.state}`);
    }

    /** @param {"connecting" | "connected" | "disconnected" | "closing" | "closed"} state  */
    setState(state) {
        if (state === 'connecting') {
            if (this.#connecting || !(this.#disconnected || this.#closed)) this.sockassert();
            this.#connecting = true;
        } else if (state === 'connected') {
            if (this.#connected || !this.#connecting) this.sockassert();
            if (this.#disconnected) {
                this.#disconnected = false;
                this.#wasDisconnected = true;
            } else if (this.#closed) {
                this.#closed = false;
                this.#wasDisconnected = false;
            } else {
                this.sockassert();
            }
            this.#connecting = false;
            this.#connected = true;
        } else if (state === 'disconnected') {
            if (!this.#connected) this.sockassert();
            this.#connected = false;
            this.#disconnected = true;
        } else if (state === 'closing') {
            if (!this.#connected) this.sockassert();
            this.#closing = true;
            this.#connected = false;
        } else if (state === 'closed') {
            if (this.#closing) {
                this.#closing = false;
                this.#closed = true;
            } else if (this.#connected) {
                this.#closed = true;
            } else {
                this.sockassert();
            }
        }
    }

    get error() {
        return this.#errorState;
    }

    /** @param {SocketError} state  */
    setError(state) {
        this.#errorState = state;
        this.#failure = true;
        this.#closed = false;
        this.#closing = false;
        this.#connected = false;
        this.#connecting = false;
        this.#disconnected = false;
    }
}

export class ReconnectingSocket {
    /** @type {string | null} */
    #url = null;

    #state = new SocketStateC();

    /** @returns {SocketState} */
    get state() {
        return this.#state.state;
    }

    isConnected = () => this.#state.isConnected();

    /** @returns {SocketError} */
    get errorState() {
        return this.#state.error;
    }

    /** @type {WebSocket | undefined} */
    #socket;
    /**
     * @param {string} url
     */
    constructor(url) {
        try {
            const ur = new URL(url);
            if (ur.href.includes('#')) throw new SyntaxError('Fragment in websocket url not allowed');
            // this.#pingMessage = JSON.stringify(pingMessage);
            // this.#helloCallback = isHelloMessageCb;
            // this.#pongCallback = isPongMessageCb;
            this.#url = ur.href;
        } catch (error) {
            this.#state.setError('invalid_url');
            throw error;
        }

        this.connect();
    }
    #pingMessage;
    #helloCallback;
    #pongCallback;

    onError = () => {
        this.#emit(['error_socket']);
        this.#cleanupInterval();
    };
    onClose = (e) => {
        console.log('onClose, state: ', this.state);
        console.log(e);
        this.#cleanupInterval();
        if (!this.#state.isDisconnected()) {
            try {
                this.#state.setState('closed');
            this.#emit(['closed'], e);
            } catch (error) {
                console.error('FUCK');
            }
        }
    };

    #cleanupInterval() {
        clearTimeout(this.#heartBeatIntervalStartTimeoutIdent);
        this.#heartBeatIntervalStartTimeoutIdent = undefined;
        clearInterval(this.#heartBeatIntervalIdent);
        this.#heartBeatIntervalIdent = undefined;
    }

    #receivedrecentMessage = false;
    #heartBeatIntervalStartTimeoutIdent;
    #heartBeatIntervalIdent;
    lastping = performance.now();
    #startHeartBeat = (duration) => {
        this.lastping = performance.now();
        // console.log('START HEARTBEAT, start at: ', this.lastping);
        if (this.#heartBeatIntervalIdent != undefined) return;
        const onInterval = () => {
            // console.log('ON HEARTBEAT INTERVAL');
            this.currping = performance.now()
            // console.log(`sice last ping: ${this.currping - this.lastping}`);
            this.lastping = this.currping;
            if (!this.#receivedrecentMessage) {
                this.#cleanupInterval();

                try {
                    this.#state.setState('disconnected');
                    this.#emit(['disconnected']);
                } catch (error) {
                    console.error('FUCK');
                }
                this.connect();
            }
            this.sendMessage( { command: 'ping' } );
            this.#receivedrecentMessage = false;
        };
        // const delay = duration * 0.8 * Math.random();
        const delay = duration / 2;
        // console.log(`start timeout to send heartbeat. delay: ${delay}`);
        this.#heartBeatIntervalStartTimeoutIdent = setTimeout(() => {
            // console.log('set interval for time: ', duration);
            this.currping = performance.now();
            // console.log(`sice hello message: ${this.currping - this.lastping}`);
            this.lastping = this.currping;
            this.sendMessage( { command: 'ping' } );
            this.#heartBeatIntervalIdent = setInterval(onInterval, duration*0.8);
        }, delay);
    };

    #checkHeartBeatData = (data) => {
        if (data && data.msg_type === 'hello' && typeof data.heartbeat_ms === 'number') {
            this.#startHeartBeat(data.heartbeat_ms);
            return true;
        }
        return false;
    };

    /** @param {MessageEvent<WebSocket>} e */
    onMessage = (e) => {
        try {
            this.#receivedrecentMessage = true;
            let data;
            if (typeof e.data === "string") {
                // console.log('NEW SOCKET MESSAGE: ', e.data);
                data = JSON.parse(e.data);
                
                if (this.#checkHeartBeatData(data) || data.msg_type === "pong")
                    return;
            } else if (e.data instanceof ArrayBuffer) {
                data = e.data;
            }
            this.#emit(['message'], data);
        } catch (error) {
            this.#emit(['error_json'], error);
        }
    };

    /** @type {Map<SocketEvent, ((e?: any) => void)[] >} */
    #handlerMap = new Map();

    /** @param {SocketEvent} type */
    addHandler(type, handler) {
        let arr = this.#handlerMap.get(type);
        if (arr == undefined) {
            arr = [];
            this.#handlerMap.set(type, arr);
        }
        arr.push(handler);
    }

    sendMessage(data) {
        if (this.#socket?.readyState !== WebSocket.OPEN)
            return;
        // console.log('SEND MESSAGE, socket state: ', this.#socket?.readyState);
        // if (this.#state !== 'connected') throw new InvalidSocketStateError(`${this.state}`);
        const d = JSON.stringify(data);
        this.#socket?.send(d);
    }

    /** @param {SocketEvent[]} types @param {any} [data]  */
    #emit(types, data) {
        // if (!types.includes("message"))
            // console.log('emit events: ', types);
        types.forEach((type) => {
            const arr = this.#handlerMap.get(type);
            if (arr)
                arr.forEach((h) => {
                    h(data);
                });
        });
    }

    /** @param {(success: boolean) => void} successCb */
    #connectSock = (successCb) => {
        if (this.#state.isFailure() || !this.#url) return;
        const s = new WebSocket(this.#url);
        s.binaryType = "arraybuffer";
        s.onerror = (e) => {
            console.log('connecting failed: ', e);
            successCb(false);
        };
        s.onclose = (e) => {
            console.log('socket closed: ', e);
        };
        s.onopen = (e) => {
            // console.log('websocket opened: ', e);
            successCb(true);
            s.onclose = this.onClose;
            s.onerror = this.onError;
            s.onmessage = this.onMessage;
            this.#socket = s;
            try {
                this.#state.setState('connected');
                this.#emit(['connected', this.#state.isInitialConnected() ? 'initial_connected' : 'reconnected'])
            } catch (error) {
                console.error('FUCK');
            }
        };
    };

    connect = () => {
        if (this.#state.isFailure() || !this.#state.isOffline())
            return (false);
        let attempts = 20;
        console.log('attempt to connect, state: ', this.state);
        this.#socket = undefined;
        try {
            this.#state.setState('connecting');
        } catch (error) {
            console.error('FUCK');
        }
        const tryReconnect = () => {
            const timeoutHandler = () => {
                // console.log('timeout func -> try to connect');
                this.#connectSock((success) => {
                    // console.log('connection callback: succes? ', success);
                    if (success === false) {
                        attempts -= 1;
                        tryReconnect();
                    }
                });
            };
            if (attempts === 0) {
                console.log('attepts 0 -> reconnect failure');
                this.#state.setError('reconnecting_failed');
                this.#emit(['reconnected_failure']);
            } else {
                console.log('prepare timeout attempt: ', attempts);
                setTimeout(timeoutHandler, 2000);
            }
        };
        tryReconnect();
    };
    close() {
        console.log('attempt to close');
        console.log('state: ', this.#state);
        if (!this.#state.isConnected())
            return;
        try {
            this.#state.setState('closing');
        } catch (error) {
            console.error('FUCK');
        }
        this.#cleanupInterval();
        this.#socket?.close();
    }
}


// sock.addHandler('closed', (e) => {
//     console.log('event: closed');
// });
// sock.addHandler('connected', (e) => {
//     console.log('event: connected');
// });
// sock.addHandler('disconnected', (e) => {
//     console.log('event: disconnected');
// });
// sock.addHandler('error_socket', (e) => {
//     console.log('event: error socket: ', e);
// });
// sock.addHandler('error_json', (e) => {
//     console.log('event: error json: ', e);
// });
// sock.addHandler('initial_connected', (e) => {
//     console.log('event: initial_connected');
// });
// sock.addHandler('message', (e) => {
//     console.log('event: message', e);
// });
// sock.addHandler('reconnected', (e) => {
//     console.log('event: reconnected');
// });

// const inter = setInterval(() => {
//     console.log('socketstate: ', sock.state);
// }, 100);

// setTimeout(() => {
//     sock.close();
// }, 5000);
