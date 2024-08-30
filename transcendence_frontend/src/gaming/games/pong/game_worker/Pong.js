import { courtDefault, paddleLeftDefault, paddleRightDefault, ballDefault, defaultSettings } from './localInitial';
import { PongObjManager } from './PongObjManager';
import { pushMessageToMainThread } from './utils';


/** @param {()=>void} onceCb @param {(workerCurrentTimeMs: number, workerLastTimeMs: number, elapsedMs: number, serverCurrentTimeMs: number) => void} callback */
const useFrame = (onceCb, callback) => {
    if (typeof callback !== 'function') throw new Error('invalid callback');
    let workerLastTimeMs;
    let currFrame;
    let timeOrigin = performance.timeOrigin;
    let once = false;
    let stopped = true;

    const syncTime = (syncTimeUnixMs) => {
        if (typeof syncTimeUnixMs === "number") timeOrigin = syncTimeUnixMs - performance.now();
    };

    /** @param {number} workerCurrentTimeMs */
    const renderFunc = (workerCurrentTimeMs) => {
        if (once) {
            onceCb();
            once = false;
            currFrame = undefined;
            return ;
        } 
        if (workerLastTimeMs === undefined)
            workerLastTimeMs = workerCurrentTimeMs;
        const elapsedMs = workerCurrentTimeMs - workerLastTimeMs;
        workerLastTimeMs = workerCurrentTimeMs;
        
        callback(workerCurrentTimeMs, workerLastTimeMs, elapsedMs, timeOrigin + workerCurrentTimeMs);
        if (!stopped) {
            currFrame = requestAnimationFrame(renderFunc);
        } else {
            currFrame = undefined;
            workerLastTimeMs = undefined;
        }
    };
    /** @param {number} [startTime] */
    const startRender = (startTime) => {
        if (currFrame && !once) return;
        if (startTime) syncTime(startTime);
        stopped = false;
        console.log('START RENDERING');
        currFrame = requestAnimationFrame(renderFunc);
    };
    const stopRender = () => {
        if (currFrame) {
            cancelAnimationFrame(currFrame);
            currFrame = undefined;
            workerLastTimeMs = undefined;
            stopped = true;
        }
    };

    const getCurrentServerTime = () => {
        return timeOrigin + performance.now();
    }

    const renderAtMostOnce = () => {
        if (!currFrame) {
            once = true;
            currFrame = requestAnimationFrame(renderFunc);
        } 
    };

    return {
        syncTime,
        startRender,
        stopRender,
        renderAtMostOnce,
        getCurrentServerTime
    };
};

export class Pong {
    /**
     * @param {OffscreenCanvas} offscreencanvas 
     * @param {boolean} remote 
     * @param {number} [userId] 
     */
    constructor(offscreencanvas, remote, userId) {
        this.canvas = offscreencanvas;
        // // @ts-ignore
        // this.#ctx = this.#canvas.getContext('2d');
        // if (!this.#ctx) throw new Error('could not get canvas context');
        this.manager = new PongObjManager(offscreencanvas, userId);
        this.paused = false;
        this.started = false;
        this.#isRemote = remote;
        this.frame = useFrame(this.manager.draw.bind(this.manager), this.render.bind(this));
    }
    paused;
    started;
    #isRemote;

    isRunning = () => this.started && !this.paused && !this.manager.scoreBreak

    /** @param {ToWorkerGameMessageTypes.ChangeColor} d  */
    changeColor(d) {
        this.manager.changeColor(d.colorWhite, d.colorBlack);
    }

    /** @param {ToWorkerGameMessageTypes.Resize} d */
    setCanvasSizes (d) {
        this.manager.setCanvasSizes(d);
        this.frame.renderAtMostOnce();
    }
    startGame () {
        console.log('START?!');
        if (this.started) return;
        this.started = true;
        console.log('super start game');
        this.frame.startRender();
    }
    quitGame () {
        console.log('QUIT GAME CALLED!!!');
        
        if (!this.started) return;
        this.started = false;
        this.frame.stopRender();
        self.close();
    }
    pauseGame () {
        if (this.paused || !this.started) return;
        this.paused = true;
        this.frame.stopRender();
    }
    resumeGame () {
        if (!this.paused || !this.started) return;
        this.paused = false;
        this.frame.startRender();
    }

    /** @param {ToWorkerGameMessageTypes.KeyEvent} d */
    handleKey (d) {}
   
    /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d */
    handleMouseTouch(d) { }

    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render(workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) {}

}

export class PongLocal extends Pong {
    /** @param {ToWorkerGameMessageTypes.Create} d  */
    constructor(d) {
        super(d.offscreencanvas, false, d.userId);
        this.manager.setSettings(defaultSettings.max_score, defaultSettings.point_wait_time_ms, false, d.data.player_one.id,  d.data.player_two.id)
        console.log('PONG LOCAL');
        pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: 0});
    }
   
    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render(workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) {
        const elapsedTimeSec = elapsedMs / 1000;
        this.manager.paddleLeft.update(elapsedTimeSec)
        this.manager.paddleRight.update(elapsedTimeSec)
        if (this.isRunning()) {
            const score = this.manager.ball.updateBall(elapsedTimeSec, this.manager.paddleLeft, this.manager.paddleRight);
            if (score !== "none") {
                if (this.manager.localScored(score)) {
                    this.quitGame();
                }
                // this.manager.makeAction(score, "local-set-score-check-win-message-main");
            }
        }
        this.manager.draw(true);
    }

    startGame() {
        
        super.startGame();
    }

    /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
    handleKey (d) {
        this.manager.paddleLeft.handleKey(true, d, "q", "a");
        this.manager.paddleRight.handleKey(true, d, "ArrowUp", "ArrowDown");
    }
    /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d  */
    handleMouseTouch(d) {
        const l = this.manager.paddleLeft.handleMouseTouch(true, d);
        const r = this.manager.paddleRight.handleMouseTouch(true, d);
        if (!d.touchRect) return;
        if (l === true) {
            pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: l})
        } else if (r === true) {
            pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: r})
        } else if (r === false && l === false) {
            pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: false})
        }
    }
}
