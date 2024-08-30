import DrawObj from './DrawObj.js';

export default class GameCourt extends DrawObj {
    /**
     * @param {PongGameplayTypes.GameObjData} initialData
     */
    constructor(initialData) {
        super(initialData);
        this.scoreL = 0;
        this.scoreR = 0;
        this.color = '#FFF';
        this.borderColor = '#000'
    }

    setColor(courtColor, borderColor) {
        this.color = courtColor;
        this.borderColor = borderColor;
    }

    // /** @param {OffscreenCanvasRenderingContext2D} ctx */
    // draw(ctx, qlen) {
    //     // const x = this.x * this.canvasWidth;
    //     // const y = this.y * this.canvasHeight;
    //     // const w = this.w * this.canvasWidth;
    //     // const h = this.h * this.canvasHeight;
    //     // const bH = this.y * this.canvasHeight;
    //     // const bW = bH;
    //     // const x_center = this.sx + this.sw / 2.0;
    //     // const textHeight = 70;

    //     // ctx.fillStyle = this.borderColor;
    //     ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    //     super.draw(ctx)
    //     // ctx.strokeStyle = this.borderColor;
    //     // ctx.lineWidth = this.sy;
    //     // ctx.beginPath();
    //     // ctx.setLineDash([this.sy, this.sy]);
    //     // ctx.moveTo(x_center, this.sy + this.sy / 2.0);
    //     // ctx.lineTo(x_center, this.sy + this.sh - this.sy / 2.0);
    //     // ctx.stroke();

    //     // ctx.fillStyle = this.borderColor;
    //     // ctx.font = `${textHeight}px sans-serif`;
    //     // ctx.textAlign = 'right';
    //     // ctx.fillText(this.scoreL.toString(), x_center - bH, bH + textHeight);
    //     // ctx.textAlign = 'left';
    //     // if (qlen) {
    //     //     ctx.fillText(qlen.toString(), x_center + bH, bH + textHeight);
    //     // } else {
    //     //     ctx.fillText(this.scoreR.toString(), x_center + bH, bH + textHeight);
    //     // }
    // }
    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {number} [qlen]
     * @param {number} [fps]
     */
    draw(ctx, qlen, fps) {
        const x = this.x * this.canvasWidth;
        const y = this.y * this.canvasHeight;
        const w = this.w * this.canvasWidth;
        const h = this.h * this.canvasHeight;
        const bH = this.y * this.canvasHeight;
        const bW = bH;
        const x_center = x + w / 2.0;
        const textHeight = 70;

        ctx.fillStyle = this.borderColor;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        super.draw(ctx)
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = bW;
        ctx.beginPath();
        ctx.setLineDash([bH, bH]);
        ctx.moveTo(x_center, y + bH / 2.0);
        ctx.lineTo(x_center, y + h - bH / 2.0);
        ctx.stroke();

        ctx.fillStyle = this.borderColor;
        ctx.font = `${textHeight}px sans-serif`;
        ctx.textAlign = 'right';
        if (fps) {
            ctx.fillText(fps.toString(), x_center - bH, bH + textHeight);
        } else {
            ctx.fillText(this.scoreL.toString(), x_center - bH, bH + textHeight);
        }
        ctx.textAlign = 'left';
        if (qlen) {
            ctx.fillText(qlen.toString(), x_center + bH, bH + textHeight);
        } else {
            ctx.fillText(this.scoreR.toString(), x_center + bH, bH + textHeight);
        }
    }
}

// export default class GameCourt extends DrawObj {
//     // constructor(x, y, w, h, borderW, borderH, initialScale_x, initialScale_y) {
//     /**
//      * @param {number} borderSize
//      * @param {DrawObj} [parent]
//      */
//     constructor(borderSize, parent) {
//         const bW = borderSize;
//         const bH = borderSize * 2.0;
//         // super(0, bH, 1, 1 - 2 * bH, parent);
//         super({
//             x: 0.0,
//             w: 1.0,
//             left: 0.0,
//             right: 1.0,
//             y: bH,
//             h: 1.0 - 2.0 * bH,
//             top: bH,
//             bottom: 1.0 - bH,
//             speedX: 0.0,
//             speedY: 0.0,
//             boundTop: 0.0,
//             boundBottom: 1.0,
//             boundLeft: 0.0,
//             boundRight: 1.0,
//         });

//         this.scoreL = 0;
//         this.scoreR = 0;
//         // this.#border = new DrawObj({
//         //     x: 0.0,
//         //     w: 1.0,
//         //     left: 0.0,
//         //     right: 1.0,
//         //     y: 0.0,
//         //     h: bH,
//         //     top: 0.0,
//         //     bottom: bH,
//         //     speedX: 0.0,
//         //     speedY: 0.0,
//         //     boundTop: 0.0,
//         //     boundBottom: bH,
//         //     boundLeft: 0.0,
//         //     boundRight: 1.0,
//         // });
//     }

//     #border;

//     #textHeight = 70;

//     draw(ctx, colorWhite, colorBlack) {
//         ctx.fillStyle = colorWhite;
//         ctx.fillRect(this.x, this.y, this.w, this.h);
//         ctx.strokeStyle = colorBlack;
//         ctx.lineWidth = this.#border.w;
//         ctx.beginPath();
//         ctx.setLineDash([this.#border.h, this.#border.h]);
//         ctx.moveTo(this.x_center, this.y + this.#border.h / 2.0);
//         ctx.lineTo(this.x_center, this.bottom);
//         ctx.stroke();

//         ctx.fillStyle = colorBlack;
//         ctx.font = `${this.#textHeight}px sans-serif`;
//         ctx.textAlign = 'right';
//         ctx.fillText(
//             this.scoreL,
//             this.x_center - this.#border.h,
//             this.#border.h + this.#textHeight,
//         );
//         ctx.textAlign = 'left';
//         ctx.fillText(
//             this.scoreR,
//             this.x_center + this.#border.h,
//             this.#border.h + this.#textHeight,
//         );
//     }
// }

// class GameCourt extends DrawObj {
//     constructor(x, y, w, h, borderW, borderH, initialScale_x, initialScale_y) {
//         super(x, y, w, h, initialScale_x, initialScale_y);

//         this.scoreL = 0;
//         this.scoreR = 0;
//         this.#borderW = borderW;
//         this.#borderH = borderH;
//         this.#textSize = borderH;
//         this.#textSizeUnscaled = this.#textSize / initialScale_y;
//         this.#borderWunscaled = borderW / initialScale_x;
//         this.#borderHunscaled = borderH / initialScale_y;
//     }
//     #borderW;
//     #borderH;
//     #borderX;
//     #borderY;
//     #textSize;
//     #textSizeUnscaled;
//     #borderWunscaled;
//     #borderHunscaled;

//     setScale(newW, newH) {
//         super.setScale();
//         this.#borderW = this.#borderWunscaled * newW;
//         this.#borderH = this.#borderHunscaled * newH;
//         this.#textSize = this.#textSizeUnscaled * newH;
//     }
//     draw(ctx, colorWhite, colorBlack) {

//         ctx.fillStyle = colorWhite;
//         ctx.fillRect(this.x_start, this.y_start, this.w, this.h);
//         ctx.strokeStyle = colorBlack;
//         ctx.lineWidth = this.#borderW;
//         ctx.beginPath();
//         ctx.setLineDash([this.#borderH, this.#borderH]);
//         ctx.moveTo(this.x_center, this.y_start);
//         ctx.lineTo(this.x_center, this.y_end);
//         ctx.stroke();

//         ctx.fillStyle = colorBlack;
//         ctx.font = this.#textSize + "px sans-serif";
//         ctx.textAlign = "right";
//         ctx.fillText(this.scoreL, this.x_center - this.#borderH);

//     }
// };
