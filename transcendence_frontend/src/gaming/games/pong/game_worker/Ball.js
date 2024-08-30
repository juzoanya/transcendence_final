/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable no-useless-constructor */
import DrawObj from './DrawObj.js';
import PongPaddle from './Paddle.js';

/** @param {number} degrees */
const degToRad = (degrees) => degrees * (Math.PI/180);


function calcRandAngleSinCos() {
    const upperBound = (225 * Math.PI) / 180;
    const lowerBound = (135 * Math.PI) / 180;
    const angle = Math.random() * (upperBound - lowerBound) + lowerBound;
    return {
        dy: Math.sin(angle),
        dx: Math.cos(angle),
    };
}

// 'none' | 'left' | 'right'
/** @param {PongGameplayTypes.ServeSide} serveSide  */
function calcAngleBySide(serveSide) {
    let {dy, dx } = calcRandAngleSinCos();
    console.log('dy: ', dy);
    console.log('dx: ', dx);
    
    if (serveSide == "serve-left" && dx > 0) {
        dx = -dx
    } else if (serveSide == "serve-right" && dx < 0) {
        dx = -dx;
    }
    console.log('dy: ', dy);
    console.log('dx: ', dx);
    return { dy, dx };
}

/**
 * @param {PongGameplayTypes.ServeMode} mode
 * @param {PongGameplayTypes.PongGameSides | 'none'}[scoreSide]
 */
function calcAngleByMode(mode, scoreSide) {
    /** @type {PongGameplayTypes.ServeSide} */
    let serveSide = 'serve-left';
    if (!scoreSide || scoreSide == 'none') {
        serveSide = 'serve-left';
    } else if (mode === 'serve-winner') {
        serveSide = scoreSide === "right" ? 'serve-left' : 'serve-right';
    } else if (mode === 'serve-loser') {
        serveSide = scoreSide === 'left' ? 'serve-left' : 'serve-right';
    } else if (mode === 'serve-random') {
        serveSide = Math.random() < 0.5 ? 'serve-left' : 'serve-right';
    } else {
        serveSide = scoreSide === 'left' ? 'serve-left' : 'serve-right';
    }
    return calcAngleBySide(serveSide);
}

export default class PongBall extends DrawObj {

    static Scored = {
        /** @type {"none"} */
        SCORE_NONE: "none",
        /** @type {PongGameplayTypes.PongGameSides} */
        SCORE_LEFT: "left",
        /** @type {PongGameplayTypes.PongGameSides} */
        SCORE_RIGHT: "right",
    }

    /**
     * @param {PongGameplayTypes.GameObjData} initDataBall
     * @param {boolean} setBallAngle
     * @param {PongGameplayTypes.ServeMode} [serveMode]
     * @param {PongGameplayTypes.PongGameSides} [scoreSide]
     */
    constructor(initDataBall, setBallAngle, serveMode, scoreSide) {
        super(initDataBall);
        console.log('constructor ball, mode: ', serveMode);
        console.log('set ball abngel: ', setBallAngle);
        
        if (setBallAngle && serveMode) {
            // console.log('ball set Ball angles');
            // console.log(this);
            // const { sin, cos } = calcRandAngleSinCos();
            const { dy, dx } = calcAngleByMode(serveMode, scoreSide);
            console.log('dy: ', dy);
            console.log('dx: ', dx);
            
            
            this.dx = dx;
            this.dy = dy;
            // console.log('init data: ', initDataBall);
        }
    }

    // /** @param {number} currX @param {number} elapsedSec @returns {number} */
    // #getCalcX(currX, elapsedSec) {
    //     return currX + elapsedSec * this.speedX * this.dx;
    // }
    // /** @param {number} currY @param {number} elapsedSec @returns {number} */
    // #getCalcY(currY, elapsedSec) {
    //     return currY + elapsedSec * this.speedY * this.dy;
    // }
    // /** @param {number} currX @param {number} elapsedSec @param {number} timeWhileCollision @returns {[number, number]}  */
    // #getRecalcDirX(currX, elapsedSec, timeWhileCollision) {
    //     const x = this.#getCalcX(currX, elapsedSec - timeWhileCollision)
    //     const dx = this.dx*-1;
    //     return [dx, this.#getCalcX(x, timeWhileCollision)];
    // }
    // /** @param {number} currY @param {number} elapsedSec @param {number} timeWhileCollision @returns {[number, number]} */
    // #getRecalcDirY(currY, elapsedSec, timeWhileCollision) {
    //     const y = this.#getCalcY(currY, elapsedSec - timeWhileCollision)
    //     const dy = this.dy*-1;
    //     return [dy, this.#getCalcY(y, timeWhileCollision)];
    // }
    // /**
    //  *
    //  * @param {boolean} shouldUpdate
    //  * @param {number} elapsed
    //  * @param {PongPaddle} paddleLeft
    //  * @param {PongPaddle} paddleRight
    //  * @returns {PongGameplayTypes.PongGameSides | "none"}
    //  */
    // updateBall(shouldUpdate, elapsed, paddleLeft, paddleRight) {
    //     if (!paddleLeft || !paddleRight) {
    //         throw new Error('NO PADDLE DEFINED WHEN UPDATING THE BALL');
    //     }

    //     /** @type {number} */
    //     let newY = this.y, newX = this.x, newDY = this.dy, newDX = this.dx;
    //     newX = this.#getCalcX(newX, elapsed);
    //     newY = this.#getCalcY(newY, elapsed);

    //     let scored;

    //     const diffY = newY > 0 ? this.bottom - this.boundBottom : newY < 0 ? this.boundTop - this.top : 0;
    //     if (diffY > 0) {
    //         [newDY, newY] = this.#getRecalcDirY(newY, elapsed, diffY / Math.abs(newY * this.speedY));
    //     }

    //     if (this.right <= this.boundLeft) {
    //         scored = PongBall.Scored.SCORE_LEFT;
    //     } else  if (this.left >= this.boundRight) {
    //         scored = PongBall.Scored.SCORE_RIGHT;
    //     } else if (this.left >= paddleLeft.right && this.right <= paddleRight.left) {
    //         scored = PongBall.Scored.SCORE_NONE;
    //     } else {
    //         scored = PongBall.Scored.SCORE_NONE;
    //         const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
    //         const [collision, diffTime] = this.coll_ision(paddle);
    
    //         if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
    //             [newDX, newX] = this.#getRecalcDirX(newX, elapsed, diffTime)
    //         } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
    //             [newDY, newY] = this.#getRecalcDirY(newY, elapsed, diffTime)
    //         }
    //     }

    //     if (shouldUpdate) {
    //         this.x = newX;
    //         this.y = newY;
    //         this.dx = newDX;
    //         this.dy = newDY;
    //     }
    //     return scored;
    // }


    #calcX(elapsedSec) {
        // console.log('speedX: ', this.speedX);
        
        this.x = this.x + elapsedSec * this.speedX * this.dx;
    }
    #calcY(elapsedSec) {
        // console.log('speedY: ', this.speedY);
        this.y = this.y + elapsedSec * this.speedY * this.dy;
    }

    /**
     * @param {number} elapsedSec 
     * @param {number} timeWhileCollision 
     * @param {PongPaddle} paddle 
     * @param {number} collision 
     */
    #recalcDirXAfterBounce(elapsedSec, timeWhileCollision, paddle, collision) {
        // console.log('recalcDirX, elapsedSec - timeWhileCollision: ', elapsedSec - timeWhileCollision);
        // console.log('recalcDirX, timeWhileCollision: ', timeWhileCollision);
        
        // console.log('x inside paddle: ', this.x);
        // this.#calcX(elapsedSec - timeWhileCollision)
        this.x = collision === DrawObj.COLL_LEFT ? paddle.x + paddle.w : paddle.x - this.w;
        // console.log('x on collision: ', this.x);
        const odx = this.dx;
        // this.dx = this.dx*-1
        this.calcBounceAngle(paddle, collision);
        // console.log('flip dx from: ', odx, ' to ', this.dx);
        this.#calcX(timeWhileCollision)
        // console.log('new x, calculated after bounce: ', this.x);
    }
    #recalcDirY(elapsedSec, timeWhileCollision) {
        this.#calcY(elapsedSec - timeWhileCollision)
        this.dy = this.dy*-1
        this.#calcY(timeWhileCollision)
    }

    /**
     * @param {number} elapsed
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {PongGameplayTypes.PongGameSides | "none"}
     */
    #internalUpdateBall(elapsed, paddleLeft, paddleRight) {
        if (!paddleLeft || !paddleRight) {
            throw new Error('NO PADDLE DEFINED WHEN UPDATING THE BALL');
        }
        // console.log('update ball: tickduration: ', elapsed);
        // console.log('update ball: old x: ', this.x);
        // console.log('update ball: old y: ', this.y);
        // console.log('UPDATE');
        
        this.#calcX(elapsed)
        this.#calcY(elapsed)
        // console.log('update ball: new x: ', this.x);
        // console.log('update ball: new y: ', this.y);

        const diffY = this.dy > 0 ? this.bottom - this.boundBottom : this.dy < 0 ? this.boundTop - this.top : 0;
        if (diffY > 0) {
            this.#recalcDirY(elapsed, diffY / Math.abs(this.dy * this.speedY))
        }

        let scored;
        if (this.right <= this.boundLeft) {
            scored = PongBall.Scored.SCORE_LEFT;
        } else if (this.left >= this.boundRight) {
            scored = PongBall.Scored.SCORE_RIGHT;
        } else if (this.left >= paddleLeft.right && this.right <= paddleRight.left) {
            scored = PongBall.Scored.SCORE_NONE;
        } else {
            scored = PongBall.Scored.SCORE_NONE;
            const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
            const [collision, diffTime] = this.collision(paddle);
    
            // console.log('\n\n\ncollision: ', DrawObj.getCollisionStr(collision));
            // console.log('difftime: ', diffTime);
            
            if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
                // console.log('COLLISION WAS: ', DrawObj.getCollisionStr(collision));
                // if (collision === DrawObj.COLL_LEFT) {
                //     // console.log('PADDLE LEFT X: ', paddle.x);
                //     // console.log('PADDLE LEFT Y: ', paddle.y);
                // }
                // if (collision === DrawObj.COLL_RIGHT) {
                //     // console.log('PADDLE RIGHT X: ', paddle.x);
                //     // console.log('PADDLE RIGHT Y: ', paddle.y);
                // }
                // console.log('\nOLD CALC X: ', this.x);
                // console.log('OLD CALC Y: ', this.y);
                // console.log('OLD CALC DX: ', this.dx);
                // console.log('OLD CALC DY: ', this.dy);
                this.#recalcDirXAfterBounce(elapsed, diffTime, paddle, collision);
                // console.log('\nNEW CALC X: ', this.x);
                // console.log('NEW CALC Y: ', this.y);
                // console.log('NEW CALC DX: ', this.dx);
                // console.log('NEW CALC DY: ', this.dy);
                
                
            } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
                this.#recalcDirY(elapsed, diffTime);
            }
        }
        console.log('scored: ', scored);
        
        return scored;
    }

    /**
     * @param {PongPaddle} paddle 
     * @param {number} collision 
     */
    calcBounceAngle(paddle, collision) {
        const ballCenterY = this.top + this.h_half;
        const paddleCenterY = paddle.top + paddle.h_half;
        const absDiffY = Math.abs(ballCenterY - paddleCenterY);
        const maxPaddleballDiff = (this.h + paddle.h) / 2;
        const relDiffY = absDiffY / maxPaddleballDiff;
        const angle = relDiffY * 60;
        const angleRadian = degToRad(angle);
        // console.log('angle: ', angle, ', angleRad: ', angleRadian);
        
        this.dx = collision === DrawObj.COLL_LEFT ? Math.cos(angleRadian) : Math.cos(angleRadian) * -1;
        this.dy = ballCenterY > paddleCenterY ? Math.sin(angleRadian) : Math.sin(angleRadian) * -1;
    }

    // self.maxPaddleBallDiff = (settings.ball_height/settings.height + settings.paddle_height/settings.height) / 2
    // def __calc_bounce_angle(self, paddle: PongPaddle, collision: Collision):
    //     ball_center_y = self.top + self.h/2
    //     paddle_center_y = paddle.top + paddle.h/2
    //     diff_y_abs = abs(ball_center_y - paddle_center_y)
    //     rel_diff_y = diff_y_abs / self.maxPaddleBallDiff
    //     new_angle_rad = math.radians(rel_diff_y * 60)
    //     self.dx = math.cos(new_angle_rad) if collision == Collision.COLL_LEFT else math.cos(new_angle_rad)*-1
    //     self.dy = math.sin(new_angle_rad) if ball_center_y > paddle_center_y else math.sin(new_angle_rad)*-1

    /**
     * @param {number} elapsed
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {PongGameplayTypes.PongGameSides | "none"}
     */
    updateBall(elapsed, paddleLeft, paddleRight) {
        return this.#internalUpdateBall(elapsed, paddleLeft, paddleRight);
    }

    /**
     * @param {PongServerTypes.GameObjPosBinary} last
     * @param {number} elapsed
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {PongServerTypes.GameObjPosBinary}
     */
    getPredictedXY(last, elapsed, paddleLeft, paddleRight) {
        // console.log('PongBall: getPredictedXY: myCurrent x: ', this.x);
        // console.log('PongBall: getPredictedXY: myCurrent y: ', this.y);
        // console.log('PongBall: getPredictedXY: last x: ', last.x);
        // console.log('PongBall: getPredictedXY: last y: ', last.y);
        const currX = this.x;
        const currY = this.y;
        const currDX = this.dx;
        const currDY = this.dy;
        this.x = last.x;
        this.y = last.y;
        this.dy = last.dy;
        this.dx = last.dx;
        // console.log('PongBall: getPredictedXY: myNew x: ', this.x);
        // console.log('PongBall: getPredictedXY: myNew y: ', this.y);
        
        this.#internalUpdateBall(elapsed, paddleLeft, paddleRight);
        /** @type {PongServerTypes.GameObjPosBinary} */
        const res = {x: this.x, y: this.y, dx: this.dx, dy: this.dy};
        
        // console.log('PongBall: getPredictedXY: new calc x: ', this.x);
        // console.log('PongBall: getPredictedXY: new calc y: ', this.y);

        this.x = currX;
        this.y = currY;
        this.dx = currDX;
        this.dy = currDY;
        return res;
    }


    // #calcX(elapsedSec) {
    //     this.x = this.x + elapsedSec * this.speedX * this.dx;
    // }
    // #calcY(elapsedSec) {
    //     this.y = this.y + elapsedSec * this.speedY * this.dy;
    // }
    // #recalcDirX(elapsedSec, timeWhileCollision) {
    //     this.#calcX(elapsedSec - timeWhileCollision)
    //     this.dx = this.dx*-1
    //     this.#calcX(timeWhileCollision)
    // }
    // #recalcDirY(elapsedSec, timeWhileCollision) {
    //     this.#calcY(elapsedSec - timeWhileCollision)
    //     this.dy = this.dy*-1
    //     this.#calcY(timeWhileCollision)
    // }

    // /**
    //  *
    //  * @param {PongPaddle} [paddleLeft]
    //  * @param {PongPaddle} [paddleRight]
    //  * @returns {PongGameplayTypes.PongGameSides | "none"}
    //  */
    // updateBall(elapsed, paddleLeft, paddleRight) {
    //     this.#calcX(elapsed)
    //     this.#calcY(elapsed)

    //     const diffY = this.dy > 0 ? this.bottom - this.boundBottom : this.dy < 0 ? this.boundTop - this.top : 0;
    //     if (diffY > 0)
    //         this.#recalcDirY(elapsed, diffY / Math.abs(this.dy * this.speedY))

    //     if (this.right <= this.boundLeft)
    //         return PongBall.Scored.SCORE_LEFT;
    //     if (this.left >= this.boundRight)
    //         return PongBall.Scored.SCORE_RIGHT;

    //     if (!paddleLeft || !paddleRight) {
    //         // console.log('NO PADDLE!!');
    //         return PongBall.Scored.SCORE_NONE;
    //     }
    //     if (this.left >= paddleLeft.right && this.right <= paddleRight.left)
    //         return PongBall.Scored.SCORE_NONE;
    //     const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
    //     const [collision, diffTime] = this.coll_ision(paddle);

    //     if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
    //         this.#recalcDirX(elapsed, diffTime)
    //     } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
    //         this.#recalcDirY(elapsed, diffTime)
    //     }
    //     return PongBall.Scored.SCORE_NONE;
       
    // }


}

// function calcRandAngleSinCos() {
//     const upperBound = (225 * Math.PI) / 180;
//     const lowerBound = (135 * Math.PI) / 180;
//     const angle = Math.random() * (upperBound - lowerBound) + lowerBound;
//     return {
//         sin: Math.sin(angle),
//         cos: Math.cos(angle),
//     };
// }

// export default class PongBall extends DrawObj {
//     static COLLISION_WALL_LEFT = 1;

//     static COLLISION_WALL_RIGHT = 2;

//     /**
//      * @param {OffscreenCanvasRenderingContext2D} ctx
//      * @param {PongGameplayTypes.GameObjData} initDataBall
//      */
//     constructor(ctx, initDataBall) {
//         super(ctx, initDataBall);
//         const { sin, cos } = calcRandAngleSinCos();
//         this.dx = cos;
//         this.dy = sin;
//     }

//     update(elapsed) {
// //         // console.log(`ball: top: ${this.top}`);
// //         // console.log(`ball: bottom: ${this.bottom}`);
//         this.x += elapsed * this.speedX * this.dx;
//         this.y += elapsed * this.speedY * this.dy;

//         if (this.dx > 0 && this.right > this.boundRight) {
//             this.x = this.boundLeft;
//             this.dx = -this.dx;
//         } else if (this.dx < 0 && this.left < this.boundLeft) {
//             this.x = this.boundLeft;
//             this.dx = -this.dx;
//         }
//         if (this.dy > 0 && this.bottom > this.boundBottom) {
//             this.y = this.boundBottom - this.h;
//             this.dy = -this.dy;
//         } else if (this.dy < 0 && this.top < this.boundTop) {
//             this.y = this.boundTop;
//             this.dy = -this.dy;
//         }
//     }

//     /**
//      *
//      * @param {PongPaddle} paddleLeft
//      * @param {PongPaddle} paddleRight
//      * @returns {number | undefined}
//      */
//     checkCollision(paddleLeft, paddleRight) {
// //         // console.log('ball width: ', this.w);
// //         // console.log('ball height: ', this.h);
//         if (this.left >= paddleLeft.right && this.right <= paddleRight.left)
//             return undefined;

//         if (this.left <= this.boundLeft) return PongBall.COLLISION_WALL_LEFT;

//         if (this.right >= this.boundRight) return PongBall.COLLISION_WALL_RIGHT;

//         const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
//         // const collision = this.collision(paddle);
//         const collision = this.coll_ision(paddle);

//         if (collision === DrawObj.COLL_NONE) return undefined;

//         if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
//             this.dx = -this.dx;
//         } else {
//             this.dy = -this.dy;
//         }
//         if (collision === DrawObj.COLL_LEFT)
//             this.x = paddle.right;
//         if (collision === DrawObj.COLL_RIGHT)
//             this.x = paddle.left - this.w;
//         if (collision === DrawObj.COLL_TOP)
//             this.y = paddle.bottom;
//         if (collision === DrawObj.COLL_BOTTOM)
//             this.y = paddle.top - this.h;
//         return undefined;
//     }

// }


    // /** @param {PongPaddle} paddle  */
    // increaseSpeed(paddle) {
    //     // if (paddle.dir === -1) {
    //     //     // const old = this.dy;
    //     //     this.speedY *= this.speedY < 0 ? 0.5 : 1.5;
    //     // } else if (paddle.dir === 1) {
    //     //     // const old = this.dy;
    //     //     this.speedY *= this.speedY < 0 ? 1.5 : 0.5;
    //     // }
    //     // if (paddle.dir === PongPaddle.MOVE_UP) {
    //     //     let old = this.dy;
    //     //     this.dy = this.dy * (this.dy < 0 ? 0.5 : 1.5);
    //     // } else if (paddle.dir === PongPaddle.MOVE_DOWN) {
    //     //     let old = this.dy;
    //     //     this.dy = this.dy * (this.dy < 0 ? 1.5 : 0.5);
    //     // }
    // }