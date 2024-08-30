/* eslint-disable max-classes-per-file */

import { actions, actionButtonDropdowns, actionButtonGroups } from '../../components/ActionButtons.js';
import {
    renderListItem,
    renderCard,
    renderCardInfo,
    renderListCard,
    renderListCardScroll,
} from '../../components/bootstrap/BsCard.js';
import { avatarLink, getUserStatus } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, createRef, html, ifDefined, ref } from '../../lib_templ/BaseElement.js';
import { fetcher, gameAPI, sessionService, userAPI } from '../../services/api/API.js';
import router from '../../services/router.js';
import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
import { humanizedDate } from '../../components/utils.js';
import { detailedTimeAgo } from '../../services/api/GlobalSockHandler.js';
import { formatDateString } from '../social/SingleChatView.js';
import { renderMatchWinner, renderScoreMode } from '../../components/gameUtils.js';
import Router from '../../lib_templ/router/Router.js';


    // /**
    //  * @param {number} [userId] 
    //  * @param {boolean} [shouldRerender] 
    //  */
    // async fetchProfileData(userId, shouldRerender) {
    //     try {
    //         if (userId == undefined) return;
    //         console.log('fetch deb1');
    //         this.profileResponse = await userAPI.getProfile(userId);
    //         if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
    //             document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
    //             return false;
    //         }
    //         console.log('fetch deb2');
    //         this.profileUserData = this.profileResponse.data;
    //         const gameHistoryResponse = await gameAPI.getHistory(this.profileUserData.username)
    //         if (!gameHistoryResponse.success) {
    //             document.dispatchEvent( new ToastNotificationErrorEvent(gameHistoryResponse.message) );
    //             return false;
    //         }
    //         this.profileUserGameResults = gameHistoryResponse.data;
    //         console.log('fetch deb3');
    //         this.profileUserData = this.profileResponse.data;
    //         this.profileUserId = userId;
    //         const statsRes = await gameAPI.getStats();
    //         if (!statsRes.success || typeof statsRes.data !== "string") {
    //             document.dispatchEvent( new ToastNotificationErrorEvent(statsRes.message) );
    //             return false;
    //         }
    //         this.imageData = statsRes.data;
    //         // console.log('fetch deb4');
    //         // this.gameStatImage = new Image();
    //         // this.gameStatImage.src = 'data:image/png;base64, ' + statsRes.data;
    //         // console.log(this.gameStatImage);


    //         // super.requestUpdate();
    //         // this.statsImageWrapperRef.value?.append(this.gameStatImage);
            
            
    //         if (shouldRerender) super.requestUpdate();
    //         return true;
    //     } catch (error) {
    //         sessionService.handleFetchError(error);
    //         return false;
    //     }
    // }

    // /**
    //  * @param {number} [userId] 
    //  * @param {boolean} [shouldRerender] 
    //  */
    // fetchProfileData(userId, shouldRerender) {
    //     try {
    //         if (userId == undefined) return;
    //         console.log('fetch deb1');
    //         this.getProfilePromise = userAPI.getProfile(userId).then((value) => {
    //             this.profileResponse = value;
    //             if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
    //                 document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
    //                 Promise.reject()
    //                 router.redirect("/")
    //                 // history.back();
    //             } else {
    //                 this.profileUserData = this.profileResponse.data;
    //                 this.profileUserId = userId;
                    
    //                 super.requestUpdate();
    //                 console.log('fetch deb2');
    //                 this.getProfileHistoryPromise = gameAPI.getHistory(this.profileUserData.username).then((historyRes) => {
    //                     if (!historyRes.success) {
    //                         document.dispatchEvent( new ToastNotificationErrorEvent(historyRes.message) );
    //                         Promise.reject()
    //                     } else {
    //                         this.profileUserGameResults = historyRes.data;
    //                         super.requestUpdate();
    //                         console.log('fetch deb3');
    //                         this.fetchProfileStats();
    //                     }
                        
    //                 })
    //             }
    //         })
    //         // console.log('fetch deb4');
    //         // this.gameStatImage = new Image();
    //         // this.gameStatImage.src = 'data:image/png;base64, ' + statsRes.data;
    //         // console.log(this.gameStatImage);


    //         // super.requestUpdate();
    //         // this.statsImageWrapperRef.value?.append(this.gameStatImage);
            
            
    //         if (shouldRerender) super.requestUpdate();
    //         return true;
    //     } catch (error) {
    //         sessionService.handleFetchError(error);
    //         return false;
    //     }
    // }

    // /**
    //  * @param {{pk: string | undefined}} a
    //  * @param {boolean} shouldRerender
    //  */
    // async handleUrlParams({pk}, shouldRerender) {
    //     // this.routerParams = params;
    //     const sessionUserId = this.sessionUser.value?.user?.id;

    //     const user_id = Number(pk)
    //     if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
    //         this.profileUserData = this.sessionUser.value?.user;
    //         this.profileUserGameResults = this.sessionUser.value?.game_results;
    //         if (shouldRerender) super.requestUpdate();
    //         return true;
    //     } else if (pk == undefined || isNaN(user_id)) {
    //         document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
    //         return false;
    //     } else {
    //         await this.fetchProfileData(user_id, shouldRerender);
    //         return true;
    //     }
    // }
    // /**
    //  * @param {{pk: string | undefined}} a
    //  * @param {boolean} shouldRerender
    //  */
    // handleUrlParams({pk}, shouldRerender) {
    //     // this.routerParams = params;
    //     const sessionUserId = this.sessionUser.value?.user?.id;

    //     const user_id = Number(pk)
    //     if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
    //         this.profileUserData = this.sessionUser.value?.user;
    //         this.profileUserGameResults = this.sessionUser.value?.game_results;
    //         this.fetchProfileStats();
    //         if (shouldRerender) super.requestUpdate();
    //         return true;
    //     } else if (pk == undefined || isNaN(user_id)) {
    //         document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
    //         return false;
    //     } else {
    //         this.fetchProfileData(user_id, shouldRerender);
    //         console.log('after handleUrlParams');
            
    //         return true;
    //     }
    // }
    // /**
    //  * @param {string} route
    //  * @param {object} params
    //  * @param {URL} url
    //  * @returns {symbol | void}
    //  */
    // onBeforeMount(route, params, url) {
    //     // console.log("onBeforeMount");
    //     if (!sessionService.isLoggedIn) {
    //         return router.redirect('/');
    //     }
    //     // const success = await this.handleUrlParams(params, true);
    //     const success = this.handleUrlParams(params, true);
    //     if (!success) return router.redirect("/");
    // }

    // onRouteChange(route, params, url) {
    //     // console.log("onRouteChange, params: ", params);
    //     this.handleUrlParams(params, false);
        
    //     super.requestUpdate();
    // }

/**
 * @param {number} userId
 */
export const getGameInviteAction = (userId) => {

}

export class ProfileView extends BaseElement {
    constructor() {
        super(false, false);
        this.sessionUser = sessionService.subscribe(this, true);
    }

    /** @type {APITypes.ApiResponse<APITypes.UserData> | undefined} */
    profileResponse;
    /** @type {APITypes.UserData | undefined} */
    profileUserData;
    /** @type {APITypes.GameScheduleItem[] | undefined} */
    profileUserGameResults
    /** @type {number | undefined} */
    profileUserId;

    /** @type {{message: string, userId: number | null} | null} */
    blockedData = null;





    // /**
    //  * @param {number} [userId] 
    //  * @param {boolean} [shouldRerender] 
    //  */
    // async fetchProfileData(userId, shouldRerender) {
    //     this.blockedData = null;
    //     if (userId == undefined) return;
    //     console.log('fetch deb1');
    //     this.profileUserData = sessionService.cachedProfileData.get(userId);
    //     if (this.profileUserData) {
    //         this.allLoaded = true;
    //         super.requestUpdate();
    //     }
    //     const result = await sessionService.fetchAndNotifyOnUnsuccess(
    //         userAPI.getProfile(userId), (errorCode, message) => {
    //         console.log('fetch error code: ', errorCode);
            
    //         if (errorCode == 403) {
    //             if (this.sessionUser.value?.user?.blocked.find(u => u.id === userId) != undefined) {
    //                 this.blockedData = {message, userId};
    //             } else {
    //                 this.blockedData = {message, userId:null};
    //             }
    //         } else {
    //             // router.redirect('history.back');
    //             router.redirect('/');
    //             throw new Error(message);
    //         }
    //     })

    //     if (result != false) {
    //         this.profileUserData = result;
    //     }

    //     console.log('after fetch: userdata', this.profileUserData);
    //     console.log('after fetch: blockeddata', this.blockedData);
        
    //     if (this.profileUserData) {
    //         sessionService.cachedProfileData.set(userId, this.profileUserData);
    //         const data = await sessionService.fetchAndNotifyOnUnsuccess(
    //             gameAPI.getHistory(this.profileUserData.username)
    //         );
    //         if (data) {
    //             this.profileUserGameResults = data.history;
    //         }
    //         console.log('after fetch');
    //     }
        
    //     this.allLoaded = true;
    //     super.requestUpdate();
    // }

    async handleFetchSelf() {
        this.isSelf = true;
        this.profileUserData = this.sessionUser.value?.user;
        this.allLoaded = true;
        super.requestUpdate();
        const data = sessionService.fetchShort(gameAPI.getStats());
        await sessionService.updateData(['user']);
        await this.updateComplete;
        if (this.statsImageWrapperRef.value instanceof HTMLImageElement) {
            if (data && this.statsImageWrapperRef.value instanceof HTMLImageElement) {
                this.imageData = data;
                this.statsImageWrapperRef.value.src = `data:image/png;base64, ${data}`;
            }
        }
        super.requestUpdate();
    }


    async handleFetchOther(userId) {
        this.blockedData = null;
        if (userId == undefined) return;
        console.log('fetch deb1');
        this.profileUserData = sessionService.cachedProfileData.get(userId);
        if (this.profileUserData) {
            this.allLoaded = true;
            super.requestUpdate();
        }
        this.profileUserData = await sessionService.fetchAndNotifyOnUnsuccess(
            userAPI.getProfile(userId), (errorCode, message) => {
            console.log('fetch error code: ', errorCode);
            
            if (errorCode == 403) {
                if (this.sessionUser.value?.user?.blocked.find(u => u.id === userId) != undefined) {
                    this.blockedData = {message, userId};
                } else {
                    this.blockedData = {message, userId:null};
                }
            } else {
                // router.redirect('history.back');
                router.redirect('/');
                throw new Error(message);
            }
        }) || undefined;
        super.requestUpdate();
    }

    /**
     * @param {{pk: string | undefined, searchParams: URLSearchParams | undefined}} a
     * @param {boolean} shouldRerender
     */
    handleUrlParams({pk, searchParams}, shouldRerender) {
        // this.routerParams = params;
        const sessionUserId = this.sessionUser.value?.user?.id;

        if (searchParams instanceof URLSearchParams) {
            this.searchParams = searchParams;
            this.searchParams?.forEach((v, k) => {
                console.log('key: ', k, ': ', v);
                
            })
        }

        const user_id = Number(pk)
        if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
            this.handleFetchSelf();
            // this.isSelf = true;
            // this.profileUserData = this.sessionUser.value?.user;
            // this.profileUserGameResults = this.sessionUser.value?.game_results;
            // sessionService.fetchAndNotifyOnUnsuccess(gameAPI.getStats()).then(async (data) => {
            //     await sessionService.updateData(['user']);
            //     await this.updateComplete;
            //     if (this.statsImageWrapperRef.value instanceof HTMLImageElement) {
            //         if (data) this.imageData = data;
            //         this.statsImageWrapperRef.value.src = `data:image/png;base64, ${data}`;
            //     }
            //     this.allLoaded = true;
            //     super.requestUpdate();
            // });
            // this.allLoaded = true;
            // super.requestUpdate();
            // return true;
        } else if (pk == undefined || isNaN(user_id)) {
            return Router.show404;
            // document.dispatchEvent( new ToastNotificationErrorEvent("User not found") );
            // return false;
        } else {
            this.handleFetchOther(user_id);
            // this.fetchProfileData(user_id, shouldRerender);
            // this.fetchProfileData(user_id, shouldRerender);
            console.log('after handleUrlParams');
            
            return true;
        }
    }
    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {symbol | void}
     */
    onBeforeMount(route, params, url) {
        // console.log("onBeforeMount");
        this.params = params;
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        // const success = await this.handleUrlParams(params, true);
        // if (!this.handleUrlParams(params, true)) {
        //     return router.redirect("/");
        // }
        return this.handleUrlParams(params, true)
    }

    onRouteChange(route, params, url) {
        // console.log("onRouteChange, params: ", params);
        // this.handleUrlParams(params, false);
        const res = this.handleUrlParams(params, true);
        if (res != true) {
            return res;
        }
        
        super.requestUpdate();
    }

    onBeforeUnMount() {
        // console.log('onBeforeUnMount: profilePromise: ', this.getProfilePromise);
        // console.log('onBeforeUnMount: profileHistoryPromise: ', this.getProfileHistoryPromise);
        // console.log('onBeforeUnMount: profileStatsPromise: ', this.getProfileStatsPromise);
        
    }

    /** @param {*} type  */
    async updateSessionuserDataAndRerender(type) {

    }

    renderActionButtons() {
        
    }

    /**
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral | string}
     */
    getActionButtons = () => {
        // console.log(userData);
        if (this.profileUserData == undefined) return "";
        if (this.profileUserData.is_self)
            return html`
                <a
                    href="/settings"
                    class="btn btn-primary px-4 p-2 mx-2"
                >
                    <i class="fa-solid fa-pen-to-square pe-2"></i>
                    Edit Profile
                </a>
                <a href="/auth/logout" class="btn btn-danger px-4 p-2 mx-2">
                    <i class="fa-solid fa-right-from-bracket pe-2"></i>
                    Logout
                </a>
            `;
        let data;
        // console.log('profile view: userdata: ', userData);
        console.log('rerender Profile, friendrequests all: ', this.sessionUser.value?.friend_requests_received);
        console.log('rerender Profile, friendrequests of user: ', sessionService.getReceivedFriendRequest(this.profileUserData.id));
        
        if ((data = sessionService.getFriend(this.profileUserData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-check"></i>
                </button>
                ${sessionService.canSend1vs1GameInvitation(this.profileUserData.id) === false ? '' :
                        actions.sendGameInvitation(this.profileUserData.id, { host: this, showText: false })}
                <a class="btn btn-primary" role="button"
                    href="/social/chat/${encodeURI(sessionService.messageSocket?.getChatRoomForUser(this.profileUserData.username) ?? '')}" >
                    <i class="fa-solid fa-paper-plane"></i>
                </a>
                ${actionButtonDropdowns.friendActions(this.profileUserData.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
            `;
        if ((data = sessionService.getReceivedFriendRequest(this.profileUserData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                ${actionButtonGroups.receivedFriendInvitation(data.request_id, true)}
                ${actionButtonDropdowns.userActions(data.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
            `;
        if ((data = sessionService.getSentFriendRequest(this.profileUserData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                ${actions.cancelFriendRequest(data.request_id)}
                ${actionButtonDropdowns.userActions(this.profileUserData.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
            `;
        return html`
            ${actions.sendFriendRequest(this.profileUserData.id)}
            ${actionButtonDropdowns.userActions(this.profileUserData.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
        `;
    };

    renderProfileHeader = () => html`
        <div class="profile-grid-item-header card p-4 bg-light-subtle ">
            <div class="card-body p-0">
                <div class="profile-header-body" >
                    <div class="d-flex flex-column align-items-center justify-content-between">
                        <avatar-component
                            status=${getUserStatus(this.profileUserData, this.profileUserData?.is_self ? false : true)}
                            statusborder
                            radius="5"
                            src="${this.profileUserData?.avatar ?? ""}"
                            size="150"
                        ></avatar-component>
                        <div class="mt-3 d-flex flex-column align-items-center">
                            <h6 class="text-body-secondary"> @${this.profileUserData?.username ?? ""} </h6>
                            <small class="text-body-secondary"
                                >${this.profileUserData?.first_name ?? ""}
                                ${this.profileUserData?.last_name ?? ""}
                            </small>
                        </div>
                    </div>
                    <div class="profile-header-text ms-3">
                        <h3 class="display-5 m-0"> ${this.profileUserData?.alias ?? ""} </h3>
                        <p class="lead mb-3 fs-6 text-wrap" style="${"white-space: pre-wrap"}">
                            ${this.profileUserData?.bio ?? ''}
                        </p>
                        <div class="h-100 d-flex flex-row align-items-end justify-content-center" >
                            ${this.getActionButtons()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

   

    /** @param {APITypes.GameScheduleItem} data */
    renderGameHistoryItem = (data) => {
        if (!data.result) return;
        const winnerProfile = data.result.player_one_score > data.result.player_two_score ? data.player_one : data.player_two;
        const profileUserIsWinner = winnerProfile.id === this.profileUserData?.id;
        return html`
            <div class="w-100 row align-items-center justify-content-evenly py-2"
            >
            <div class="d-flex justify-content-end">
                <small class="fw-light">${formatDateString(data.result.time_finished)}</small>
            </div>
                <!-- <div class="col-1">
                    VS
                </div> -->
                <div class="col">
                    ${renderScoreMode(data, this.profileUserData?.id)}
                </div>
                <div class="col">
                    ${ avatarLink(data.player_one.id === this.profileUserData?.id ? data.player_two : data.player_one, true) }
                </div>
                <div class="col">
                    ${renderMatchWinner(data, this.profileUserData?.id)}
                </div>
            </div>
            `
    }

    // /** @param {APITypes.GameScheduleItem} data */
    // renderGameHistoryItem = (data) => {
    //     if (!data.result) return;
    //     const winnerProfile = data.result.player_one_score > data.result.player_two_score ? data.player_one : data.player_two;
    //     const profileUserIsWinner = winnerProfile.id === this.profileUserData?.id;
    //     return html`
    //         <div class="w-100  px-2 row align-items-center justify-content-between border-start border-4
    //                 ${ profileUserIsWinner ? 'border-success-subtle' : 'border-danger-subtle'}"
    //         >
    //         <div class="d-flex justify-content-end">
    //             <small class="fw-light">${formatDateString(data.result.time_finished)}</small>
    //         </div>
    //             <div class="col">
    //                 ${ avatarLink(data.player_one.id === this.profileUserData?.id ? data.player_two : data.player_one, true) }
    //             </div>
    //             <div class="col">
    //                 ${ renderCardInfo('Winner', html`<span class="badge text-bg-secondary">${data.result.winner}</span>`) }
    //             </div>
    //             <div class="col">
    //                 ${ renderCardInfo('Score', `${data.result.player_one_score} : ${data.result.player_two_score}` ) }
    //             </div>
    //         </div>
    //         `
    // }
            // <div class="col">
            //     ${ renderCardInfo( 'Date',  formatDateString(data.result.time_finished)) }
            // </div>

    renderGameHistory = () =>  html`
        
    `


    renderBlockedPage = () => {
        // console.log('render blocked page: self: ', this.selfBlocked);
        // console.log('render blocked page: other: ', this.otherBlocked);
        console.log('renderblockedpage');
        
        if (!this.blockedData) return;
        return html`
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">${this.blockedData.userId ? 'You blocked this user' : 'You are blocked by this user'}</h4>
            <hr />
            <div class="alert-body">
                <p>
                    ${this.blockedData.message}
                </p>
                ${this.blockedData.userId ? html`
                    <p>
                        Click to unblock:
                        ${actions.unBlockUser(this.blockedData.userId, { cb: () => { this.fetchProfileData(this.blockedData?.userId??0, true); } })}
                    </p>
                ` : ''}
            </div>
        </div>
    `}

    profileUserIsSelf = () => this.profileUserData?.id != undefined && this.profileUserData?.id === this.sessionUser.value?.user?.id;
 

    
    statsImageWrapperRef = createRef();
    render() {
        console.log('render profile, bockeddata: ', this.blockedData);
        // console.log('render profile page: self: ', this.selfBlocked);
        // console.log('render profile page: other: ', this.otherBlocked);
        console.log('this.profileUserData?.wins ?? "-"" ', this.profileUserData?.wins ?? '-');
        console.log('this.profileUserData?.wins: ', this.profileUserData?.wins);
        console.log('this.profileUserData?.games_played: ', this.profileUserData?.games_played);
        console.log('this.profileUserData?.losses: ', this.profileUserData?.losses);
        
        return html`
            <div class="opacity-transition ${this.allLoaded ? 'content-loaded' : ''}">
                ${this.blockedData ? this.renderBlockedPage() : html`
                <div class="p-3 container-fluid profile-grid">
                    ${this.renderProfileHeader()}
                    <div class="profile-grid-item-a">
                        ${renderCard('', '', renderCardInfo('Rank',  this.profileUserData?.rank ?? '-' ) )}
                    </div>
                    <div class="profile-grid-item-b">
                        ${renderCard('', '', renderCardInfo('XP',  this.profileUserData?.xp ?? '-' ) )}
                    </div>
                    <div class="profile-grid-item-c">
                        ${renderCard( '', '', renderCardInfo('Member since', humanizedDate(this.profileUserData?.date_joined) ) )}
                    </div>
                    <div class="profile-grid-item-d">
                        ${renderCard( 'Game Stats', 'chart-simple', html`
                            <div class="d-flex justify-content-evenly">
                                <div class="border-bottom border-3 border-success-subtle" >
                                    ${renderCardInfo( 'Wins', `${this.profileUserData?.wins ?? '-'}` )}
                                </div>
                                <div class="border-bottom border-3">
                                    ${renderCardInfo( 'Total', `${this.profileUserData?.games_played ?? '-'}` )}
                                </div>
                                <div class="border-bottom border-3 border-danger-subtle" >
                                    ${renderCardInfo( 'Losses', `${this.profileUserData?.losses ?? '-'}`, )}
                                </div>
                            </div>
                        `)}
                    </div>
                    
                        <div style="${this.profileUserIsSelf() ? 'display:block;' : 'display:none;'}" class="profile-grid-item-e card text-center bg-light-subtle">
                            <div class="card-body">
                                <img ${ref(this.statsImageWrapperRef)} style="${"filter: invert(70%); max-width: 100%; max-heigh: 100%"}" src="" >
                            </div>
                        </div>
                    
                    <div class="profile-grid-item-f">
                        <pageinated-list-card
                            onlyarrows
                            header
                            title="Match History"
                            icon="user"
                            .page=${this.searchParams?.get('page')??1}
                            .fetchdatacb=${async (page) => {
                                if (typeof page !== 'number' || page < 0 || !this.profileUserData) return;
                                const data = await sessionService.fetchAndNotifyOnUnsuccess(gameAPI.getHistory(this.profileUserData.username, page));
                                console.log('FETCH HISTORY: data: ', data);
                                if (data) {
                                    return [data.max_pages, data.history];
                                }
                            }}
                            .rendercb=${this.renderGameHistoryItem.bind(this)}
                        >
                        </pageinated-list-card>
                        
                    </div>
                </div>
                `}
            </div>
        `;



// .page=${this.searchParams?.get('page')??1}

// ${renderListCardScroll( 'Match History', 'scroll',
//     this.profileUserGameResults?.map( data => renderListItem(this.renderGameHistoryItem(data)) ),
// )}


//<div class="profile-grid-item-f overflow-scroll " style="${"max-height: 100vh"}">
//                        ${renderListCard( 'Match History', 'scroll',
//                            this.profileUserGameResults?.map( data => renderListItem(this.renderGameHistoryItem(data)) ),
//                        )}
//                    </div>


        // return html`
        //     <div class="w-100">
        //         ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
        //         ${this.renderProfileHeader()}
        //         <div class="mt-3 container-fluid text-center">
        //             <div class="row">
        //                 <div class="col-12 col-md-6 mt-3 f-flex flex-column">
        //                     <div class="row g-3">
        //                         ${this.renderFundamentalStats()}
        //                     </div>
        //                     <div class="row g-3">
        //                         ${this.renderGameHistory()}
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //         `}
        //     </div>
        // `;
    }
}
customElements.define('profile-view', ProfileView);

// import { actions, actionButtonDropdowns, actionButtonGroups } from '../../components/ActionButtons.js';
// import {
//     rendListItem,
//     renderCard,
//     renderCardInfo,
//     renderListCard,
// } from '../../components/bootstrap/BsCard.js';
// import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
// import { BaseElement, html } from '../../lib_templ/BaseElement.js';
// import { fetcher, gameAPI, sessionService, userAPI } from '../../services/api/API_new.js';
// import router from '../../services/router.js';
// import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
// import { humanizedDate } from '../../components/utils.js';

// export class ProfileView extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.sessionUser = sessionService.subscribe(this, true);
//     }
//     /** @type {APITypes.ApiResponse<APITypes.UserData> | undefined} */
//     profileResponse;
//     /** @type {APITypes.UserData | undefined} */
//     profileUserData;
//     /** @type {APITypes.GameResultItem[] | undefined} */
//     profileUserGameResults
//     /** @type {number | undefined} */
//     profileUserId;


//     /**
//      * @param {number} userId 
//      * @param {boolean} shouldRerender 
//      */
//     async fetchProfileData(userId, shouldRerender) {
//         try {
//             this.profileResponse = await userAPI.getProfile(userId);
//             if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
//                 document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
//                 return false;
//             }
//             this.profileUserData = this.profileResponse.data;
//             const gameHistoryResponse = await gameAPI.getHistory(this.profileUserData.username)
//             if (!gameHistoryResponse.success) {
//                 document.dispatchEvent( new ToastNotificationErrorEvent(gameHistoryResponse.message) );
//                 return false;
//             }
//             this.profileUserGameResults = gameHistoryResponse.data;
//             this.profileUserId = userId;
//             if (shouldRerender) super.requestUpdate();
//             return true;
//         } catch (error) {
//             sessionService.handleFetchError(error);
//             return false;
//         }
//     }

//     /**
//      * @param {{pk: string | undefined}} a
//      * @param {boolean} shouldRerender
//      */
//     async handleUrlParams({pk}, shouldRerender) {
//         // this.routerParams = params;
//         const sessionUserId = this.sessionUser.value?.user?.id;

//         const user_id = Number(pk)
//         if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
//             this.profileUserData = this.sessionUser.value?.user;
//             this.profileUserGameResults = this.sessionUser.value?.game_results;
//             if (shouldRerender) super.requestUpdate();
//             return true;
//         } else if (pk == undefined || isNaN(user_id)) {
//             document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
//             return false;
//         } else {
//             await this.fetchProfileData(user_id, shouldRerender);
//             return true;
//         }
//     }
//     /**
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      * @returns {Promise<symbol | void>}
//      */
//     async onBeforeMount(route, params, url) {
//         // console.log("onBeforeMount");
//         if (!sessionService.isLoggedIn) {
//             return router.redirect('/');
//         }
//         const success = await this.handleUrlParams(params, true);
//         if (!success) return router.redirect("/");
//     }

//     async onRouteChange(route, params, url) {
//         // console.log("onRouteChange, params: ", params);
//         await this.handleUrlParams(params, false);
        
//         super.requestUpdate();
//     }

//     /**
//      * @param {APITypes.UserData | undefined} userData
//      * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral | string}
//      */
//     getActionButtons = (userData) => {
//         // console.log(userData);
//         if (!userData) return "";
//         if (userData.is_self)
//             return html`
//                 <a
//                     href="/profile/settings"
//                     class="btn btn-outline-primary px-4 p-2 m-2 rounded-4"
//                 >
//                     <i class="fa-solid fa-pen-to-square pe-2"></i>Edit Profile
//                 </a>
//                 <a href="/logout" class="btn btn-danger px-4 p-2 m-2 rounded-4">
//                     <i class="fa-solid fa-right-from-bracket pe-2"></i>Logout
//                 </a>
//             `;
//         let data;
//         // console.log('profile view: userdata: ', userData);
//         if ((data = sessionService.getFriend(userData.id)) !== undefined)
//             return html`
//                 <button disabled class="btn btn-dark me-1">
//                     <i class="fa-solid fa-user-check"></i>
//                 </button>
//                 ${actionButtonDropdowns.friendActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
//             `;
//         if ((data = sessionService.getReceivedFriendRequest(userData.id)) !== undefined)
//             return html`
//                 <button disabled class="btn btn-dark me-1">
//                     <i class="fa-solid fa-user-clock"></i>
//                 </button>
//                 ${actionButtonGroups.receivedFriendInvitation(data.request_id, true)}
//                 ${actionButtonDropdowns.userActions(data.id, () => { this.fetchProfileData(userData.id, true); })}
//             `;
//         if ((data = sessionService.getSentFriendRequest(userData.id)) !== undefined)
//             return html`
//                 <button disabled class="btn btn-dark me-1">
//                     <i class="fa-solid fa-user-clock"></i>
//                 </button>
//                 ${actions.cancelFriendRequest(data.request_id)}
//                 ${actionButtonDropdowns.userActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
//             `;
//         return html`
//             ${actions.sendFriendRequest(userData.id)}
//             ${actionButtonDropdowns.userActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
//         `;
//     };

//     renderProfileHeader = () => html`
//         <div class="py-4 bg-light-subtle border-0 rounded-0">
//             <div class="card-body">
//                 <div class="row">
//                     <div class="col-12 col-md-3  d-flex justify-content-center  align-items-center" >
//                         <avatar-component
//                             status="online"
//                             statusborder
//                             radius="5"
//                             src="${this.profileUserData?.avatar ?? ""}"
//                             size="150"
//                         ></avatar-component>
//                     </div>
//                     <div class="col text-center text-md-start mt-3 mt-md-0">
//                         <div class="position-relative">
//                             <div class="mb-2">
//                                 <h6 class="text-body-secondary">
//                                     @${this.profileUserData?.username ?? ""}
//                                 </h6>
//                                 <h3 class="display-5 m-0">
//                                     ${this.profileUserData?.alias ?? ""}
//                                 </h3>
//                                 <small class="text-body-secondary"
//                                     >${this.profileUserData?.first_name ?? ""}
//                                     ${this.profileUserData?.last_name ?? ""}
//                                 </small>
//                             </div>
//                             <p class="lead mb-3 fs-6 text-wrap">
//                                 This is a lead paragraph. It stands out from regular
//                                 paragraphs. This is a lead paragraph. It stands out from
//                                 regular paragraphs. This is a lead paragraph. It stands
//                                 out from regular paragraphs. This is a lead paragraph. It
//                                 stands out from regular paragraphs.
//                             </p>
//                         </div>
//                     </div>
//                     <div class="col-12 ">
//                         <div class="h-100 d-flex flex-row align-items-center justify-content-center" >
//                             ${this.getActionButtons(this.profileUserData)}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     `

//     renderFundamentalStats = () => html`
//         <div class="col-4">
//             ${renderCard('', '', renderCardInfo('Rank',  this.profileUserData?.ranking ?? '-' ) )}
//         </div>
//         <div class="col-8">
//             ${renderCard( '', '', renderCardInfo('Member since', humanizedDate(this.profileUserData?.date_joined) ) )}
//         </div>
//         <div class="col-12">
//             ${renderCard( 'Game Stats', 'chart-simple', html`
//                 <div class="row gx-4">
//                     <div class="col-4 border-bottom border-3 border-success-subtle" >
//                         ${renderCardInfo( 'Wins', this.profileUserData?.wins ?? '-' )}
//                     </div>
//                     <div class="col-4 border-bottom border-3">
//                         ${renderCardInfo( 'Total', this.profileUserData?.games_played ?? '-' )}
//                     </div>
//                     <div class="col-4 border-bottom border-3 border-danger-subtle" >
//                         ${renderCardInfo( 'Losses', this.profileUserData?.losses ?? '-', )}
//                     </div>
//                 </div>
//             `)}
//         </div>
//     `

//     /** @param {APITypes.GameResultItem} data */
//     renderGameHistoryItem = (data) => {
//         const winnerProfile = data.player_one_score > data.player_two_score ? data.player_one : data.player_two;
//         const profileUserIsWinner = winnerProfile.id === this.profileUserData?.id;
//         return html`
//         <div class="d-flex w-100 px-2 align-items-center justify-content-between border-start border-4
//                 ${ profileUserIsWinner ? 'border-success-subtle' : 'border-danger-subtle'}"
//             >
//                 ${ avatarLink(data.player_one.id === this.profileUserData?.id ? data.player_two : data.player_one) }
//                 ${ renderCardInfo('Score', `${data.player_one_score} : ${data.player_two_score}` ) }
//                 ${ renderCardInfo( 'Date',  new Date(data.date).toLocaleDateString( 'de-DE', { dateStyle: 'short' } ) ) }
//             </div>
//         `
//     }

//     renderGameHistory = () =>  html`
//         <div class="col-12 pb-3">
//             ${renderListCard( 'Match History', 'scroll',
//                 this.profileUserGameResults?.map( data => rendListItem(this.renderGameHistoryItem(data)) ),
//             )}
//         </div>
//     `


//     renderBlockedPage = () => html`
//         <div class="alert alert-danger" role="alert">
//             <h4 class="alert-heading">${this.profileResponse?.message ?? ""}</h4>
//             <hr />
//             ${!this.profileUserId ? '' :
//                 actions.unBlockUser(this.profileUserId, { cb: () => { this.fetchProfileData(this.profileUserId??0, true); } })
//             }
//         </div>
//     `

//     render() {
//         return html`
//             <div class="w-100">
//                 ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
//                 ${this.renderProfileHeader()}
//                 <div class="mt-3 profile-grid">
//                     <div class="">
//                         <div class="">
//                             <div class="">
//                                 ${this.renderFundamentalStats()}
//                             </div>
//                             <div class="">
//                                 ${this.renderGameHistory()}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 `}
//             </div>
//         `;
//         // return html`
//         //     <div class="w-100">
//         //         ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
//         //         ${this.renderProfileHeader()}
//         //         <div class="mt-3 container-fluid text-center">
//         //             <div class="row">
//         //                 <div class="col-12 col-md-6 mt-3 f-flex flex-column">
//         //                     <div class="row g-3">
//         //                         ${this.renderFundamentalStats()}
//         //                     </div>
//         //                     <div class="row g-3">
//         //                         ${this.renderGameHistory()}
//         //                     </div>
//         //                 </div>
//         //             </div>
//         //         </div>
//         //         `}
//         //     </div>
//         // `;
//     }
// }
// customElements.define('profile-view', ProfileView);
