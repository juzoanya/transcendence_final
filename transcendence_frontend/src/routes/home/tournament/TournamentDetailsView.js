/* eslint-disable max-classes-per-file */


import { actions, actionButtonDropdowns, actionButtonGroups } from '../../../components/ActionButtons.js';
import {
    renderListItem,
    renderListItem2,
    renderCard,
    renderCardInfo,
    renderListCard,
} from '../../../components/bootstrap/BsCard.js';
import { avatarInfo, avatarLink } from '../../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../../lib_templ/BaseElement.js';
import { fetcher, gameAPI, sessionService, userAPI } from '../../../services/api/API.js';
import router from '../../../services/router.js';
import { ToastNotificationErrorEvent } from '../../../components/bootstrap/BsToasts.js';
import { getMatchLink } from '../utils.js';
import { getMatchIcon, getTournamentIcon } from '../../../components/gameUtils.js';
import Router from '../../../lib_templ/router/Router.js';

export class TournamentDetailsView extends BaseElement {
    constructor() {
        super(false, false);
        this.sessionUser = sessionService.subscribe(this, true);
        this.tournamentData = undefined;
        this.refresher = sessionService.messageSocket?.subscribeTournament((v) => {
            console.log('i should refresh!: ', v);
            this.fetchTournamentData(this.tournamentData?.id ?? v);
        });
    }
    /** @type {APITypes.ApiResponse<APITypes.TournamentData> | undefined} */
    tournamentResponse;
    /** @type {APITypes.TournamentData | undefined} */
    tournamentData;
    routerParams = {};


    /**
     * @param {number} tournamentId 
     */
    fetchTournamentData(tournamentId) {
        console.log('fetch tournament data: ', tournamentId);
        this.tournamentDataPromise =  gameAPI.getTournamentDetails(tournamentId).then((res) => {
            this.tournamentResponse = res;
            console.log('response: ', this.tournamentResponse);
            if (!this.tournamentResponse.success) {
                document.dispatchEvent( new ToastNotificationErrorEvent(this.tournamentResponse.message) );
                Promise.reject();
            } else {
                this.tournamentData = this.tournamentResponse.data;
                console.log('tournament data: ', this.tournamentData);
                
                this.myTournamentGames = this.sessionUser.value?.game_schedule?.filter(i => i.tournament === this.tournamentData?.id) ?? []
                this.tournamentInvitation = this.sessionUser.value?.game_invitations_received?.find(i => i.tournament === this.tournamentData?.id);
                super.requestUpdate();
            }

        }).catch((error) => {
            sessionService.handleFetchError(error);
        })
    }

    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {symbol | void}
     */
    onBeforeMount(route, params, url) {
        console.log('tournament details view - params: ', params);
        if (!sessionService.isLoggedIn) {
            return router.redirect('/auth/login');
        }
        if (params.game !== "pong") {
            document.dispatchEvent( new ToastNotificationErrorEvent("unknown game") );
            return Router.show404;
        }
        const tournamentId = Number(params.tournament_id)
        if (params.tournament_id == undefined || isNaN(tournamentId)) {
            document.dispatchEvent( new ToastNotificationErrorEvent("Tournnament not found") );
            return Router.show404;
        }
        this.fetchTournamentData(tournamentId);
    }

    onRouteChange(route, params, url) {
        const tournamentId = Number(params.tournament_id)
        if (params.game !== "pong") {
            document.dispatchEvent( new ToastNotificationErrorEvent("unknown game") );
        } else if (params.tournament_id == undefined || isNaN(tournamentId)) {
            document.dispatchEvent( new ToastNotificationErrorEvent("Tournnament not found") );
        } else {
            this.fetchTournamentData(tournamentId);
        }
    }


    connectedCallback() {
        super.connectedCallback();
        this.myTournamentGames = this.sessionUser.value?.game_schedule?.filter(i => i.tournament === this.tournamentData?.id) ?? []
        this.tournamentInvitation = this.sessionUser.value?.game_invitations_received?.find(i => i.tournament === this.tournamentData?.id);
    }

    // <div class="col-auto">${renderCardInfo('Game', 'pong')}</div>
    // <div class="col-auto">${renderCardInfo('Mode', data.game_mode)}</div>
    /**
     * 
     * @param {string} title 
     * @param {string} titleIcon 
     * @param {APITypes.GameScheduleItem[]} [list] 
     * @returns 
     */
    // col-5  col-sm-2  col-md-2
    renderGameScheduleList = (title, titleIcon, list) => html`
        <div class="col-12">
            ${renderListCard(
                title,
                titleIcon,
                !list || list.length === 0 ?
                    renderListItem(html`<p class="text-center m-0">No data</p>`)
                :   list.map((data) =>
                        renderListItem2(html`
                            <div class="row align-items-center">
                                <div class="col-5 col-sm-4 py-2">
                                    ${avatarInfo(data.player_one)}
                                </div>
                                <div class="col-2 col-sm-1 py-2">
                                    ${renderCardInfo('VS', '')}
                                </div>
                                <div class="col-5 col-sm-4 py-2">
                                    ${avatarInfo(data.player_two)}
                                </div>
                                <div class="col-12 col-sm-auto py-2">
                                    <a href="${getMatchLink(data, {rand: false, tournament: this.tournamentData?.id})}" role="button" class="w-100 btn btn-outline-primary">
                                        <i class="fa-solid fa-gamepad"></i>
                                        start
                                    </a>
                                </div>
                            </div>
                           
                           
                        `),
                    ),
            )}
        </div>
    `
    /** @param {APITypes.PlayerData} player */
    playerIsSelf = (player) => player.id === this.sessionUser.value?.user?.id;

    isValidInvitation = () => this.tournamentInvitation != undefined && this.tournamentInvitation?.tournament === this.tournamentData?.id;
    
    getInvitationId = () => this.isValidInvitation() ? this.tournamentInvitation?.invite_id ?? null : null;

    /**
     * @param {APITypes.PlayerData} player
     * @param {number} index
     * @param {boolean} pending
     */
    renderPlayersListItem = (player, index, pending) => {
        
        // console.log('player: ', player.username);
        // console.log('pending: ', pending);
        // console.log('this.playerIsSelf(player): ', this.playerIsSelf(player));
        // console.log('this.isValidInvitation(): ', this.isValidInvitation());
        // console.log('this.getInvitationId(): ', this.getInvitationId());
        return renderListItem(html`
        <div class="d-flex justify-content-between align-items-center">
            <span class="d-inline-flex align-items-center">
                ${pending ? html`<span class="me-2"><i class="fs-4 fa-solid fa-fw fa-${player.status === 'pending' ? 'user-clock' : 'user-check'}"></i></span>`
                    : ''
                }
                
                ${avatarLink(player)}
                ${(!pending && index === 0) ? html`<i class="text-warning fa-solid fa-crown"></i>` : ''}
                ${this.playerIsSelf(player) ? html`<i class="text-success fa-solid fa-diamond"></i>` : ''}
            </span>
            <div>
                ${!pending ? html`<span class="lead">XP: ${player.xp}</span>` : this.playerIsSelf(player) && this.isValidInvitation() ? 
                    actionButtonGroups.receivedGameInvitation(this.getInvitationId()??-1, true) : '' }
            </div>
        </div>
    `)}

    renderPlayersList = () => {
        const pending = this.tournamentData?.status === "waiting";
        const running = this.tournamentData?.status === "in progress";
        const finished = this.tournamentData?.status === "finished";
        const title = pending ? 'waiting for players to accept' : 'Leaderboard';
        const icon = pending ? 'trophy' : '';
        const renderList = pending ? this.tournamentData?.players : this.tournamentData?.leaderboard;
        return renderListCard(title, icon, renderList?.map((p,i) => 
            this.renderPlayersListItem(p, i, pending)));
    }

    // ${this.tournamentData?.players.map((data, i) => html`
    //     <div class="list-group-item flex-shrink-1 d-flex">
    //         ${avatarLink(data)}
    //         ${data.status === 'pending' ? html`
    //             ${ ? 
    //                 : 'waiting ...'}
    //         ` : data.status === 'accepted' ? html`
    //                 ready
    //         ` : ''}
    //     </div>    
    // `)}

    getNumberOfRounds = () => {
        const n = this.tournamentData?.players.length;
        if (n && this.tournamentData?.mode === 'round robin') return n % 2 === 0 ? n - 1 : n;
        else if (n && this.tournamentData?.mode === 'single elimination') return Math.ceil(Math.log2(n));
        return (0);
    }

    /** @param {APITypes.GameScheduleItem} data */
    renderMatchBracket = (data) => {
        let badgeStyleOne = '', badgeStyleTwo = '';
        if (data.result != undefined) {
            // badgeStyleOne = this.playerIsWinner(data, data.player_one) ? 'badge text-bg-success px-2 py-1 rounded-2' : 'badge text-bg-danger px-2 py-1 rounded-2';
            // badgeStyleTwo = this.playerIsWinner(data, data.player_two) ? '   badge text-bg-success px-2 py-1 rounded-2' : 'badge text-bg-danger px-2 py-1 rounded-2';
            badgeStyleOne = this.playerIsWinner(data, data.player_one) ? 'badge text-bg-success rounded-2 d-inline' : 'badge text-bg-danger rounded-2 d-inline';
            badgeStyleTwo = this.playerIsWinner(data, data.player_two) ? 'badge text-bg-success rounded-2 d-inline' : 'badge text-bg-danger rounded-2 d-inline';
        }
        
        return html`
        
            <div class="card my-1 w-100 tournament-bracket">
                <ul class="list-group list-group-flush">
                    <li class="list-group-item d-inline-flex align-items-center justify-content-between">
                        ${avatarInfo(data.player_one, true)}
                        <span class="${ data.result ? badgeStyleOne : '' }">${data.result ? data.result.player_one_score : ''}</span>
                    </li>
                    <li class="list-group-item d-inline-flex align-items-center justify-content-between">
                        ${avatarInfo(data.player_two, true)}
                        <span class="${ data.result ? badgeStyleTwo : '' }">${data.result ? data.result.player_two_score : ''}</span>
                    </li>
                </ul>
            </div>
        `
    }

    renderMatches = () => {
        const rounds = this.getNumberOfRounds();
        console.log('schedules: ', this.tournamentData?.schedules);
        
        const isMobile = window.innerWidth <= 500;
        return renderCard(`Games: ${this.tournamentData?.mode} | ${this.tournamentData?.stage}`, '', html`
            <div class="container-fluid ">
                <div class="w-100 tournament-bracket-container">
                   
                        ${this.tournamentData?.mode === 'single elimination' ? Array.from({ length: rounds }, (_, index) => html`
                            <div class="flex-grow-1 d-flex flex-column justify-content-stretch align-items-center me-4">
                                <h6>Round ${index + 1}</h6>
                                <div class="flex-grow-1 w-100 d-flex flex-column justify-content-evenly align-items-center">
                                    ${this.tournamentData?.schedules?.filter(g => g.round === index + 1).map((data, i) => this.renderMatchBracket(data)) }
                                </div>
                            </div>
                        `) : html`
                            <div class="flex-grow-1 w-100 d-flex flex-column justify-content-evenly align-items-center">
                                    ${this.tournamentData?.schedules?.map((data, i) => this.renderMatchBracket(data))}
                                </div>
                        `}
                    
                </div>
            </div>
        `)
    }

    /**
     * @param {APITypes.GameScheduleItem} result 
     * @param {APITypes.PlayerData} player 
     * @returns 
     */
    playerIsWinner = (result, player) => (result.result && result.result.winner_id) === player.id;

    render() {
        
        // return html`
        //      <h3 class="display-3">${this.tournamentData?.name}</h3>
        //     <single-chat-view .user_or_tournament=${this.tournamentData} ></single-chat-view>
        // `
      
        
        // return html`
        //     ${this.tournamentData == undefined ? html`
        //         <div class="spinner-grow" style="width: 3rem; height: 3rem;" role="status">
        //             <span class="visually-hidden">Loading...</span>
        //         </div>` : html`

        return html`
        
                <div class="container-fluid opacity-transition ${this.tournamentData ? 'content-loaded' : ''}">
                    <h3 class="display-6">${ getTournamentIcon(this.tournamentData?.mode)}  ${this.tournamentData?.name} ${this.tournamentData?.status === 'waiting' ? ` | ${this.tournamentData?.mode}` : ''}</h3>
                    <div class="d-flex align-item-center m-2">
                        <div class="me-2">
                            <single-chat-view icon="paper-plane" text="tournament chat" .offcanvas=${true} .user_or_tournament=${this.tournamentData} ></single-chat-view>
                        </div>
                        <a href="/settings" role="button" class="btn btn-primary">
                            <i class="fa-solid fa-gear"></i>
                            change your alias
                        </a>
                    </div>
                    <div class="tournament-grid">
                        <div class="tournament-grid-item-a">
                            ${this.renderPlayersList()}
                        </div>
                        ${this.tournamentData?.status === 'waiting' ? '' : html`
                            ${(this.tournamentData?.status === 'finished' || this.myTournamentGames?.length === 0) ? '' : html`
                                <div class="tournament-grid-item-b">
                                    ${this.renderGameScheduleList("Your Games", "", this.myTournamentGames)}
                                </div>
                            `}
                            <div class="tournament-grid-item-c">
                                <div class="d-flex flex-column">
                                    ${this.renderMatches()}
                                </div>
                            </div>
                            
                            
                        `}
                    </div>
                </div>
        `}
        
    

}
customElements.define('tournament-details-view', TournamentDetailsView);

// import { actions, actionButtonDropdowns, actionButtonGroups } from '../../../components/ActionButtons.js';
// import {
//     rendListItem,
//     renderCard,
//     renderCardInfo,
//     renderListCard,
// } from '../../../components/bootstrap/BsCard.js';
// import { avatarInfo, avatarLink } from '../../../components/bootstrap/AvatarComponent.js';
// import { BaseElement, html } from '../../../lib_templ/BaseElement.js';
// import { fetcher, gameAPI, sessionService, userAPI } from '../../../services/api/API_new.js';
// import router from '../../../services/router.js';
// import { ToastNotificationErrorEvent } from '../../../components/bootstrap/BsToasts.js';

// export class TournamentDetailsView extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.sessionUser = sessionService.subscribe(this, true);
//     }
//     /** @type {APITypes.ApiResponse<APITypes.TournamentData> | undefined} */
//     tournamentResponse;
//     /** @type {APITypes.TournamentData | undefined} */
//     tournamentData;
//     routerParams = {};

//     /**
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      * @returns {Promise<symbol | void>}
//      */
//     async onBeforeMount(route, params, url) {
//         console.log('tournament details view - params: ', params);
//         if (!sessionService.isLoggedIn) {
//             return router.redirect('/');
//         }
//         if (params.game !== "pong") {
//             document.dispatchEvent( new ToastNotificationErrorEvent("unknown game") );
//             return router.redirect('/');
//         }
//         const tournamentId = Number(params.tournament_id)
//         if (params.tournament_id == undefined || isNaN(tournamentId)) {
//             document.dispatchEvent( new ToastNotificationErrorEvent("Tournnament not found") );
//             return router.redirect('/');
//         }
//         if ((await this.fetchTournamentData(tournamentId)) === false) {
//             return router.redirect('/');
//         }
//     }

//     async onRouteChange(route, params, url) {
//         const tournamentId = Number(params.tournament_id)
//         if (params.game !== "pong") {
//             document.dispatchEvent( new ToastNotificationErrorEvent("unknown game") );
//         } else if (params.tournament_id == undefined || isNaN(tournamentId)) {
//             document.dispatchEvent( new ToastNotificationErrorEvent("Tournnament not found") );
//         } else {
//             if ((await this.fetchTournamentData(tournamentId)) === true) {
//                 super.requestUpdate();
//             }
//         }
//     }

//     /**
//      * @param {number} tournamentId 
//      */
//     async fetchTournamentData(tournamentId) {
//         try {
//             console.log('fetch tournament data: ', tournamentId);
//             this.tournamentResponse = await gameAPI.getTournamentDetails(tournamentId);
//             console.log('response: ', this.tournamentResponse);
//             if (!this.tournamentResponse.success) {
//                 document.dispatchEvent( new ToastNotificationErrorEvent(this.tournamentResponse.message) );
//                 return false;
//             }
            
//             this.tournamentData = this.tournamentResponse.data;
//             return true;
//         } catch (error) {
//             sessionService.handleFetchError(error);
//             return false;
//         }
//     }

//     /**
//      * 
//      * @param {string} title 
//      * @param {string} titleIcon 
//      * @param {APITypes.GameScheduleItem[]} [list] 
//      * @returns 
//      */
//     renderGameScheduleList = (title, titleIcon, list) => html`
//         <div class="col-12">
//             ${renderListCard(
//                 title,
//                 titleIcon,
//                 !list || list.length === 0 ?
//                     rendListItem(html`<p class="text-center m-0">No data</p>`)
//                 :   list.map((data) =>
//                         rendListItem(html`
//                             <div class="col-5 col-sm-2 pe-0 col-md-2">
//                                 ${avatarInfo(data.player_one)}
//                             </div>
//                             <div class="col-2 col-sm-1">
//                                 ${renderCardInfo('VS', '')}
//                             </div>
//                             <div class="col-5  col-sm-2  ps-0 col-md-2">
//                                 ${avatarInfo(data.player_two)}
//                             </div>
                           
//                             <div class="col-auto">${renderCardInfo('Game', 'pong')}</div>
//                             <div class="col-auto">${renderCardInfo('Mode', '1v1')}</div>
//                             <div class="col-auto">
//                                 ${actions.pushRandomGameResult(data.schedule_id)}
//                             </div>
//                         `),
//                     ),
//             )}
//         </div>
//     `


//     render() {
//         const myTournamentGames = this.sessionUser.value?.game_schedule?.filter(i => i.tournament === this.tournamentData?.id) ?? []
//         return html`
//             <h1>${this.tournamentData?.name}</h1>
//             <div class="list-group">
//                 <h2>Players</h2>
//                 ${this.tournamentData?.players.map((data, i) => html`
//                     <div class="list-group-item flex-shrink-1">
//                         ${avatarLink(data)}
//                     </div>    
//                 `)}
//             </div>
//             ${this.renderGameScheduleList("Your Games", "", myTournamentGames)}
//             <div class="d-flex flex-column">
//                 <h2>${this.tournamentData?.mode} | ${this.tournamentData?.stage}</h2>
//                 ${this.tournamentData?.schedules?.map((data, i) => html`
//                     <div class="card" style="width: 18rem;">
//                         <ul class="list-group list-group-flush">
//                             <li class="list-group-item">${avatarInfo(data.player_one)}</li>
//                             <li class="list-group-item">${avatarInfo(data.player_two)}</li>
//                         </ul>
//                     </div>
                   
//                 `)}
//             </div>
//         `
//     }

// }
// customElements.define('tournament-details-view', TournamentDetailsView);
