import { Pong, PongLocal } from './Pong';
import { PongRemote } from './PongRemote';
// import { PongRemote } from './PongRemote_newmaybe';
// import { PongRemote } from './PongRemoteOnlyRender';
// import { PongRemote } from './PongRemote_old';

/** @type {Pong | undefined} */
let game;

/** @param {MessageEvent} ev */
onmessage = (ev) => {
    /** @type {ToWorkerGameMessageTypes.ToWorkerMessage} */
    const msg = ev.data;
    switch (msg.message) {
        case 'game_worker_create_local':
            game = new PongLocal(msg)
            break;
        case 'game_worker_create_remote':
            game = new PongRemote(msg)
            break;
        case 'worker_game_touch':
            game?.handleMouseTouch(msg);
            break;
        case 'worker_game_key':
            game?.handleKey(msg);
            break;
        case 'worker_game_pause':
            game?.pauseGame();
            break;
        case 'worker_game_resume':
            game?.resumeGame();
            break;
        case 'worker_game_start':
            game?.startGame();
            break;
        case 'worker_game_quit':
            game?.quitGame();
            break;
        case 'worker_game_resize':
            game?.setCanvasSizes(msg);
            break;
        case 'worker_game_change_color':
            game?.changeColor(msg);
            break;
        default:
            break;
    }
};
