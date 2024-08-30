import { actionButtonDropdowns } from '../../../components/ActionButtons.js';
import { avatarInfo, avatarLink } from '../../../components/bootstrap/AvatarComponent.js';
import { ToastNotificationErrorEvent } from '../../../components/bootstrap/BsToasts.js';
import { BaseElement, html, BaseBase, createRef, ref } from '../../../lib_templ/BaseElement.js';
import { sessionService } from '../../../services/api/API.js';
import router from '../../../services/router.js';
import { SelectedSearchResult } from '../../social/ProfileSearch.js';
import { ListGroup } from '../../../components/AnimL.js';
import { renderCard, renderCardInfo } from '../../../components/bootstrap/BsCard.js';
import { getTournamentLink } from '../utils.js';
import Router from '../../../lib_templ/router/Router.js';


export default class TournamentCreateView extends BaseElement {
    constructor() {
        super(false, false);
        /** @param {SelectedSearchResult} ev  */

        this.validnbr = false;
        this.onSelectedResult = (ev) => {
            console.log('new search res: ', ev);
            if (ev.selectedSearchResult) {
                this.selected.push(ev.selectedSearchResult);
                this.checkValidNbr();
            } else {
                console.error("NO SEARCH RESULT!!!");
            }
        };
        /** @type {APITypes.SearchResult[]} */
        this.selected = []
        this.gameId = "pong";
    }
    /** @type {APITypes.TournamentMode} */
    roundRobinMode = "round robin";
    roundRobinInptId = 'radio-round-robin';
    /** @type {APITypes.TournamentMode} */
    singleEliminationMode = "single elimination";
    singleEliminatioInptId = 'radio-single-elimination';

    /** @type {APITypes.TournamentMode} */
    tournamentMode = "round robin";

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("profile_search_selected_result", this.onSelectedResult);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("profile_search_selected_result", this.onSelectedResult);
    }

    onBeforeMount(route, params, url) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/auth/login');
        }
        if (params.game !== "pong") {
            document.dispatchEvent( new ToastNotificationErrorEvent(`Invalid Game ${params.game}`) );
            return Router.show404;
        }
        this.gameId = params.game;
    }

    checkValidNbr = () => {
        if (this.selected.length+1 <= 2)
            this.validnbr = false;
        else if (this.tournamentMode === this.singleEliminationMode && (this.selected.length+1) %2 !== 0)
            this.validnbr = false;
        else
            this.validnbr = true;
        super.requestUpdate();
    }

    /** @param {MouseEvent} e  */
    clickHandler(e) {
        if (e.target instanceof HTMLElement) {
            const item = e.target.closest('div[data-selected-user]');
            if (item && item instanceof HTMLElement && item.dataset.selectedUser) {
                this.selected.splice(Number(item.dataset.selectedUser), 1);
                this.checkValidNbr();
            }
        }
    }

    /** @param {SubmitEvent} e */
    async handleFormSubmit(e) {
        e.preventDefault();
        if (e.target instanceof HTMLFormElement) {
            const formData = new FormData(e.target);
            const players = this.selected.map(s => s.id);
            const mode = formData.get("tournament-mode")?.toString();
            const name = formData.get("tournament-name")?.toString();
            if (name == undefined || !(mode == this.roundRobinMode || mode == this.singleEliminationMode)) return;
            const d = await sessionService.createTournament(name, mode, players);
            if (d !== false) {
                router.go(getTournamentLink(undefined, d?.tournament_id));
            }
        }
    }

    renderTournamentDescription = () => html`
        <div>
            <div class="collapse" id="tournamentDescription">
                <div class="card card-body overflow-y-scroll" style="${"max-width: 25em; max-height: 12em;"}">
                ${this.tournamentMode === 'single elimination' ? html`
                    <h6 class="my-2 card-title">Single Elimination Tournament</h6>
                    <p>The Single Elimination tournament is a fast-paced, high-stakes format where only the strongest survive. Here's how it works:</p>
                    <ul>
                        <li><strong>Matchups:</strong> Players are paired up in matches, and the winner of each match advances to the next round.</li>
                        <li><strong>Elimination:</strong> The loser of each match is immediately eliminated from the tournament, while the winner moves on to the next round.</li>
                        <li><strong>Rounds:</strong> This process continues until only two players remain. These finalists compete in the championship match to determine the tournament winner.</li>
                        <li><strong>Finals:</strong> The last two players face off in a final match, and the winner of this match is crowned the champion of the tournament.</li>
                    </ul>
                    <p>Single Elimination is ideal for those who thrive under pressure and enjoy the thrill of do-or-die matches, where every game could be your last—or your ticket to victory.</p>
                    
                ` : html`
                    <h6 class="my-2 card-title">Round Robin Tournament</h6>
                    <p>In the Round Robin tournament, each player gets the chance to compete against every other participant. This format ensures that everyone has multiple opportunities to play and showcase their skills. Here's how it works:</p>
                    <ul>
                        <li><strong>Matchups:</strong> Each player faces off against every other player in the tournament at least once.</li>
                        <li><strong>Scoring:</strong> Players earn points for each match based on whether they win, lose, or draw.</li>
                        <li><strong>Rankings:</strong> After all matches have been played, the players are ranked based on their total points. The player with the most points at the end of the tournament is declared the winner.</li>
                        <li><strong>Tiebreakers:</strong> In case of a tie in points, additional criteria such as head-to-head results or point differential may be used to determine the final rankings.</li>
                    </ul>
                    <p>Round Robin is perfect for those who enjoy a more extensive competition, as it allows players to experience different opponents and strategies, making for a well-rounded tournament experience.</p>
                `}
                </div>
            </div>
        </div>
    `


    renderNameInput = () => html`
        <label id="tournamentname-label" for="tournamentname" class="form-label">Tournament Name</label>
        <input type="text" required name="tournament-name" class="form-control" id="tournamentname" aria-describedby="tournamentname-label">
        <div id="tournament-name-id" class="form-text">The name of the new Tournament</div>
     
    `



    /** @type {import('../../../lib_templ/BaseElement.js').Ref<HTMLInputElement>} */
    rrInptRef = createRef();
    /** @type {import('../../../lib_templ/BaseElement.js').Ref<HTMLInputElement>} */
    seInptRef = createRef();
    renderModeInput = () => html`
        <button
            type="button"
            role="button"
            class="btn btn-primary rounded-1 mb-2"
            data-bs-toggle="collapse"
            aria-expanded="false"
            data-bs-target="#tournamentDescription"
            aria-controls="tournamentDescription"
        >
            Show Mode Information
            <i class="fa-solid fa-fw fa-info"></i>
        </button>
        ${this.renderTournamentDescription()}
        <p class="form-label">Tournament Mode</p>
        <div class="d-flex flex-column flex-md-row justify-content-evenly align-items-center">
            <section>            
                <button
                    @click=${() => {
                        console.log('round robin clicked: round robin check?: ', this.rrInptRef.value?.checked);
                        console.log('round robin clicked: single elimination check?: ', this.seInptRef.value?.checked);
                        
                        if (this.rrInptRef.value && this.seInptRef.value) {
                            this.rrInptRef.value.checked = true;
                            this.seInptRef.value.checked = false;
                            this.tournamentMode = this.roundRobinMode;
                            this.checkValidNbr();
                            // super.requestUpdate();
                        }
                    }}
                    class="btn ${this.tournamentMode === 'round robin' ? 'active' : ''}"
                    data-bs-toggle="button"
                    style="${"width: 12em;"}"
                >
                    <img
                        class="rounded-5 object-fit-cover border border-white border-3"
                        alt="avatar"
                        src="/images/match_rr_2.webp"
                        width="100"
                        height="100"
                    />
                    <p class="lead m-0">Round Robin</p>
                    <input ${ref(this.rrInptRef)}
                        type="radio"
                        name="tournament-mode"
                        class="btn-check"
                        id="${this.roundRobinInptId}"
                        value="${this.roundRobinMode}"
                        autocomplete="off"
                        checked
                        style="${"display: none;"}"
                    >
                </button>
            </section>
            <section>
                <button
                    @click=${() => {
                        console.log('single elimination clicked: round robin check?: ', this.rrInptRef.value?.checked);
                        console.log('single elimination clicked: single elimination check?: ', this.seInptRef.value?.checked);
                        
                        if (this.seInptRef.value && this.rrInptRef.value) {
                            this.seInptRef.value.checked = true;
                            this.rrInptRef.value.checked = false;
                            this.tournamentMode = this.singleEliminationMode;
                            this.checkValidNbr();
                            // super.requestUpdate();
                        }
                    }}
                    class="btn ${this.tournamentMode === 'single elimination' ? 'active' : ''}"
                    data-bs-toggle="button"
                    style="${"width: 12em;"}"
                >
                    <img
                        class="rounded-3 object-fit-cover border border-white border-3"
                        alt="avatar"
                        src="/images/match_se_2.webp"
                        width="100"
                        height="100"
                    />
                    <p class="lead m-0">Single Elimination</p>
                </button>
                <input ${ref(this.seInptRef)}
                    type="radio"
                    name="tournament-mode"
                    class="btn-check"
                    id="${this.singleEliminatioInptId}"
                    value="${this.singleEliminationMode}"
                    autocomplete="off"
                    style="${"display: none;"}"
                >
            </section>
        </div>
    
    `

    renderCreateForm = () => renderCard('Tournament Settings', '', html`
        <form
            @submit=${this.handleFormSubmit.bind(this)}
            action=""
            class="needs-validation"
            >
                <div class="my-3">
                    ${this.renderModeInput()}
                </div>
                <div class="my-3">
                    ${this.renderNameInput()}
                </div>
                <div class="d-flex my-3">
                    <button ?disabled=${!this.validnbr} class="btn btn-success me-3" type="submit" >
                        create tournament
                    </button>
                    <a href="/" class="btn btn-outline-danger">
                        cancel
                    </a>
                </div>
            </form>
    `)

    renderPlayersListandSearch = () => renderCard('Selected Players', '', html`
        <p class="lead fs-1 mb-2 p-0 ${this.validnbr ? 'text-success' : 'text-danger'} " >Players: ${this.selected.length+1}</p>
        <div class="p-2 mb-2 d-flex align-items-center justify-content-start">
            ${avatarInfo(sessionService.session?.user)}
        </div>    
        <list-group
            animatelist
            .items=${this.selected},
            .rendercb=${/** @param {APITypes.BasicUserData} item */( item, i) =>
                html`
                    <div data-selected-user="${i}" class="p-2 d-flex align-items-center justify-content-between">
                        ${avatarLink(item)}
                        <bs-button @click=${this.clickHandler.bind(this)}
                            color="danger" icon="xmark" radius="rounded" small >
                        </bs-button>
                    </div>    
                `}
        ></list-group>
    `)

    render() {
        console.log('tournament selected: ', this.selected);
        
        return html`
            <div class="container-fluid mb-5" style="${"max-width: 1000px"}">
                <div class="d-flex mx-3 flex-column flex-md-row justify-content-stretch">
                    <h1 class="mb-3 me-3">Create a Tournament</h1>
                    <div class="flex-grow-1">
                        <profile-search .todiscard=${this.selected.map((it)=>it.id)} ></profile-search>
                    </div>
                </div>
                <div class="d-flex flex-column flex-md-row">
                    <div class="m-3 flex-grow-1">
                        ${this.renderPlayersListandSearch()}
                    </div>
                    <div class="m-3">
                        ${this.renderCreateForm()}
                    </div>
                </div>
                
            </div>
           
        `
    }

   
}

customElements.define("tournament-create-view", TournamentCreateView);


// <div ${/** @param {HTMLDivElement} el */(el)=>{this.selectedContainer = el; }}
// class="list-group w-100">
// ${this.selected.map((data, i) => html`
//     <div data-selected-user="${i}" class="list-group-item d-flex align-items-center justify-content-between">
//         ${avatarLink(data)}
//         <bs-button @click=${this.clickHandler.bind(this)}
//             color="danger" icon="xmark" radius="rounded" small >
//         </bs-button>
//     </div>    
// `)}




// </div>


// export default class TournamentCreateView extends BaseElement {
//     constructor() {
//         super(false, false);
//         /** @param {SelectedSearchResult} ev  */

//         this.validnbr = false;
//         this.onSelectedResult = (ev) => {
//             console.log('new search res: ', ev);
//             if (ev.selectedSearchResult) {
//                 this.selected.push(ev.selectedSearchResult);
//                 this.checkValidNbr();
//             } else {
//                 console.error("NO SEARCH RESULT!!!");
//             }
//         };
//         /** @type {APITypes.SearchResult[]} */
//         this.selected = []
//         this.gameId = "pong";
//     }
//     /** @type {APITypes.TournamentMode} */
//     roundRobinMode = "round robin";
//     /** @type {APITypes.TournamentMode} */
//     singleEliminationMode = "single elimination";

//     /** @type {APITypes.TournamentMode | undefined} */
//     tournamentMode;

//     connectedCallback() {
//         super.connectedCallback();
//         this.addEventListener("profile_search_selected_result", this.onSelectedResult);
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.removeEventListener("profile_search_selected_result", this.onSelectedResult);
//     }

//     onBeforeMount(route, params, url) {
//         if (params.game !== "pong") {
//             document.dispatchEvent( new ToastNotificationErrorEvent(`Invalid Game ${params.game}`) );
//             return router.redirect("/");
//         }
//         this.gameId = params.game;
//     }

//     checkValidNbr = (e) => {
//         let modeInptElem;
//         if (e && e instanceof InputEvent) {
//             modeInptElem = e.target;
//         } else {
//             modeInptElem = this.querySelector('input[name="tournament-mode"]:checked');
//         }
//         if (!(modeInptElem instanceof HTMLInputElement) || !(modeInptElem.value == "round robin" || modeInptElem.value == "single elimination"))
//             return;
//         this.tournamentMode = modeInptElem?.value
//         if (modeInptElem && modeInptElem instanceof HTMLInputElement) {
//             console.log('mode: ', modeInptElem.value);
//             if (this.selected.length+1 <= 2)
//                 this.validnbr = false;
//             else if (modeInptElem.value === this.singleEliminationMode && (this.selected.length+1) %2 !== 0)
//                 this.validnbr = false;
//             else
//                 this.validnbr = true;
//         }
//         super.requestUpdate();
//     }

//     createTournament = async () => {
//         const tNameInpt = this.querySelector('#tournamentname');
//         if (tNameInpt instanceof HTMLInputElement && this.tournamentMode != undefined) {
//             const tournamentName = tNameInpt.value;
//             const players = this.selected.map(s => s.id);
//             try {
//                 const d = await sessionService.createTournament(tournamentName, this.tournamentMode, players);
//                 console.log('create tournament data: ', d);
//                 if (d?.success) {
//                     router.go(`/games/${this.gameId}/tournament/${d.data.tournament_id}`)
//                 } else {
//                     console.log('error!?! create tournament');
//                 }
//             } catch (error) {
//                 sessionService.handleFetchError(error);
//             }
//         }
//     }

//     /** @param {MouseEvent} e  */
//     clickHandler(e) {
//         // console.log('target: ', e.target);
//         // if (e.target instanceof HTMLElement) {
//         //     const item = e.target.closest('div[data-selected-user]');
//         //     console.log('target doc: ', e.target.getRootNode());
//         //     console.log('item: ', item);
//         //     if (item && item instanceof HTMLElement && item.dataset.selectedUser) {
//         //         console.log('dataset value: ', Number(item.dataset.selectedUser));
//         //         console.log('selected users: ', this.selected);
//         //         this.selected.splice(Number(item.dataset.selectedUser), 1);
//         //         this.checkValidNbr();
//         //     }
//         // }
//         console.log('target: ', e.target);
//         if (e.target instanceof HTMLElement) {
//             const item = e.target.closest('div[data-selected-user]');
//             console.log('target doc: ', e.target.getRootNode());
//             console.log('item: ', item);
//             if (item && item instanceof HTMLElement && item.dataset.selectedUser) {
//                 console.log('dataset value: ', Number(item.dataset.selectedUser));
//                 console.log('selected users: ', this.selected);
//                 this.selected.splice(Number(item.dataset.selectedUser), 1);
//                 this.checkValidNbr();
//             }
//         }
//     }

//     /** @param {SubmitEvent} e */
//     async handleFormSubmit(e) {
//         e.preventDefault();
//         if (e.target instanceof HTMLFormElement) {
//             const formData = new FormData(e.target);
//             const players = this.selected.map(s => s.id);
//             const mode = formData.get("tournament-mode")?.toString();
//             const name = formData.get("tournament-name")?.toString();
//             if (name == undefined || !(mode == this.roundRobinMode || mode == this.singleEliminationMode)) return;
//             try {
//                 const d = await sessionService.createTournament(name, mode, players);
//                 console.log('create tournament data: ', d);
//                 if (d?.success) {
//                     router.go(`/games/${this.gameId}/tournament/${d.data.tournament_id}`)
//                 } else {
//                     console.log('error!?! create tournament');
//                 }
//             } catch (error) {
//                 sessionService.handleFetchError(error);
//             }
//             // if 
//             console.log(e);
//         }
//     }

//     renderTournamentDescription = () => html`
//       <div class="container mt-5">
//         <h1 class="text-center mb-4">Tournament Modes</h1>

//         <div class="row">
//             <div class="col-md-6">
                
//             </div>

//             <div class="col-md-6">
                
//             </div>
//         </div>
//     </div>

    
//     `

    
//     renderSEdescr = () => html`
//         <div class="card text-center bg-light-subtle">
//             <div class="card-header">
//                 <h6 class="my-2 card-title"> Single Elimination Tournament</h6>
//             </div>
//             <div class="card-body">
//                 <p>The Single Elimination tournament is a fast-paced, high-stakes format where only the strongest survive. Here’s how it works:</p>
//                 <ul>
//                     <li><strong>Matchups:</strong> Players are paired up in matches, and the winner of each match advances to the next round.</li>
//                     <li><strong>Elimination:</strong> The loser of each match is immediately eliminated from the tournament, while the winner moves on to the next round.</li>
//                     <li><strong>Rounds:</strong> This process continues until only two players remain. These finalists compete in the championship match to determine the tournament winner.</li>
//                     <li><strong>Finals:</strong> The last two players face off in a final match, and the winner of this match is crowned the champion of the tournament.</li>
//                 </ul>
//                 <p>Single Elimination is ideal for those who thrive under pressure and enjoy the thrill of do-or-die matches, where every game could be your last—or your ticket to victory.</p>
//             </div>
//         </div>
//     `

//     renderRRdescr = () => html`
//         <div class="card card text-center bg-light-subtle">
//             <div class="card-header">
//                 <h6 class="card-title my-2">Round Robin Tournament</h6>
//             </div>
//             <div class="card-body">
//                 <p>In the Round Robin tournament, each player gets the chance to compete against every other participant. This format ensures that everyone has multiple opportunities to play and showcase their skills. Here’s how it works:</p>
//                 <ul>
//                     <li><strong>Matchups:</strong> Each player faces off against every other player in the tournament at least once.</li>
//                     <li><strong>Scoring:</strong> Players earn points for each match based on whether they win, lose, or draw.</li>
//                     <li><strong>Rankings:</strong> After all matches have been played, the players are ranked based on their total points. The player with the most points at the end of the tournament is declared the winner.</li>
//                     <li><strong>Tiebreakers:</strong> In case of a tie in points, additional criteria such as head-to-head results or point differential may be used to determine the final rankings.</li>
//                 </ul>
//                 <p>Round Robin is perfect for those who enjoy a more extensive competition, as it allows players to experience different opponents and strategies, making for a well-rounded tournament experience.</p>
//             </div>
//         </div>
//     `

//     render() {
//         return html`
//             <div class="container mt-4">
//                 ${this.renderTournamentDescription()}
//                 <div class="row">
//                     <div class="col-12 col-sm-6 mt-2">
//                         <h1 class="mb-3">Create a Tournament</h1>
//                         <div class="mb-5">
//                             <profile-search .todiscard=${this.selected.map((it)=>it.id)} ></profile-search>
//                         </div>
//                         <form
//                             @submit=${this.handleFormSubmit.bind(this)}
//                             action=""
//                             class="needs-validation"
//                         >
//                             <div class="mb-3">
//                                 <label id="tournamentname-label" for="tournamentname" class="form-label">Tournament Name</label>
//                                 <input type="text" required name="tournament-name" class="form-control" id="tournamentname" aria-describedby="tournamentname-label">
//                                 <div id="emailHelp" class="form-text">The name of the new Tournament</div>
//                             </div>
                        
//                             <div class="d-flex justify-content-between my-3" >
//                                 <section class="me-3 my-3 w-100 text-start">
//                                     <input @click=${() => {this.checkValidNbr()}}
//                                             type="radio"
//                                             name="tournament-mode"
//                                             class="btn-check"
//                                             id="btn-round-robin"
//                                             value="${this.roundRobinMode}"
//                                             autocomplete="off">
//                                     <label class="btn btn-outline-dark" for="btn-round-robin">Round Robin</label>
//                                 </section>
//                                 <section class="ms-3 my-3 w-100 text-end">
//                                     <input @click=${() => {this.checkValidNbr()}}
//                                             type="radio" name="tournament-mode"
//                                             class="btn-check"
//                                             id="btn-single-elemination"
//                                             value="${this.singleEliminationMode}"
//                                             checked autocomplete="off">
//                                     <label class="btn btn-outline-dark" for="btn-single-elemination">Single elimination</label>
//                                 </section>
//                             </div>
                            
                            
//                             <div class="d-flex">
//                                 <button ?disabled=${!this.validnbr} class="btn btn-success me-3" type="submit">create tournament</button>
//                                 <a href="/" class="btn btn-outline-danger">
//                                     cancel
//                                 </a>
//                             </div>
//                         </form>
//                     </div>

//                     <div class="col-12 col-sm-6 mt-2 text-end">
                    
//                     <p class="lead fs-1 mb-2 p-0 ${this.validnbr ? 'text-success' : 'text-danger'} " >Players: ${this.selected.length+1}</p>
//                         <list-group
//                                 animatelist
//                                 .items=${this.selected},
//                                 .rendercb=${/** @param {APITypes.BasicUserData} item */( item, i) =>
//                                     html`
//                                         <div data-selected-user="${i}" class="p-2 d-flex align-items-center justify-content-between">
//                                             ${avatarLink(item)}
//                                             <bs-button @click=${this.clickHandler.bind(this)}
//                                                 color="danger" icon="xmark" radius="rounded" small >
//                                             </bs-button>
//                                         </div>    
//                                     `}
//                         ></list-group>
//                     </div>
//                 </div>
                
    
                   
//             </div>
//             <div class="row">
//             ${this.tournamentMode === 'round robin' ? this.renderRRdescr() : this.renderSEdescr()}
//             </div>
//         `
//     }

   
// }

// customElements.define("tournament-create-view", TournamentCreateView);


// // <div ${/** @param {HTMLDivElement} el */(el)=>{this.selectedContainer = el; }}
// // class="list-group w-100">
// // ${this.selected.map((data, i) => html`
// //     <div data-selected-user="${i}" class="list-group-item d-flex align-items-center justify-content-between">
// //         ${avatarLink(data)}
// //         <bs-button @click=${this.clickHandler.bind(this)}
// //             color="danger" icon="xmark" radius="rounded" small >
// //         </bs-button>
// //     </div>    
// // `)}




// // </div>