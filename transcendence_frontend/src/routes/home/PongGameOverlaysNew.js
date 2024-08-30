import { avatarInfo } from '../../components/bootstrap/AvatarComponent';
import BsModal from '../../components/bootstrap/BsModal';
import { BaseElement, createRef, ref, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API';

export class PongGameOverlays extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super(false, false, true);
        this.session = sessionService.subscribe(this);
    }
    /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
    modal = createRef();

    /** @param {APITypes.GameScheduleItem | null} [data] @param {number} [id] */
    getPlayerDataFromId = (data, id) => (id != undefined && data?.player_one.id === id) ? data?.player_one : data?.player_two;
    /** @param {APITypes.GameScheduleItem | null} [data] */
    getPlayerDataSelf = (data) => data?.player_one.id === this.session.value?.user?.id ? data?.player_one : data?.player_two
    /** @param {APITypes.GameScheduleItem | null} [data] */
    getPlayerDataOther = (data) => data?.player_one.id !== this.session.value?.user?.id ? data?.player_one : data?.player_two
    /** @param {number} [id] */
    playerIsSelf = (id) => id === this.session.value?.user?.id
 
    renderSpinner = () => html`
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `

    // getBaseContent = () => html`
    
    // `

    /** @param {'launchSelf' | 'launchOther'} type @param {APITypes.GameScheduleItem | null} [gameData] */
    showWaitForLaunch = async (type, gameData) => {
        await this.updateComplete;
        await this.modal.value?.updateComplete;
        this.modal.value?.setContentAndShow({
        content: html`
            <div class="d-flex flex-column align-items-center">
                ${type === 'launchSelf' ? html`
                    <p>Connecting to the server...</p>    
                ` : html`
                    <div class="d-flex align-items-center">
                        <span class="me-2">Waiting for</span>
                        ${avatarInfo(this.getPlayerDataOther(gameData))}
                        <span class="ms-2">to Launch the Game</span>
                    </div>
                `}
                ${this.renderSpinner()}
            </div>
        `,
        // footer: html`
        //     <bs-button text="Close" ._async_handler=${(e)=> {
        //         this.waitForLaunchModal.value?.hideModal();
        //     }}></bs-button>
        // `
    })}
    /** @param {APITypes.GameScheduleItem | null} [gameData] */
    showWaitForStart = async (gameData) => {
        await this.updateComplete;
        await this.modal.value?.updateComplete;
        this.modal.value?.setContentAndShow({
        content: html`
            <div class="d-flex flex-column align-items-center">
                <div class="d-flex align-items-center">
                    <span class="me-2">Waiting for</span>
                    ${avatarInfo(this.getPlayerDataOther(gameData))}
                    <span class="ms-2">to start the Match</span>
                </div>
                ${this.renderSpinner()}
            </div>
        `,
        // footer: html`
        //     <bs-button text="Close" ._async_handler=${(e)=> {
        //         this.waitForStartModal.value?.hideModal();
        //     }}></bs-button>
        // `
    })}
    /**
     * @param {APITypes.GameScheduleItem | null} [gameData]
     * @param {boolean} [showTimer]
     * @param {() => void} [onStart]
     */
    showStartGame = async (gameData, showTimer=false, onStart) => {
        await this.updateComplete;
        await this.modal.value?.updateComplete;
        this.modal.value?.setContentAndShow({
        header: !showTimer ? undefined : html`
                    <span>Pong Match starts in: </span>
                    <timer-comp timeout="3" ></timer-comp>`,
        content: html`
            <div class="d-flex align-items-center justify-content-around">
                ${avatarInfo(gameData?.player_two)}
                <p class="m-0">VS</p>
                ${avatarInfo(gameData?.player_one)}
            </div>
        `,
        footer: html`
            <bs-button text="Start Game" ._async_handler=${(e)=> {
                this.modal.value?.hideModal();
                if (onStart) onStart();
            }}></bs-button>
        `
    })}
    /**
     * @param {(mode: 'local' | 'remote') => void} onSelect
     */
    showSelectGameMode = async (onSelect) => {
        await this.updateComplete;
        await this.modal.value?.updateComplete;
        this.modal.value?.setContentAndShow({
        header: html`
            <h3>Play Local or Remote</h3>
        `,
        content: html`
            <h4>How to play Local:</h4>
            <div class="d-flex justify-content-between">
                <div>
                    <h6>Left Side:</h6>
                    <p><kbd>q</kbd> move the paddle up</p>
                    <p><kbd>a</kbd> move the paddle down</p>
                </div>
                <div>
                    <h6>Right Side:</h6>
                    <p><kbd>↑</kbd> move the paddle up</p>
                    <p><kbd>↓</kbd> move the paddle down</p>
                </div>
            </div>
            <p>You can also use the Mouse or your finger to click on the paddles and drag them.</p>
        `,
        footer: html`
            <bs-button text="Play Local" ._async_handler=${(e)=> {
                this.modal.value?.hideModal();
                if (onSelect) onSelect('local');
            }}></bs-button>
            <bs-button text="Play Remote" ._async_handler=${(e)=> {
                this.modal.value?.hideModal();
                if (onSelect) onSelect('remote');
            }}></bs-button>
        `
    })}
    
    /**
     * @param {APITypes.GameScheduleItem | null} [gameData]
     * @param {number} [id]
     */
    showDisconnect = async (gameData, id) => {
        await this.updateComplete;
        await this.modal.value?.updateComplete;
        this.modal.value?.setContentAndShow({
        header: html`<span>Connection Lost</span>`,
        content: html`
            <div class="d-flex flex-row align-items-center justify-content-center">
                ${avatarInfo(this.getPlayerDataFromId(gameData, id))}
                ${this.playerIsSelf(id) ? 'You' : ''}
                <span>disconnected</span>
            </div>
            <div>
                ${this.playerIsSelf(id) ? 'attempting to reconnect' : 'waiting for Opponent...'}
                ${this.renderSpinner()}
            </div>
        `,
         footer: html`
         <bs-button text="Close" ._async_handler=${(e)=> {
             this.modal.value?.hideModal();
         }}></bs-button>
     `
    })}
   
    /**
     * @param {FromWorkerGameMessageTypes.GameEnd} [data]
     * @param {() => void} [onDoneCb]
     * @param {() => void} [onRematch]
     */
    showGameDone = async (data, onDoneCb, onRematch) => {
        // this.hide('all');
        await this.updateComplete;
        await this.modal.value?.updateComplete;
        const hasWon = data?.winner_id === this.session.value?.user?.id;
        const myPlayer = this.getPlayerDataSelf(data?.game_result);
        const myXp = hasWon ? data?.game_result?.result.winner_xp : data?.game_result?.result.loser_xp;
        this.modal.value?.setContentAndShow({
        header: html`
            <span>${hasWon ? 'You won the Match!' : 'You lost the Match'}</span>
        `,
        content: html`
            <div class="d-flex flex-column align-items-center justify-content-center">
                ${avatarInfo(myPlayer)}
                <p>XP: ${myXp}</p>
            </div>
        `,
        footer: html`
            <bs-button
            color="success"
            text="ask for a rematch"
            ._async_handler=${(e) => {
                this.modal.value?.hideModal();
                if (onRematch && typeof onRematch === 'function') onRematch();
            }}
            ></bs-button>
            <bs-button
            text="Close the Game"
            ._async_handler=${(e) => {
                if (onDoneCb && typeof onDoneCb === 'function') onDoneCb();
                this.modal.value?.hideModal();
            }}
            ></bs-button>
        `
    })}

    /** @param {'waitForLaunchModal' | 'waitForStartModal' | 'startGameModal' | 'disconnectModal' | 'gameDoneModal' | 'all'} type  */
    async hide(type) {
        await this.updateComplete;
        await this.modal.value?.updateComplete;

        if (type === 'all' || type === 'waitForLaunchModal') this.modal.value?.hideModal();
        if (type === 'all' || type === 'waitForStartModal') this.modal.value?.hideModal();
        if (type === 'all' || type === 'startGameModal') this.modal.value?.hideModal();
        if (type === 'all' || type === 'disconnectModal') this.modal.value?.hideModal();
        if (type === 'all' || type === 'gameDoneModal') this.modal.value?.hideModal();
    }

    render() {
        return html`
            <bs-modal fade ${ref(this.modal)} ></bs-modal>
        `
    }
}
customElements.define("pong-game-overlays", PongGameOverlays);
