import { BaseElement, html, ifDefined } from '../../lib_templ/BaseElement.js';
import { renderListCard, renderListItem, renderCardInfo, renderListItemAnchor, renderListItemInfos, renderTableCard, renderTablelikeCard } from '../../components/bootstrap/BsCard.js';

import { actions, actionButtonGroups } from '../../components/ActionButtons.js';
import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';

import { sessionService } from '../../services/api/API.js';
import { get1vs1MatchImg, getMatchIcon, getRRMatchImg, getSEMatchImg, getStatusBadge, getTournamentIcon, renderInlineMatch } from '../../components/gameUtils.js';

import { Tooltip } from 'bootstrap';
import { getTournamentLink } from './utils.js';
import router from '../../services/router.js';

export default class GameWindow extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
    }

    async init() {
        await sessionService.updateData(['game_invitations_received', 'game_invitations_sent', 'game_schedule', 'tournaments']);
        super.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();
        this.init();
    }

    onBeforeMount() {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/auth/login')
        }
    }

    // /** @param {APITypes.GameInvitationItem} data @param {boolean} received */
    // renderInvitationItem = (data, received) => renderListItem(html`
    //         <div class="col-6 col-sm-4 text-center">
    //             ${avatarLink(data)}
    //         </div>
    //         <div class="col-3 col-sm-2 text-center">
    //             ${renderCardInfo('Game', data.game_id)}
    //         </div>
    //         ${data.game_mode === 'tournament' ? html`
    //             <div class="col-3 col-sm-2 text-center">
    //                 ${renderCardInfo('', data.game_mode)}
    //             </div>
    //         ` : ''}
    //         <div class="col-3 col-sm-2 text-center">
    //             ${renderCardInfo('Mode', data.game_mode)}
    //         </div>
    //         <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
    //             <div class="row">
    //                 ${received ? html`
    //                     <div class="col-6 col-sm-auto">
    //                         ${actions.acceptGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
    //                     </div>
    //                     <div class="col-6 col-sm-auto">
    //                         ${actions.rejectGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
    //                     </div>
    //                 ` : html`
    //                     ${actions.cancelGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
    //                 `}
    //             </div>
    //         </div>
    // `)

    /** @param {APITypes.GameInvitationItem} data @param {boolean} received */
    renderInvitationItem = (data, received) => {
        const tdata = this.sessionUser.value?.tournaments?.find(t => t.id === data.tournament);        
        return renderListItem(html`
            <div class="col-6 col-sm-4 text-start">
                ${avatarLink(data)}
            </div>
            <div class="col-3 col-sm-2 text-center">
                ${renderCardInfo('Mode', data.game_mode === '1vs1' ? html`<span><i class="fa-solid fa-hand-fist me-2"></i>${data.game_mode}</span>`
                : html`<span >T  <i class="fa-solid fa-skull-crossbones me-2"></i></span>`)}
            </div>
            ${tdata ? html`
                <div class="col-3 col-sm-2 text-center">
                    ${renderCardInfo('Name', html`<a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="${ifDefined(`/games/${tdata.game_id.toLowerCase()}/tournament/${tdata.id}`)}" >${tdata?.name}</a>`)}
                </div>
            ` : ''}

         
            <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
                <div class="row">
                    ${received ? html`
                        <div class="col-6 col-sm-auto">
                            ${actions.acceptGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                        </div>
                        <div class="col-6 col-sm-auto">
                            ${actions.rejectGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                        </div>
                    ` : html`
                        ${actions.cancelGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                    `}
                </div>
            </div>
    `)}




  /** @param {APITypes.GameInvitationItem} data @param {boolean} received */
    renderInvitationItem = (data, received) => {
        const tdata = this.sessionUser.value?.tournaments?.find(t => t.id === data.tournament);        
        return renderListItem(html`
            <div class="col-6 col-sm-4 text-start">
                ${avatarLink(data)}
            </div>
            <div class="col-3 col-sm-2 text-center">
                ${renderCardInfo('Mode', data.game_mode === '1vs1' ? html`<span><i class="fa-solid fa-hand-fist me-2"></i>${data.game_mode}</span>`
                : html`<span >T  <i class="fa-solid fa-skull-crossbones me-2"></i></span>`)}
            </div>
            ${tdata ? html`
                <div class="col-3 col-sm-2 text-center">
                    ${renderCardInfo('Name', html`<a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="${ifDefined(`/games/${tdata.game_id.toLowerCase()}/tournament/${tdata.id}`)}" >${tdata?.name}</a>`)}
                </div>
            ` : ''}

         
            <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
                <div class="row">
                    ${received ? html`
                        <div class="col-6 col-sm-auto">
                            ${actions.acceptGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                        </div>
                        <div class="col-6 col-sm-auto">
                            ${actions.rejectGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                        </div>
                    ` : html`
                        ${actions.cancelGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                    `}
                </div>
            </div>
    `)}

// renderTablelikeCard(`Invitations ${type}`, 'trophy', invitationList, [
//     {
//         heading: type === 'received' ? 'Inviter' : 'Invitee',
//         col: 'col-6 col-sm-4 text-start text-truncate py-2',
//         cb: (n, v) => avatarLink(v, true)
//     },
//     {
//         heading: '',
//         col: 'col-6 col-sm-2 col-md-2 text-start align-middle py-2',
//         cb: (n, v) => getMatchIconByTournamentId(v.tournament)
//     },
//     {
//         heading: '',
//         col: 'col-6 col-sm-2 col-md-2 text-start py-2',
//         cb: (n, v) => html`
//             <div class="row">

//             </div>
//             ${type === 'received' ? html`
//                 <div class="col-6 col-sm-auto">
//                     ${actions.acceptGameInvitation(v.invite_id, { host: this, showText: false, stretch: true })}
//                 </div>
//                 <div class="col-6 col-sm-auto">
//                     ${actions.rejectGameInvitation(v.invite_id, { host: this, showText: false, stretch: true })}
//                 </div>
//             ` : html`
//                 ${actions.cancelGameInvitation(v.invite_id, { host: this, showText: false, stretch: true })}
//             `}
//         `
//     },
// ])

   /** @param {'received' | 'sent'} type @param {APITypes.GameInvitationItem[]} [invitationList] */
   renderInvitationList = (type, invitationList) => renderListCard( `Invitations ${type}`, 'scroll',
    !invitationList || invitationList.length === 0 ?
        renderListItem(html`<p class="text-center m-0">No Invitations ${type}</p>`)
    :   invitationList.map((data) => this.renderInvitationItem(data, type === 'received'))
)

    /** @param {'received' | 'sent'} type @param {APITypes.GameInvitationItem[]} [invitationList] */
    renderInvitationList2 = (type, invitationList) => renderListCard( `Invitations ${type}`, 'scroll',
        !invitationList || invitationList.length === 0 ?
            renderListItem(html`<p class="text-center m-0">No Invitations ${type}</p>`)
        :   invitationList.map((data) => this.renderInvitationItem(data, type === 'received'))
    )

    renderRunningTournaments2 = () => {
        // console.log('hallo: ',this.sessionUser);
        // console.log('hallo: ',this.sessionUser.value);
        // console.log('hallo: ',this.sessionUser.value?.tournaments);
        // return "";
        
        return  renderListCard( 'Tournaments', 'trophy',
        !this.sessionUser.value?.tournaments?.length ?
            renderListItem(html`<p class="text-center m-0">You are not in any Tournaments</p>`)
        :   this.sessionUser.value.tournaments.map((tournament) => renderListItemAnchor(
                `/games/${tournament.game_id.toLowerCase()}/tournament/${tournament.id}`,
                html`
                    <div class="row">
                        <div class="col" >${renderCardInfo('Name', tournament.name)}</div>
                        <div class="col" >${renderCardInfo('Game', tournament.game_id)}</div>
                        <div class="col" >${renderCardInfo('Status', tournament.status)}</div>
                    </div>
            `))
    )}

    renderRunningTournaments = () => {
        return  renderTablelikeCard('Tournaments', 'trophy', this.sessionUser.value?.tournaments, [
            {
                heading: 'Mode',
                col: 'col text-start align-middle py-1',
                cb: (n, v) => getTournamentIcon(v.mode)
            },
            {
                heading: 'Name',
                col: 'col text-start align-middle py-1',
                cb: (n, v) => html`
                    <a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                        href="${getTournamentLink(undefined, v.id)}"
                    >
                        ${v.name}
                    </a>
                `
            },
            {
                heading: 'Status',
                col: 'col text-start align-middle py-1',
                cb: (n, v) => getStatusBadge(v.status)
            },
        ])
    }


    /** @param {APITypes.GameScheduleItem[]} gameSchedule */
    renderGameMatches = (gameSchedule) => {
        return  renderTablelikeCard('Matches', 'trophy', gameSchedule, [
            {
                heading: 'Left Side',
                col: 'col-6 col-sm-4 text-start text-truncate py-2',
                cb: (n, v) => avatarLink(v.player_one, true)
            },
            {
                heading: 'Right Side',
                col: 'col-6 col-sm-4  text-start text-truncate py-2',
                cb: (n, v) => avatarLink(v.player_two, true)
            },
            {
                heading: '',
                col: 'col-6 col-sm-2 col-md-2 text-start align-middle py-2',
                cb: (n, v) => getMatchIcon(v)
            },
            {
                heading: '',
                col: 'col-6 col-sm-2 col-md-2 text-start py-2',
                cb: (n, v) => html`
                    <a href="/games/pong/play/${v.schedule_id}" role="button" class="w-100 btn btn-outline-primary">
                        <i class="fa-solid fa-gamepad"></i>
                        start
                    </a>
                `
            },
        ])
    }
        

    /** @param {APITypes.GameScheduleItem[]} gameSchedule */
    renderGameMatches2 = (gameSchedule) => {
        const tdata = this.sessionUser.value?.tournaments?.find(t => t.id === gameSchedule.tournament);
        console.log('tdata: ', tdata);
        
        return renderListCard( 'New Matches', 'gamepad',
        !gameSchedule || gameSchedule.length === 0 ?
            renderListItem(html`<p class="text-center m-0">No Invitations received</p>`)
        :   gameSchedule.map((data) => html`
                <li class="list-group-item p-0">
                    <div class="row py-2 justify-content-between align-items-center bg-light-subtle">

                        <div class="col-12 col-sm-7">
                            ${renderInlineMatch(data)}
                        </div>
                        <div class="col-3 col-sm-2 text-center">
                            ${renderCardInfo('Mode', data.game_mode === '1vs1' ? html`<span><i class="fa-solid fa-hand-fist me-2"></i>${data.game_mode}</span>`
                            : html`<span >T  <i class="fa-solid fa-skull-crossbones me-2"></i></span>`)}
                        </div>
                        ${tdata ? html`
                            <div class="col-3 col-sm-2 text-center">
                                ${renderCardInfo('Name', html`<a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="${ifDefined(`/games/${tdata.game_id.toLowerCase()}/tournament/${tdata.id}`)}" >${tdata?.name}</a>`)}
                            </div>
                        ` : ''}
                        <div class="col-3 col-sm-2">${renderCardInfo('Mode', data.game_mode)}</div>
                        <div class="col-9 col-sm-3 text-end mt-2 mt-sm-0">
                            
                            <a href="/games/pong/play/${data.schedule_id}" role="button" class="btn btn-outline-primary">
                                <i class="fa-solid fa-gamepad"></i>
                                start Match
                            </a>
                        </div>
                    </div>
                </li>
                `
            ),
        )}
        
    
    // updated() {
    //     const elem = document.getElementById('testtooltip');
    //     let tooltip = Tooltip.getInstance('#testtooltip');

    //     console.log('elem: ', elem);
    //     console.log('tooltip: ', tooltip);
        
    //     tooltip = Tooltip.getOrCreateInstance('#testtooltip');
        
    //     console.log('tooltip2: ', tooltip);

    // }

    render() {
        return html`
            <div class="p-3">
                <a class="btn btn-primary mb-4 w-100" href="/games/pong/tournament/create" role="button">
                    <i class="fa-solid fa-gamepad"></i>
                    Create a Tournament
                </a>
                <a class="btn btn-primary mb-4 w-100" href="/games/pong/info" role="button">
                    <i class="fa-solid fa-gamepad"></i>
                    Pong Info Page
                </a>
                <div class="startpage-grid">
                    <div class="startpage-grid-item-a">
                        ${this.renderRunningTournaments()}
                    </div>
                    <div class="startpage-grid-item-b">
                           ${this.renderInvitationList('received', this.sessionUser.value?.game_invitations_received)}
                    </div>
                    <div class="startpage-grid-item-c">
                        ${this.renderInvitationList('sent', this.sessionUser.value?.game_invitations_sent)}
                    </div>
                    
                    <div class="startpage-grid-item-d">
                        ${this.renderGameMatches(this.sessionUser.value?.game_schedule)}
                    </div>
                </div>
                
            </div>
        `;
       
    }
}
customElements.define('game-window', GameWindow);

// ${actions.pushRandomGameResult(data.schedule_id, {host: this})}

// <!-- <a href="/games/pong/play/${data.schedule_id}" role="button" class="btn btn-outline-primary">
// <i class="fa-solid fa-gamepad"></i>
// start Match
// </a> -->

// export default class GameWindow extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);
//     }

//     /** @type {APITypes.GameInvitationItem[]} */
//     userInvitations = [
//         {
//             invite_id: 1,
//             id: 6,
//             avatar: 'https://picsum.photos/200/300?random=1',
//             username: 'peterjo',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 7,
//             avatar: 'https://picsum.photos/200/300?random=2',
//             username: 'dedr werber',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 8,
//             avatar: 'https://picsum.photos/200/300?random=3',
//             username: 'hayloo',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 9,
//             avatar: 'https://picsum.photos/200/300?random=4',
//             username: 'dewdw',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 2,
//             avatar: 'https://picsum.photos/200/300?random=5',
//             username: 'petdewh5erjo',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 1,
//             avatar: 'https://picsum.photos/200/300?random=6',
//             username: 'giorghinho',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 10,
//             avatar: 'https://picsum.photos/200/300?random=7',
//             username: 'marmelade',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 34,
//             avatar: 'https://picsum.photos/200/300?random=8',
//             username: 'xoxoxP',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: true,
//         },
//     ];

//     render() {
//         /** @type {APITypes.UserData | undefined} */
//         const userData = this.sessionUser.value?.user;
//         const gameInvitationsReceived = this.userInvitations;
//         const gameInvitationsSent = this.sessionUser.value?.game_invitations_sent;
//         const gameSchedule = this.sessionUser.value?.game_schedule;
//         console.log('render GAME window, invitations sent: ', gameInvitationsSent);

//         return html`
//             <div class="mt-3 container-fluid text-center">
//                 <div class="row g-3 pb-3">
//                     <div class="col-12">
//                         ${renderListCard(
//                             'Invitations Received',
//                             'scroll',
//                             !gameInvitationsReceived || gameInvitationsReceived.length === 0 ?
//                                 rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
//                             :   gameInvitationsReceived.map((data) =>
//                                     rendListItem(html`
//                                         <div class="col-6 col-sm-4 text-center">
//                                             ${avatarLink(data)}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Game', data.game_id === 0 ? 'pong' : 'other')}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Mode', data.game_mode)}
//                                         </div>
//                                         <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
//                                             <div class="row">
//                                                 <div class="col-6 col-sm-auto">
//                                                     ${actions.acceptGameInvitation(data.invite_id, { showText: false, stretch: true })}
//                                                 </div>
//                                                 <div class="col-6 col-sm-auto">
//                                                     ${actions.rejectGameInvitation(data.invite_id, { showText: false, stretch: true })}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     `),
//                                 ),
//                         )}
//                     </div>
//                     <div class="col-12">
//                         ${renderListCard(
//                             'Invitations Sent',
//                             'scroll',
//                             !gameInvitationsSent || gameInvitationsSent.length === 0 ?
//                                 rendListItem(html`<p class="text-center m-0">No Invitations sent</p>`)
//                             :   gameInvitationsSent.map((data) =>
//                                     rendListItem(html`
//                                         <div class="col-6 col-sm-4 text-center">
//                                             ${avatarLink(data)}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Game', data.game_id === 0 ? 'pong' : 'other')}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Mode', data.game_mode)}
//                                         </div>
//                                         <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
//                                             <div class="row">
//                                                 <div class="col-12 col-sm-auto">
//                                                     ${actions.cancelGameInvitation(data.invite_id, { showText: false, stretch: true })}
//                                                 </div>
                                               
//                                             </div>
//                                         </div>
//                                     `),
//                                 ),
//                         )}
//                     </div>
//                     <div class="col-12">
//                         ${renderListCard(
//                             'New Matches',
//                             'gamepad',
//                             !gameSchedule || gameSchedule.length === 0 ?
//                                 rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
//                             :   gameSchedule.map((data) =>
//                                     rendListItem(html`
//                                         <div class="col-12 col-md-6  text-sm-start d-flex justify-content-center align-items-center">
//                                             ${avatarLink(data.player_one)}
//                                             ${renderCardInfo('VS', '')}
//                                             ${avatarLink(data.player_two)}
//                                         </div>
//                                         <div class="col-3 col-md-2">${renderCardInfo('Game', 'pong')}</div>
//                                         <div class="col-3 col-md-2">${renderCardInfo('Mode', '1v1')}</div>
//                                         <div class="col-6 col-sm-auto text-end mt-2 mt-sm-0">
//                                             <button
//                                                 type="button"
//                                                 class="btn btn-outline-primary"
//                                                 data-bs-toggle="modal"
//                                                 data-bs-target="#gameModal-id"
//                                                 @click=${() => {
//                                                     this.selectedGame = data;
//                                                     super.requestUpdate();
//                                                 }}
//                                             >
//                                                 <i class="fa-solid fa-gamepad"></i>
//                                                 start Match
//                                             </button>
//                                         </div>
//                                     `),
//                                 ),
//                         )}
//                     </div>
//                 </div>
//                 <game-modaln id="gameModal" .game_data=${this.selectedGame}></game-modaln>
//             </div>
//         `;
//     }
// }
// customElements.define('game-window', GameWindow);
