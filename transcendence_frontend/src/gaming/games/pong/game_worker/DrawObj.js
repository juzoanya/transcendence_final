/* eslint-disable no-console */

export default class DrawObj {
    /**
     * @param {PongGameplayTypes.GameObjData} initial
     */
    constructor(initial) {
        // console.log('init draw: ', initial);
        // /** @type {number} */ this.sx = initial.x;
        // /** @type {number} */ this.sy = initial.y;
        // /** @type {number} */ this.sw = initial.w;
        // /** @type {number} */ this.sh = initial.h;
        /** @type {number} */ this.#x = initial.x;
        /** @type {number} */ this.#y = initial.y;
        /** @type {number} */ this.w = initial.w;
        /** @type {number} */ this.w_half = initial.w / 2.0;
        /** @type {number} */ this.h = initial.h;
        /** @type {number} */ this.h_half = initial.h / 2.0;
        /** @type {number} */ this.left = initial.x;
        /** @type {number} */ this.right = initial.x + initial.w;
        /** @type {number} */ this.top = initial.y;
        /** @type {number} */ this.bottom = initial.y + initial.h;
        /** @type {number} */ this.boundBottom = initial.bound_bottom;
        /** @type {number} */ this.boundTop = initial.bound_top;
        /** @type {number} */ this.boundRight = initial.bound_right;
        /** @type {number} */ this.boundLeft = initial.bound_left;
        /** @type {number} */ this.speedX = initial.speed_x;
        /** @type {number} */ this.speedY = initial.speed_y;
        /** @type {number} */ this.dx = initial.dx;
        /** @type {number} */ this.dy = initial.dy;
        /** @type {number} */ this.canvasWidth = 1;
        /** @type {number} */ this.canvasHeight = 1;
        /** @type {string} */ this.color = '#000';
        
    }

    #x;
    #y;
    get x_center() { return this.x + this.w_half; }
    get y_center() { return this.y + this.h_half; }
    get x() { return this.#x; }
    set x(value) {
        this.#x = value;
        // this.sx = value * this.canvasWidth;
        this.left = value;
        this.right = value + this.w;
    }
    get y() { return this.#y; }
    set y(value) {
        this.#y = value;
        // this.sy = value * this.canvasHeight;
        this.top = value;
        this.bottom = value + this.h;
    }

    /**
     * @param {number} width 
     * @param {number} height 
     */
    setCanvasSizes(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // this.sx = this.x * width;
        // this.sy = this.y * height;
        // this.sw = this.w * width;
        // this.sh = this.h * height;
    }

    /**
     * @param {string} color 
     */
    setColor(color) {
        this.color = color;
    }

    /**
     * @param {number} a 
     * @param {number} b 
     * @param {number} alpha 
     * @returns {number}
     */
    lerp = (a, b, alpha) => a + alpha * (b - a);
    
    /**
     * @param {number} start
     * @param {number} end
     * @param {number} time
     * @returns {number}
     */
    lerp2 = (start, end, time) => start * (1 - time) + end * time;

    /**
     * @param {PongGameplayTypes.GameObjPositionData | PongServerTypes.GameObjPosBinary} lastUpdate 
     * @param {PongGameplayTypes.GameObjPositionData | PongServerTypes.GameObjPosBinary} nextUpdate
     * @param {boolean} updateX
     * @param {boolean} setDYX
     * @param {number} elapsedSinceUpdate
     */
    interpolate(lastUpdate, nextUpdate, elapsedSinceUpdate, updateX, setDYX) {
        if (updateX === true) {
            this.x = this.lerp2(lastUpdate.x, nextUpdate.x, elapsedSinceUpdate);
        }
        this.y = this.lerp2(lastUpdate.y, nextUpdate.y, elapsedSinceUpdate);
        if (setDYX) {
            this.dx = lastUpdate.dx;
            this.dy = lastUpdate.dy;
        }
        // this.dx = 'dx' in lastUpdate ? lastUpdate.dx : this.dx;
        // this.dy = 'dy' in lastUpdate ? lastUpdate.dy : this.dy;
    }

    /** @param {OffscreenCanvasRenderingContext2D} ctx */
    draw(ctx) {
        ctx.fillStyle = this.color;
        // ctx.fillRect(
        //     this.sx,
        //     this.sy,
        //     this.sw,
        //     this.sh,
        // );
        ctx.fillRect(
            Math.trunc(this.x * this.canvasWidth),
            Math.trunc(this.y * this.canvasHeight),
            Math.trunc(this.w * this.canvasWidth),
            Math.trunc(this.h * this.canvasHeight),
        );
    }


    /**
     * 
     * 
     * Ball - Paddle Right: 
     * Paddle Right X: 0.97
     * Ball was at: X 0.9556817876028206
     * Ball width: 0.015
     * Ball right was: 0.970681
     * 
     * relVeloX = ball.dx(0.9886345408450067) * ball.speedX(0.5) - paddleRight.dx(0) * paddleRight.speedX(0.45)
     * relVeloX = ball.dx(0.9886345408450067) * ball.speedX(0.5)
     * relVeloX = 0.494317
     * reciRelVeloX = 1/0.494317 = 2.02299
     * 
     * diffTimeX = Math.abs(this.right - obj.left) * reciRelVeloX;
     * diffTimeX = Math.abs(0.970681 - 0.97) * 2.02299
     * diffTimeX = 0.000681 * 2.02299
     * diffTimeX = 0.00033663
     * 
     * Ball - Paddle Y: 
     * Paddle Right Y: 0.6604499999999999
     * Paddle Right Bottom: 0.6604499999999999 + 0.065
     * Ball was at: Y 0.7576085069133881
     * 
     * relVeloY = ball.dy(-0.15033876628528944) * ball.speedY(1) - paddleRight.dy(1) * paddleRight.speedY(0.45)
     * relVeloY = -0.15033876628528944 - 0.45
     * relVeloY = -0.6003387662852895
     * reciRelVeloX = 1/0.6003387662852895 = 1.6657261802160312
     * 
     * diffTimeY = Math.abs(obj.bottom - this.top) * reciRelVeloY;
     * diffTimeY = Math.abs(0.970681 - 0.7254499999999999) * 1.6657261802160312
     * diffTimeY = 0.2452310000000001 * 1.6657261802160312
     * diffTimeY = 0.4084876969005577
     * 
     * 
     */

    /**
     * @param {DrawObj} obj 
     */
    collision(obj) {
        let diffTimeX = Infinity;
        let diffTimeY = Infinity;
        let collisionX = DrawObj.COLL_NONE;
        let collisionY = DrawObj.COLL_NONE;

        const relVeloX = this.dx * this.speedX - obj.dx * obj.speedX;
        const relVeloY = this.dy * this.speedY - obj.dy * obj.speedY;

        if (relVeloX !== 0) {
            const reciRelVeloX = 1 / Math.abs(relVeloX);
            if ( relVeloX > 0 && this.right > obj.left && this.left < obj.right ) {
                diffTimeX = Math.abs(this.right - obj.left) * reciRelVeloX;
                collisionX = DrawObj.COLL_RIGHT;
            } else if ( relVeloX < 0 && this.left < obj.right && this.right > obj.left ) {
                diffTimeX = Math.abs(obj.right - this.left) * reciRelVeloX;
                collisionX = DrawObj.COLL_LEFT;
            }
        }
        
        if (relVeloY !== 0) {
            const reciRelVeloY = 1 / Math.abs(relVeloY);
            if ( relVeloY > 0 && this.bottom > obj.top && this.top < obj.bottom) {
                diffTimeY = Math.abs(this.bottom - obj.top) * reciRelVeloY;
                collisionY = DrawObj.COLL_BOTTOM;
            } else if ( relVeloY < 0 && this.top < obj.bottom && this.bottom > obj.top) {
                diffTimeY = Math.abs(obj.bottom - this.top) * reciRelVeloY;
                collisionY = DrawObj.COLL_TOP;
            }
        }
        if (isFinite(diffTimeX) && isFinite(diffTimeY)) {
            return (diffTimeX < diffTimeY ? [collisionX, diffTimeX] : [collisionY, diffTimeY]);
        }
        return [DrawObj.COLL_NONE, Infinity];
    }

    static getCollisionStr(c) {
        if (c === this.COLL_NONE) {
            return 'COLL_NONE';
        } else if (c === this.COLL_TOP) {
            return 'COLL_TOP';
        } else if (c === this.COLL_RIGHT) {
            return 'COLL_RIGHT';
        } else if (c === this.COLL_BOTTOM) {
            return 'COLL_BOTTOM';
        } else if (c === this.COLL_LEFT) {
            return 'COLL_LEFT';
        } else {
            return `UNKNOWN_COLLISION: ${c}`;
        }
    }

    static COLL_NONE = 0;
    static COLL_TOP = 1;
    static COLL_RIGHT = 2;
    static COLL_BOTTOM = 3;
    static COLL_LEFT = 4;
}
