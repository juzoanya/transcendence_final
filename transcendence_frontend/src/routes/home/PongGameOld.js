/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
import { BaseElement, createRef, html, ref } from '../../lib_templ/BaseElement.js';
import GameHub from '../../gaming/manager/gameHub.js';
import { avatarInfo, avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { gameAPI, sessionService } from '../../services/api/API.js';
import router from '../../services/router.js';
import { ToastNotificationErrorEvent, ToastNotificationSuccessEvent, ToastNotificationUserEvent } from '../../components/bootstrap/BsToasts.js';
import BsModal from '../../components/bootstrap/BsModal.js';
import { Modal } from 'bootstrap';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { PongGameOverlays } from './PongGameOverlays.js';
import { Ref } from '../../lib_templ/templ/nodes/FuncNode.js';
import { getPreferredTheme } from '../../services/themeSwitcher.js';
import { calcContrastColor } from '../../gaming/manager/colorcalc.js';
import { getTournamentLink } from './utils.js';

/**
 *
 * @param {HTMLElement} obsElem
 * @param {number} aspectRatio
 * @param {(newW: number, newH: number) => void} cb
 * @returns {() => void}
 */
function useCanvasSizes(obsElem, aspectRatio, cb) {
    if (!obsElem) throw new Error('undefined wrapper Element');
    if (aspectRatio <= 0) throw new Error('invalid aspect Ratio');
    if (!cb) throw new Error('undefined callback');
    let newW;
    let newH;
    const myObserver = new ResizeObserver((entries) => {
        console.log('obsElem boundingRect: ', obsElem.getBoundingClientRect());
        console.log('contentRect: ', entries[0].contentRect);
        newW = entries[0].contentRect.width;
        newH = entries[0].contentRect.height;
        const calcW = Math.trunc(newH / aspectRatio);
        const calcH = Math.trunc(newW * aspectRatio);
        if (calcH > newH) {
            cb(calcW, newH);
        } else {
            cb(newW, calcH);
        }
    });
    myObserver.observe(obsElem);
    let disconnected = false;
    return () => {
        if (disconnected) return;
        myObserver.disconnect();
        disconnected = true;
    };
}

export default class GameScreen extends BaseElement {
    static observedAtrributes = ['id'];

    constructor() {
        super(false, false, true);
        this.session = sessionService.subscribe(this);

        /** @type {GameHub | undefined} */
        this.currentGame = undefined;
    }

    #closeObs;

    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLCanvasElement>} */
    #canvas = createRef()

    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLDivElement>} */
    #wrapper = createRef()

    assertParam() {

    }

    /** @type {APITypes.GameScheduleItem | null} */
    #gameData = null;
    onBeforeMount(route, params, url) {
        console.log('game window, params: ', params);
        console.log('session value: ', this.session.value);
        const shed = params.schedule_id;
        this.searchParams = params.searchParams;
        if (typeof shed === 'string') {
            const pattern = /(\w+)\((\w+)\)/g;
            const match = pattern.exec(shed);
            console.log('shed: ', shed);
            console.log('match: ', match);
            
            if(match && typeof match[1] === 'string' && typeof match[2] === 'string' ) {
                const schedule_id = Number(match[1]);
                const game = this.session.value?.game_schedule?.find(i => i.schedule_id == schedule_id);
                console.log('corresponsing match: ', game);
                if (game == undefined) {
                    document.dispatchEvent(new ToastNotificationErrorEvent('game not found'));
                    router.redirect('history.back');
                    return;
                }
                if (game.game_mode === 'tournament') {
                    
                }
                
                this.isRandom = true;
                this.isRandomPushed = false;
                gameAPI.pushRandomResults(schedule_id, 10).then((res) => {
                    document.dispatchEvent(new ToastNotificationSuccessEvent("random results pushed"));
                    if (res.success == false) {
                        document.dispatchEvent(new ToastNotificationErrorEvent(res.message));
                    }
                }).catch((error) => {
                    sessionService.handleFetchError(error);
                })
                setTimeout(() => {
                    if (typeof game.tournament !== 'number') {
                        router.redirect('/');
                    } else {
                        router.redirect(getTournamentLink(game.game_id.toLowerCase(), game.tournament));
                    }
                }, 10);
            }
        }
        const game = this.session.value?.game_schedule?.find(i => i.schedule_id == params.schedule_id);
        if (game == undefined) {
            document.dispatchEvent(new ToastNotificationErrorEvent("game not found"));
            return router.redirect("/");
        }
        this.#gameData = game;
        console.log('game: ', game);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.body.classList.remove("overflow-hidden");
        if (this.#closeObs) this.#closeObs();
        this.currentGame?.quitGame();
    }

    #aspectRatio = 0.5;

    #gameReady = false;
    #gameStarted = false;
    connectedCallback() {
        super.connectedCallback();
        this.init();
        // document.body.classList.add("overflow-hidden");

        // console.log('canvas: ', this.#canvas.value);
        // console.log('this.#wrapper.value: ', this.#wrapper.value);
        
        // if (!this.#canvas.value || !this.#wrapper.value || !this.#gameData) return;
       
        // this.currentGame = GameHub.startGame(this.#canvas.value, this.#gameData, true);
        
        // this.toggleColor();

        // this.#closeObs = useCanvasSizes(this.#wrapper.value, this.#aspectRatio, (newW, newH) => {
        //     console.log('NEW CANVAS SIZES: ', this.#canvas, ", ", this.#canvas.value);
        //     if (!this.#canvas.value || !this.#wrapper.value) return;
        //     this.#canvas.value.style.width = `${newW}px`;
        //     this.#canvas.value.style.height = `${newH}px`;
        //     const canvasRect = this.#canvas.value.getBoundingClientRect();
        //     this.currentGame?.resizeCanvas(canvasRect.x, canvasRect.y, newW, newH, window.devicePixelRatio);
        // });

        // this.setWorkerHandler();

        // this.pongOverlayRef.value?.showWaitForLaunch('launchSelf', this.#gameData);
        // this.setupDone = true;
        // super.requestUpdateDirect();
    }

    async init() {
        await this.updateComplete;
        document.body.classList.add("overflow-hidden");

        console.log('canvas: ', this.#canvas.value);
        console.log('this.#wrapper.value: ', this.#wrapper.value);
        console.log('this.pongOverlayRef.value: ', this.pongOverlayRef.value);
        
        if (!this.#canvas.value || !this.#wrapper.value || !this.#gameData) return;
       
        this.currentGame = GameHub.startGame(this.#canvas.value, this.#gameData, true);
        // this.currentGame = GameHub.startGame(this.#canvas.value, this.#gameData, false);
        
        this.toggleColor();

        this.#closeObs = useCanvasSizes(this.#wrapper.value, this.#aspectRatio, (newW, newH) => {
            console.log('NEW CANVAS SIZES: ', this.#canvas, ", ", this.#canvas.value);
            if (!this.#canvas.value || !this.#wrapper.value) return;
            this.#canvas.value.style.width = `${newW}px`;
            this.#canvas.value.style.height = `${newH}px`;
            const canvasRect = this.#canvas.value.getBoundingClientRect();
            this.currentGame?.resizeCanvas(canvasRect.x, canvasRect.y, newW, newH, window.devicePixelRatio);
        });

        this.setWorkerHandler();

        this.pongOverlayRef.value?.showWaitForLaunch('launchSelf', this.#gameData);
        this.setupDone = true;
        super.requestUpdateDirect();
    }

    toggleColor() {
        const cont = this.querySelector('div.game-screen-container');
        if (cont instanceof HTMLElement) {
            const colorWhite = window.getComputedStyle(cont).getPropertyValue('background-color');
            const colorBlack = calcContrastColor(colorWhite);
            if (colorWhite && colorBlack)
                this.currentGame?.worker.postMessage({message: 'worker_game_change_color', colorWhite, colorBlack});
        }
    }

    setWorkerHandler() {
        this.currentGame?.setWorkerMessageHandler("from-worker-game-ready", async (msg) => {
            this.#gameReady = true;
            console.log('WORKER GAME READY');
            if (!this.pongOverlayRef.value) return;
            await this.pongOverlayRef.value.waitForLaunchModal.value?.updateComplete;
            this.pongOverlayRef.value?.hide('waitForLaunchModal');
            await this.pongOverlayRef.value.waitForLaunchModal.value?.updateComplete;
            // this.pongOverlayRef.value?.hide('all');
            // setTimeout(() => {
                this.pongOverlayRef.value?.showStartGame(this.#gameData, () => {
                    this.currentGame?.worker.postMessage({message: 'worker_game_start'})
                    this.pongOverlayRef.value?.showWaitForStart(this.#gameData)
                   
                }); 
            // }, 400);
            // super.requestUpdateDirect();
        })
        this.currentGame?.setWorkerMessageHandler('from-worker-game-dismissed', (msg) => {
            this.pongOverlayRef.value?.hide('all');
            this.currentGame?.quitGame();
            const user = this.#gameData?.player_one.id === msg.user_id ? this.#gameData?.player_one : this.#gameData?.player_two;
            if (user) {
                document.dispatchEvent(new ToastNotificationUserEvent(user, 'dismissed the request'));
            }
            router.redirect('/');
        })
        this.currentGame?.setWorkerMessageHandler('from-worker-game-started', (msg) => {
            console.log('WORKER GAME STARTED');
            this.pongOverlayRef.value?.hide('all');

           
            // super.requestUpdateDirect();
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-client-connected", (msg) => {
            if (msg.user_id === this.session.value?.user?.id) {
                console.log('client connected: self');
                
                this.pongOverlayRef.value?.showWaitForLaunch('launchOther', this.#gameData);
            } else {
                this.pongOverlayRef.value?.hide('waitForLaunchModal');
                console.log('client connected: other');
            }
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-client-disconnected", (msg) => {
            this.pongOverlayRef.value?.showDisconnect(this.#gameData, msg.user_id);
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-client-reconnected", (msg) => {
            this.pongOverlayRef.value?.hide('disconnectModal');
            super.requestUpdateDirect();
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-game-paused", (msg) => {
            this.#paused = true;
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-game-resumed", (msg) => {
            this.#paused = false;
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-error", (msg) => {
            console.log('worker error: ', msg);
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-player-scored", (msg) => {
            
        })

        this.currentGame?.setWorkerMessageHandler("from-worker-game-done", (br) => {
            this.pongOverlayRef.value?.showGameDone(br, () => {
                this.pongOverlayRef.value?.hide('all');
                setTimeout(() => {
                    this.currentGame?.quitGame();
                    sessionService.updateData(['game_schedule', 'tournaments']);
                    history.back();
                }, 400);
            });
        })
    }
    
    #paused = false;

    renderDebugHeader = () => {
        if (!this.#gameData) return;
        /** @type {APITypes.GameScheduleItem} */
        const res = {
            ...this.#gameData,
            result: {
                loser: this.#gameData.player_one.alias,
                loser_xp: 0,
                winner: this.#gameData.player_two.alias,
                winner_xp: 4,
                time_finished: new Date().toDateString(),
                time_started: new Date().toDateString(),
                player_one_score: 3,
                player_two_score: 10,
                winner_id: this.#gameData.player_two.id,
                loser_id: this.#gameData.player_one.id,
            }
        }
        /** @type {FromWorkerGameMessageTypes.GameEnd} */
        this.debGameDoneData = {
            game_result: res,
            loser_id: this.#gameData.player_one.id,
            loser_side: 'left',
            message: 'from-worker-game-done',
            player_one_id: this.#gameData.player_one.id,
            player_two_id: this.#gameData.player_two.id,
            player_one_score: 3,
            player_two_score: 10,
            winner_id: this.#gameData.player_two.id,
            winner_side: 'right',
            reason: 'surrender'
        }
      
        return html`
            <button @click=${(e)=>{this.pongOverlayRef.value?.showWaitForLaunch('launchOther', this.#gameData)}} type="button" class="mx-1 btn btn-primary">launch</button>
            <button @click=${(e)=>{this.pongOverlayRef.value?.showStartGame(this.#gameData)}} type="button" class="mx-1 btn btn-success">start</button>
            <button @click=${(e)=>{this.pongOverlayRef.value?.showWaitForStart(this.#gameData)}} type="button" class="mx-1 btn btn-secondary">waitStart</button>
            <button @click=${(e)=>{this.pongOverlayRef.value?.showDisconnect(this.#gameData, this.#gameData?.player_one.id)}} type="button" class="mx-1 btn btn-danger">disc</button>
            <button @click=${(e)=>{this.pongOverlayRef.value?.showGameDone(this.debGameDoneData)}} type="button" class="mx-1 btn btn-info">done</button>
            <button @click=${(e)=>{
                this.pongOverlayRef.value?.showWaitForLaunch('launchOther', this.#gameData);
                setTimeout(() => {
                    this.pongOverlayRef.value?.hide('all');
                    this.pongOverlayRef.value?.showStartGame(this.#gameData, () => {
                        this.pongOverlayRef.value?.hide('all');
                        this.pongOverlayRef.value?.showWaitForStart(this.#gameData);
                        setTimeout(() => {
                            this.pongOverlayRef.value?.hide('all');
                        }, 2000);
                    });
                }, 2000);
            }} type="button" class="mx-2 btn btn-dark">cycle</button>
        `
    }

    renderGameHeader = () => html`
        <button type="button" class=" btn btn-outline-dark rounded-circle"
                @click=${() => {
                    if (!this.#paused) this.currentGame?.pauseGame();
                    else this.currentGame?.continueGame();
                    super.requestUpdateDirect();
                }}
            >
            <i class="fa-solid fa-${this.#paused ? 'play' : 'pause'}"></i>
        </button>

        <button @click=${() => {
            this.currentGame?.quitGame();
            router.redirect("/");
        }} type="button" class="btn-close btn-lg"  aria-label="Close"
        >
        </button>
    `

    /** @type {Ref<PongGameOverlays>} */
    pongOverlayRef = createRef();

    render() {
        console.log('render GameScreen');
        
        return html`
            <div class="game-screen-container bg-light-subtle">
                <div class="game-screen-flex">
                    <div class="game-screen-header">
                        ${this.renderGameHeader()}
                    </div>
                    <div ${ref(this.#wrapper)} class="game-screen">
                        <canvas ${ref(this.#canvas)} ></canvas>
                    </div>
                </div>
            </div>
            <pong-game-overlays ${ref(this.pongOverlayRef)} ></pong-game-overlays>
        `
       
    }

}
window.customElements.define('game-screen', GameScreen);

 // return this.renderGameModal(html`
        //     <button type="button" class=" btn btn-outline-dark"
        //             @click=${() => {
        //                 if (!this.#paused) this.currentGame?.pauseGame();
        //                 else this.currentGame?.continueGame();
        //                 super.requestUpdateDirect();
        //             }}
        //         >
        //         <i class="fa-solid fa-${this.#paused ? 'play' : 'pause'}"></i>
        //     </button>
        //     <div ${ref(this.#wrapper)} class="w-100 h-100 d-flex justify-content-center align-items-center">
        //         <canvas ${ref(this.#canvas)} ></canvas>
        //     </div>
            
        // `)

// renderGameModal = (content) => html`
// <div class="modal show" tabindex="-1" style="${'display: block;'}" >
//     <div class="modal-dialog modal-fullscreen">
//         <div class="modal-content">
//             <div class="modal-header">
//                 <button @click=${(e)=>{this.pongOverlayRef.value?.showWaitForLaunch(this.#gameData)}} type="button" class="mx-1 btn btn-primary">launch</button>
//                 <button @click=${(e)=>{this.pongOverlayRef.value?.showStartGame(this.#gameData)}} type="button" class="mx-1 btn btn-success">start</button>
//                 <button @click=${(e)=>{this.pongOverlayRef.value?.showWaitForStart(this.#gameData)}} type="button" class="mx-1 btn btn-secondary">waitStart</button>
//                 <button @click=${(e)=>{this.pongOverlayRef.value?.showDisconnect(this.#gameData, this.#gameData?.player_one.id)}} type="button" class="mx-1 btn btn-danger">disc</button>
//                 <button @click=${(e)=>{this.pongOverlayRef.value?.showGameDone(this.debGameDoneData)}} type="button" class="mx-1 btn btn-info">done</button>
//                 <button @click=${(e)=>{
//                     this.pongOverlayRef.value?.showWaitForLaunch(this.#gameData);
//                     setTimeout(() => {
//                         this.pongOverlayRef.value?.hide('all');
//                         this.pongOverlayRef.value?.showStartGame(this.#gameData, () => {
//                             this.pongOverlayRef.value?.hide('all');
//                             this.pongOverlayRef.value?.showWaitForStart(this.#gameData);
//                             setTimeout(() => {
//                                 this.pongOverlayRef.value?.hide('all');
//                             }, 2000);
//                         });
//                     }, 2000);
//                 }} type="button" class="mx-2 btn btn-dark">cycle</button>

//                 <button @click=${() => {
//                     this.currentGame?.quitGame();
//                     router.redirect("/");
//                 }} type="button" class="btn-close btn-lg"  aria-label="Close"
//                 >
//                 </button>
//             </div>
//             <div class="modal-body">
//                 ${content}
//             </div>
//         </div>
//     </div>
// </div>
// <pong-game-overlays ${ref(this.pongOverlayRef)} ></pong-game-overlays>
// `
// // <bs-modal ${ref(this.#gameInfoModal)} centered .data=${this.#gameInfoModalData}></bs-modal>




    // /** @param {number} id */
    // getPlayerDataFromId = (id) => this.#gameData?.player_one.id === id ? this.#gameData?.player_one : this.#gameData?.player_two;
    // getPlayerDataSelf = () => this.#gameData?.player_one.id === this.session.value.user?.id ? this.#gameData?.player_one : this.#gameData?.player_two
    // /** @param {number} id */
    // playerIsSelf = (id) => id === this.session.value.user?.id
 

    // // /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
    // // #startGameModal = createRef();
    // // #gameLoaded = false;
    // // renderGameScreen = () => html`
        
    // // `;

    // /** @type {BsModalData} */
    // #gameInfoModalData = {  content: html`<span>EMPTY</span>` }
    // /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
    // #gameInfoModal = createRef();

    // /**
    //  * @param {FromWorkerGameMessageTypes.GameEnd} data
    //  * @typedef {{header?: TemplateAsLiteral, content: TemplateAsLiteral, footer?: TemplateAsLiteral}} BsModalData
    //  * @returns {BsModalData}
    //  */
    // getGameDoneModalData = (data) => ({
    //     header: html`
    //         <span>${data.winner_id === this.session.value.user?.id ? 'You' : data.game_result?.result.winner} won the Match!</span>
    //     `,
    //     content: html`
    //         <div class="d-flex flex-row align-items-center justify-content-center">
    //             ${avatarInfo(data.game_result?.player_one)}
    //             <p>XP: ${data.winner_id === data.game_result?.player_one.id ? data.game_result?.result.winner_xp : '' }</p>
    //         </div>
    //     `,
    // })

    // /** @param {FromWorkerGameMessageTypes.GameEnd} data @param {APITypes.PlayerData} player */
    // getXPforPlayer = (data, player) => data.game_result?.player_one.id === player.i

    // /**
    //  * @param {number} id
    //  * @returns {BsModalData}
    //  */
    // getDisconnectedModalData = (id) => ({
    //     header: html`<span>Connection Lost</span>`,
    //     content: html`
    //         <div class="d-flex flex-row align-items-center justify-content-center">
    //             ${avatarInfo(this.getPlayerDataFromId(id))}
    //             ${this.playerIsSelf(id) ? 'You' : ''}
    //             <span>disconnected</span>
    //         </div>
    //         <div>
    //             ${this.playerIsSelf(id) ? 'attempting to reconnect' : 'waiting for Opponent...'}
    //             <div class="spinner-border text-primary" role="status">
    //                 <span class="visually-hidden">Loading...</span>
    //             </div>
    //         </div>
    //     `,
    // })
    // /**
    //  * @returns {BsModalData}
    //  */
    // getGameStartModalData = () => ({
    //     header: html`
    //                 <span>Pong Match starts in: </span>
    //                 <timer-comp timeout="3" ></timer-comp>`,
    //     content: html`
    //         <div class="d-flex align-items-center justify-content-around">
    //             ${avatarInfo(this.#gameData?.player_two)}
    //             <p class="m-0">VS</p>
    //             ${avatarInfo(this.#gameData?.player_one)}
    //         </div>
    //     `,
    //     footer: html`
    //         <bs-button text="Start Game" ._async_handler=${(e)=> {
    //             this.currentGame?.startGame();
    //             // this.#startGameModal.value?.hideModal();
    //             this.#gameInfoModal.value?.hideModal();
    //         }} ></bs-button>
    //     `
    // })




// /**
//  *
//  * @param {HTMLElement} obsElem
//  * @param {number} aspectRatio
//  * @param {(newW: number, newH: number) => void} cb
//  * @returns {() => void}
//  */
// function useCanvasSizes(obsElem, aspectRatio, cb) {
//     if (!obsElem) throw new Error('undefined wrapper Element');
//     if (aspectRatio <= 0) throw new Error('invalid aspect Ratio');
//     if (!cb) throw new Error('undefined callback');
//     let newW;
//     let newH;
//     const myObserver = new ResizeObserver((entries) => {
//         console.log('obsElem boundingRect: ', obsElem.getBoundingClientRect());
//         console.log('contentRect: ', entries[0].contentRect);
//         newW = entries[0].contentRect.width;
//         newH = entries[0].contentRect.height;
//         const calcW = Math.trunc(newH / aspectRatio);
//         const calcH = Math.trunc(newW * aspectRatio);
//         if (calcH > newH) {
//             cb(calcW, newH);
//         } else {
//             cb(newW, calcH);
//         }
//     });
//     myObserver.observe(obsElem);
//     let disconnected = false;
//     return () => {
//         if (disconnected) return;
//         myObserver.disconnect();
//         disconnected = true;
//     };
// }

// const renderLoadingModal = () => html`
//     <div
//         class="modal fade"
//         id="loadingModal"
//         tabindex="-1"
//         aria-labelledby="loadingModalLabel"
//         aria-hidden="true"
//     >
//         <div class="modal-dialog modal-dialog-centered">
//             <div class="modal-content">
//                 <div class="modal-header">
//                     <h5 class="modal-title" id="loadingModalLabel">Verbindung wird hergestellt...</h5>
//                 </div>
//                 <div class="modal-body text-center">
//                     <div class="spinner-border text-primary" role="status">
//                         <span class="visually-hidden">Laden...</span>
//                     </div>
//                     <p class="mt-3">Bitte warten, während die Verbindung zum Server hergestellt wird.</p>
//                 </div>
//             </div>
//         </div>
//     </div>
// `;

// export default class GameModal2 extends BaseElement {
//     static observedAtrributes = ['id'];

//     constructor() {
//         super(false, false);
//         this.session = sessionService.subscribe(this);

//         /** @type {GameHub | undefined} */
//         this.currentGame = undefined;
//     }

//     #aspectRatio = 0.5;

//     #closeObs;

//     // /** @type {HTMLCanvasElement | undefined} */
//     // #canvas;

//     // /** @type {HTMLDivElement | undefined} */
//     // #wrapper;
//     /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLCanvasElement>} */
//     #canvas = createRef()

//     /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLDivElement>} */
//     #wrapper = createRef()


//     /** @type {APITypes.GameScheduleItem | null} */
//     #gameData = null;
//     onBeforeMount(route, params, url) {
//         console.log('game window, params: ', params);
//         console.log('session value: ', this.session.value);
//         const game = this.session.value?.game_schedule?.find(i => i.schedule_id == params.schedule_id);
//         if (game == undefined) {
//             document.dispatchEvent(new ToastNotificationErrorEvent("game not found"));
//             return router.redirect("/");
//         }
//         this.#gameData = game;
//         console.log('game: ', game);
//     }



//     #gameReady = false;
//     #gameStarted = false;
//     connectedCallback() {
//         super.connectedCallback();
//         console.log('game view connected');
//         document.body.classList.add("overflow-hidden");

        

//         // super.requestUpdateDirect();

//         console.log('connected callback canvas: ', this.#canvas.value);
//         console.log('connected callback wrapper: ', this.#wrapper.value);
//         console.log('connected callback gameData: ', this.#gameData);
//         if (!this.#canvas.value || !this.#wrapper.value || !this.#gameData) return;
//         // this.currentGame = GameHub.startGame(this.#canvas.value, this.#gameData, false);

//         /** @type {APITypes.GameScheduleItem} */
//         const res = {
//             ...this.#gameData,
//             result: {
//                 loser: this.#gameData.player_one.alias,
//                 loser_xp: 0,
//                 winner: this.#gameData.player_two.alias,
//                 winner_xp: 4,
//                 time_finished: new Date().toDateString(),
//                 time_started: new Date().toDateString(),
//                 player_one_score: 3,
//                 player_two_score: 10
//             }
//         }
//         this.#gameDoneData = {
//             game_result: res,
//             loser_id: this.#gameData.player_one.id,
//             loser_side: 'left',
//             message: 'from-worker-game-done',
//             player_one_id: this.#gameData.player_one.id,
//             player_two_id: this.#gameData.player_two.id,
//             player_one_score: 3,
//             player_two_score: 10,
//             winner_id: this.#gameData.player_two.id,
//             winner_side: 'right',
//             reason: 'surrender'
//         }
//         this.#gameDoneModal.value?.showModal();
//         super.requestUpdateDirect();


//         // this.#closeObs = useCanvasSizes(this.#wrapper.value, this.#aspectRatio, (newW, newH) => {
//         //     console.log('NEW CANVAS SIZES: ', this.#canvas, ", ", this.#canvas.value);
//         //     if (!this.#canvas.value || !this.#wrapper.value) return;
//         //     this.#canvas.value.style.width = `${newW}px`;
//         //     this.#canvas.value.style.height = `${newH}px`;
//         //     const canvasRect = this.#canvas.value.getBoundingClientRect();
//         //     this.currentGame?.resizeCanvas(canvasRect.x, canvasRect.y, newW, newH, window.devicePixelRatio);
//         // });

//         this.currentGame?.setWorkerMessageHandler("from-worker-game-ready", (msg) => {
//             this.#gameReady = true;
//             console.log('WORKER GAME READY');
//             this.#startGameModal.value?.showModal();
//             super.requestUpdateDirect();
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-client-connected", (msg) => {
//             // if (msg.user_id !== this.session.value?.user?.id)
//             //     document.dispatchEvent(new ToastNotificationSuccessEvent(`${msg.user_id === this.#gameData?.player_one.id ? this.#gameData?.player_one.username : this.#gameData?.player_two.username } joined the game`))
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-client-disconnected", (msg) => {
            
//             this.#disconnectedUser.self = msg.user_id === this.session.value?.user?.id ? true : false;
//             this.#disconnectedUser.data = msg.user_id === this.#gameData?.player_one.id ? this.#gameData?.player_one : this.#gameData?.player_two;
//             this.#disconnectModal.value?.showModal();
//             super.requestUpdateDirect();
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-client-reconnected", (msg) => {
//             this.#disconnectModal.value?.hideModal();
//             super.requestUpdateDirect();
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-game-paused", (msg) => {
//             this.#paused = true;
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-game-resumed", (msg) => {
//             this.#paused = false;
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-error", (msg) => {
//             console.log('worker error: ', msg);
//             // this.currentGame?.quitGame();
//             // document.dispatchEvent(new ToastNotificationErrorEvent(msg.error));
//             // router.redirect('/')
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-player-scored", (msg) => {
            
//         })

//         this.currentGame?.setWorkerMessageHandler("from-worker-game-done", (br) => {
//             this.#gameDoneData = br;
//             this.#gameDoneModal.value?.showModal()
//         })
//     }


//     disconnectedCallback() {
//         document.body.classList.remove("overflow-hidden");
//         super.disconnectedCallback();
//         if (this.#closeObs) this.#closeObs();
//         this.currentGame?.quitGame();
//     }

//     /** @type {FromWorkerGameMessageTypes.GameEnd | undefined} */
//     #gameDoneData;

//     renderFooter = () => html`
//         <div class="modal-footer">
//             <button type="button" class="btn btn-primary" @click=${() => { this.currentGame?.startGame(); }} >
//                 start game
//             </button>
//             <button type="button" class="btn btn-success" @click=${() => { this.currentGame?.quitGame(); }} >
//                 quit game
//             </button>
//             <button type="button" class="btn btn-warning" @click=${() => { this.currentGame?.pauseGame(); }} >
//                 pause game
//             </button>
//             <button type="button" class="btn btn-info" @click=${() => { this.currentGame?.continueGame(); }} >
//                 continue game
//             </button>
//             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
//                 @click=${() => { this.currentGame?.quitGame(); }}
//             >
//                 Close
//             </button>
//         </div>
//     `;

//     /** @type {{self: boolean, data: APITypes.PlayerData | undefined}} */
//     #disconnectedUser = {
//         self: false,
//         data: undefined
//     };
//     #paused = false;
    
//     /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
//     #disconnectModal = createRef();
//     /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
//     #gameDoneModal = createRef();
//     renderDisconnectModal = () => html`
        
//     `

//     /** @param {APITypes.GameScheduleItem} data @param {number} [id] */
//     getPlayerDataFromId = (data, id) => {
//         if (id == undefined) id = this.session.value.user?.id
//         return data.player_one.id === id ? data.player_one : data.player_two;
//     }
 

//     /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
//     #startGameModal = createRef();
//     #gameLoaded = false;
//     renderGameScreen = () => html`
//         <div ${ref(this.#wrapper)} class="w-100 h-100 d-flex justify-content-center align-items-center">
//             <canvas ${ref(this.#canvas)} ></canvas>
//         </div>
//     `;

//     /**
//      * @typedef {{header: TemplateAsLiteral | null, content: TemplateAsLiteral | null, footer: TemplateAsLiteral | null}} BsModalData
//      * @returns {BsModalData}
//      */
//     getGameDoneModalData = () => ({
//         header: html`
//             <span>${this.#gameDoneData?.winner_id === this.session.value.user?.id ? 'You' : this.#gameDoneData?.game_result?.result.winner} won the Match!</span>
//         `,
//         content: html`
//             <div class="d-flex flex-row align-items-center justify-content-center">
//                 ${avatarInfo(this.#gameDoneData?.game_result?.player_one)}
//                 <p>${""}</p>
//             </div>
//         `,
//         footer: null,
//     })
   
//     render() {
//         console.log('GAME DONE DATA: ', this.#gameDoneData);
        
//         return html`
//             <div class="modal show" tabindex="-1" style="${'display: block;'}" >
//                 <div class="modal-dialog modal-fullscreen">
//                     <div class="modal-content">
//                         <div class="modal-header">
//                             <div class="d-flex flex-row">
//                                 <button @click=${() => {
//                                     this.currentGame?.quitGame();
//                                     router.redirect("/");
//                                 }} type="button" class="btn-close btn-lg"  aria-label="Close"
//                                 >
//                                 </button>
//                                 <button type="button" class=" btn btn-outline-dark"
//                                     @click=${() => {
//                                         if (!this.#paused) this.currentGame?.pauseGame();
//                                         else this.currentGame?.continueGame();
//                                         super.requestUpdateDirect();
//                                     }}
//                                 >
//                                     <i class="fa-solid fa-${this.#paused ? 'play' : 'pause'}"></i>
//                                 </button>
//                             </div>
//                         </div>
//                         <div class="modal-body">${this.renderGameScreen()}</div>
//                     </div>
//                 </div>
//             </div>
//             <bs-modal ${ref(this.#startGameModal)}
//                 centered
//                 .header=${html`
//                     <span>Pong Match starts in: </span>
//                     <timer-comp timeout="3" ></timer-comp>
//                 `}
//                 .content=${html`
//                     <div class="d-flex align-items-center justify-content-around">
//                         ${avatarInfo(this.#gameData?.player_two)}
//                         <p class="m-0">VS</p>
//                         ${avatarInfo(this.#gameData?.player_one)}
//                     </div>
//                 `}
//                 .footer=${html`
//                     <bs-button text="Start Game" ._async_handler=${(e)=> {
//                         this.currentGame?.startGame();
//                         this.#startGameModal.value?.hideModal();
//                     }} ></bs-button>
//                     `}
//             >
//             </bs-modal>
//             <bs-modal ${ref(this.#disconnectModal)}
//             centered
//             .header=${html`
//                 <span>Connection Lost</span>
//             `}
//             .content=${html`
//                 <div class="d-flex flex-row align-items-center justify-content-center">
//                     ${avatarInfo(this.#disconnectedUser.data)}
//                     ${this.#disconnectedUser.self ? 'You' : ''}
//                     <span>disconnected</span>
//                 </div>
//                 <div>
//                     ${this.#disconnectedUser.self ? 'attempting to reconnect' : 'waiting for Opponent...'}
//                     <div class="spinner-border text-primary" role="status">
//                         <span class="visually-hidden">Loading...</span>
//                     </div>
//                 </div>
//             `}
//             >
//             </bs-modal>
//             <bs-modal ${ref(this.#gameDoneModal)} centered .data=${this.getGameDoneModalData()}></bs-modal>
//         `;
//     }

// }
// window.customElements.define('game-modaln', GameModal2);
