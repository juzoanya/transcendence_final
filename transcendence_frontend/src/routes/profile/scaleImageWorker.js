
/**
 * @typedef {{
 *  canvas: OffscreenCanvas
 * }} ImageScalerInit
 */

/**
 * @typedef {{
 *  image: File;
 *  id?: number;
 *  size: number;
 * }} ScaleImageMessage
 */

/**
 * @typedef {{
 *  image: Blob;
 *  id?: number;
 *  width: number;
 *  height: number;
 * }} ScaledImageMessage
 */

/**
 * @typedef {{
 *  error: string;
 *  id?:number;
 * }} ErrorMessage
 */

/** @type {OffscreenCanvas | undefined} */
let canvas;
/** @type {OffscreenCanvasRenderingContext2D | undefined | null} */
let ctx;

/** @param {MessageEvent} e */
self.onmessage = (e) => {
    /** @type {ScaleImageMessage | ImageScalerInit} */
    const msg = e.data;
    console.log('MSG: ', msg);
    
    if ('canvas' in msg && msg.canvas instanceof OffscreenCanvas) {
        canvas = msg.canvas;
        ctx = canvas.getContext('2d');
        console.log('init: canvas: ', canvas);
        console.log('init: ctx: ', ctx);
        
    } else if ('image' in msg && msg.image instanceof File) {
        if (msg.image.type.match(/image.*/) == null) {
            postMessage({error: 'invalid format'});
        }
        console.log('An image has been loaded');

        createImageBitmap(msg.image).then((imageBitmap) => {
            console.log('bitmap created: ', imageBitmap);
            console.log('canvas: ', canvas);
            console.log('ctx: ', ctx);
            
            if (canvas instanceof OffscreenCanvas && ctx instanceof OffscreenCanvasRenderingContext2D) {

                const max_size = msg.size ?? 500;
                let width = imageBitmap.width, height = imageBitmap.height;
                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(imageBitmap, 0, 0, width, height);
                canvas.convertToBlob({type: 'image/jpeg'}).then((blob) => {
                    if (canvas instanceof OffscreenCanvas && ctx instanceof OffscreenCanvasRenderingContext2D) {
                        ctx.clearRect(0, 0, width, height);
                        canvas.width = 0;
                        canvas.height = 0;
                        /** @type {ScaledImageMessage} */
                        const pm = {image: blob, width, height, id: msg.id};
                        postMessage(pm);
                    }
                }).catch((err) => {
                    postMessage({error: `${err}`, id: msg.id});
                });
            }
        }).catch((err) => {
            postMessage({error: `${err}`, id: msg.id});
        });
    }
}
