/* eslint-disable no-useless-constructor */
// @ts-check
import DrawObj from './DrawObj.js';
import { pushMessageToMainThread } from './utils.js';

export default class PongPaddle extends DrawObj {
    /** @param {PongGameplayTypes.GameObjData} initialDataPaddle */
    constructor(initialDataPaddle) {
        super(initialDataPaddle);
        this.dy = 0;
    }

    #DIR_NONE = /** @type {const} */(0);
    #DIR_UP = /** @type {const} */(-1);
    #DIR_DOWN = /** @type {const} */(1);

    // lastUpdate = performance.now();

    // updateQueue = [];

    // /**
    //  * @param {boolean} shouldUpdate
    //  * @param {ToWorkerGameMessageTypes.KeyEvent} d
    //  * @param {string} keyUp
    //  * @param {string} keyDown
    //  * @returns {PongClientTypes.ClientMoveDirection | null}
    //  */
    // handleKey(shouldUpdate, d, keyUp, keyDown) {
        
    //     // console.log('keypress: ', d);
        
    //     const updaterate = 60;
    //     let newDY = 100;
    //     let action = null;

        

    //     if (d.key === keyUp) {
    //         if (d.type === 'keydown') {
    //             if (shouldUpdate) {
    //                 newDY = this.#DIR_UP;
    //             }
    //             action = ("up");
    //         }
    //         else if (d.type === 'keyup') {
    //             if (shouldUpdate) {
    //                 newDY = this.dy === this.#DIR_UP ? this.#DIR_NONE : this.dy;
    //             }
    //             action = ("release_up");
    //         }
    //     } else if (d.key === keyDown) {
    //         if (d.type === 'keydown') {
    //             if (shouldUpdate) {
    //                 newDY = this.#DIR_DOWN;
    //             }
    //             action = ("down");
    //         }
    //         else if (d.type === 'keyup') {
    //             if (shouldUpdate) {
    //                 newDY = this.dy === this.#DIR_DOWN ? this.#DIR_NONE : this.dy
    //             }
    //             action = ("release_down");
    //         }
    //     }
    //     console.log('newY: ', newDY);
        
    //     if (newDY !== 100) {
    //         this.updateQueue.push(newDY);
    //     }

    //     const queueHandler = () => {
    //         const pushNewY = () => {
    //             console.log('queue: ', this.updateQueue);
    //             const y = this.updateQueue.shift();
    //             if (y != undefined) {
    //                 // console.log('PUSH NEW Y: ', y);
                    
                    
                    
    //                 this.dy = y;
    //                 // const curr = performance.now();
    //                 // console.log('diff last to curr: ', curr -this.lastUpdate);
    //                 // this.lastUpdate = curr;
    //             }
    //             if (this.updateQueue.length > 0) {
    //                 queueHandler();
    //             }
    //         }
    //         setTimeout(pushNewY, updaterate);
    //     };
    //     queueHandler();

        
    //     return (action);
    // }

    /**
     * @param {boolean} shouldUpdate
     * @param {ToWorkerGameMessageTypes.KeyEvent} d
     * @param {string} keyUp
     * @param {string} keyDown
     * @returns {PongClientTypes.ClientMoveDirection | null}
     */
    handleKey(shouldUpdate, d, keyUp, keyDown) {
        const curr = performance.now();
        
        if (d.key === keyUp) {
            if (d.type === 'keydown') {
                if (shouldUpdate)
                    this.dy = this.#DIR_UP;
                return ("up");
            }
            else if (d.type === 'keyup') {
                if (shouldUpdate)
                    this.dy = this.dy === this.#DIR_UP ? this.#DIR_NONE : this.dy
                return ("release_up");
            }
        } else if (d.key === keyDown) {
            if (d.type === 'keydown') {
                if (shouldUpdate)
                    this.dy = this.#DIR_DOWN;
                return ("down");
            }
            else if (d.type === 'keyup') {
                if (shouldUpdate)
                    this.dy = this.dy === this.#DIR_DOWN ? this.#DIR_NONE : this.dy
                return ("release_down");
            }
        }
        return (null);
    }

    /** @param {PongClientTypes.MovementKey | PongClientTypes.MovementMouse} move  */
    #makeMove(move) {
        if ('action' in move && move.action != undefined) {
            switch (move.action) {
                case 'up':
                    this.dy = this.#DIR_UP;
                    break;
                case 'release_up':
                    this.dy = this.dy === this.#DIR_UP ? this.#DIR_NONE : this.dy;
                    break;
                case 'down':
                    this.dy = this.#DIR_DOWN;
                    break;
                case 'release_down':
                    this.dy = this.dy === this.#DIR_DOWN ? this.#DIR_NONE : this.dy;
                    break;
            }
        } else if ('new_y' in move && move.new_y != undefined) {
            this.dy = this.#DIR_NONE;
            this.y = move.new_y;
        }
    }

    /** @param {number} nY @returns {number} */
    #getPaddlePosition(nY) {
        return Math.max(this.boundTop, Math.min(nY, this.boundBottom - this.h));
    }

    /** @param {number} elapsed */
    update(elapsed) {
        const nY = this.y + this.speedY * elapsed * this.dy;
        // if (nY === 0) throw new Error('nY === 0');

        if (this.dy !== this.#DIR_NONE || elapsed === 0) {
            this.y = this.#getPaddlePosition(nY);
        }
    }

    /**
     * @param {PongServerTypes.GameObjPosBinary} last
     * @param {number} elapsed
     * @param {PongClientTypes.MovementKey | PongClientTypes.MovementMouse} [move]
     * @returns {PongServerTypes.GameObjPosBinary}
     */
    getPredictedXY(last, elapsed, move) {
        const currY = this.y;
        const currDY = this.dy;
        this.y = last.y;
        this.dy = last.dy;
       
        if (move != undefined) {
            this.update(move.tickdiff);
            this.#makeMove(move);
            this.update(elapsed - move.tickdiff);
        } else {
            this.update(elapsed);
        }

        /** @type {PongServerTypes.GameObjPosBinary} */
        const res = {x: this.x, y: this.y, dx: this.dx, dy: this.dy};
        // const res = {x: this.x, y: this.y, dx: this.dx, dy: this.dy};
        this.y = currY;
        this.dy = currDY;
        return res;
    }


    /** @type {number | null} */
    #ident = null;
    /** @type {ToWorkerGameMessageTypes.GameTouchRect | null} */
    #lastTouch = null;
    /** @param {ToWorkerGameMessageTypes.GameTouchRect} touchRect  */
    #checkOverlap = (touchRect) => this.left < touchRect.right && this.right > touchRect.left
                                && this.top < touchRect.bottom && this.bottom > touchRect.top;

    /**
     * @param {boolean} shouldUpdate
     * @param {ToWorkerGameMessageTypes.GameTouchEvent} d
     * @returns {number | boolean | null}
     */
    handleMouseTouch(shouldUpdate, d) {
        if (d.type === "start" && d.touchRect !== undefined) {
            if (this.#checkOverlap(d.touchRect)) {
                console.log('VALID TOUCH START');
                this.#ident = d.touchRect.ident;
                this.#lastTouch = d.touchRect;
                return (true);
            } else {
                console.log('INVALID TOUCH START');
                return (false);
            }
        } else if (d.type === "move" && d.touchRect !== undefined) {
            console.log('handle touch move!');
            if (d.touchRect && this.#lastTouch && d.touchRect.ident === this.#ident) {
                const pos = this.#getPaddlePosition(this.y + (d.touchRect.y - this.#lastTouch.y));
                this.#lastTouch = d.touchRect;
                console.log('VALID MOVE!');
                if (shouldUpdate) {
                    console.log('Update now');
                    this.dy = this.#DIR_NONE;
                    this.y = pos;
                }
                return (pos);
            }
        } else if (d.type === "end" && d.ident !== undefined) {
            if (d.ident === this.#ident) {
                this.#ident = null;
                this.#lastTouch = null;
            }
        }
        return (null);
    }
}
