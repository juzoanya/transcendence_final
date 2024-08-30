import { Fetcher } from './api_helper.js';
import PubSub from '../../lib_templ/reactivity/PubSub.js';
import { ToastNotificationErrorEvent, ToastNotificationSuccessEvent } from '../../components/bootstrap/BsToasts.js';
import BaseBase from '../../lib_templ/BaseBase.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { GlobalSockHandler } from './GlobalSockHandler.js';
import router from '../router.js';

// export const fetcher = new Fetcher("http://127.0.0.1", {

// api endpoint at path /api
// export const fetcher = new Fetcher(window.location.origin + "/api", {
// export const fetcher = new Fetcher(window.location.origin + "/api", {
//     credentials: "include"
// });

// api at subdomain api.


// export const isStr = (s) => typeof s === 'string';

// console.log('env vite: ', import.meta.env);
// console.log('backend url: ', import.meta.env.VITE_BACKEND_URL);

// // const url = new URL(window.location.origin);
// export let fetcher = new Fetcher(import.meta.env.VITE_BACKEND_URL, {
//     credentials: 'include',
// });


// /** @param {boolean} csrftoken  */
// async function createFetcher(csrftoken) {
    
//     if (csrftoken) {
//         const r = await fetcher.$get('/csrf');
//         if (typeof r.data.csrfToken !== 'string') throw Error("!");
//         const csrfHeader = new Headers();
//         csrfHeader.append('X-CSRFToken', r.data.csrfToken,)
//         fetcher = new Fetcher(import.meta.env.VITE_BACKEND_URL, {
//             credentials: 'include',
//             headers: csrfHeader
//         }, undefined);
//     } else {
//         console.log('createFetcher NO CSRF');
//         fetcher = new Fetcher(import.meta.env.VITE_BACKEND_URL, {
//             credentials: 'include',
//         }, undefined);
//     }
//     return fetcher;
// }



// export const userAPI = {
//     /**
//      * @param {string} username
//      * @param {string} email
//      * @param {string} password
//      * @param {string} confirmPassword
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     register: async (username, email, password, confirmPassword) =>
//         await fetcher.$post('/register', {
//             bodyData: { username, email, password, confirmPassword },
//         }),

//     /**
//      * @returns {Promise<APITypes.ApiResponse<APITypes.LoginData>>}
//      */
//     getCurrentSession: async () =>
//         await fetcher.$get(`/login`),

//     /**
//      * @param {string} username
//      * @param {string} password
//      * @returns {Promise<APITypes.ApiResponse<APITypes.LoginData>>}
//      */
//     authenticate: async (username, password) =>
//         await fetcher.$post(`/login`, { bodyData: { username, password } }),

//     /**
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     logout: async () =>
//         await fetcher.$post(`/logout`),

//     /**
//      * @param {number} user_id
//      * @param {string} current_password
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     deleteProfile: async (user_id, current_password) =>
//         await fetcher.$post(`/profile/${user_id}/delete`, {bodyData: {
//             current_password
//         }}),

//     /**
//      * @param {string} newPassword
//      * @param {string} oldPassword
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     changePassword: async (newPassword, oldPassword) =>
//         await fetcher.$post(`/password-change`, {bodyData: {
//             old_password: oldPassword,
//             new_password: newPassword,
//         }}),

//     /**
//      * @param {number} user_id
//      * @returns {Promise<APITypes.ApiResponse<APITypes.UserData>>}
//      */
//     getProfile: async (user_id) =>
//         await fetcher.$get(`/profile/${user_id}`),

//     /**
//      * @param {number} user_id
//      * @param {FormData} data
//      * @returns {Promise<APITypes.ApiResponse<APITypes.UserData>>}
//      */
//     postProfile: async (user_id, data) =>
//         await fetcher.$post(`/profile/${user_id}/edit`, {bodyData: data}),
//     /**
//      * @param {string} query
//      * @returns {Promise<APITypes.ApiResponse<APITypes.SearchResult[]>>}
//      */
//     searchUser: async (query) =>
//         await fetcher.$get(`/search`, { searchParams: new URLSearchParams({ q: query }) }),
// };

// export const friendAPI = {
//     /**
//      * @param {number} user_id
//      * @returns {Promise<APITypes.ApiResponse<APITypes.FriendRequestItem[]>>}
//      */
//     getRequestsReceived: async (user_id) =>
//         await fetcher.$get(`/friend/requests/${user_id}`),

//     /**
//      * @param {number} user_id
//      * @returns {Promise<APITypes.ApiResponse<APITypes.FriendRequestItem[]>>}
//      */
//     getRequestsSent: async (user_id) =>
//         await fetcher.$get(`/friend/requests-sent/${user_id}`),

//     /**
//      * @param {number} receiver_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     sendRequest: async (receiver_id) =>
//         await fetcher.$post('/friend/request', { bodyData: { receiver_id } }),

//     /**
//      * @param {number} friend_request_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     cancelRequest: async (friend_request_id) =>
//         await fetcher.$post(`/friend/request/cancel/${friend_request_id}`),

//     /**
//      * @param {number} friend_request_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     acceptRequest: async (friend_request_id) =>
//         await fetcher.$post(`/friend/request/accept/${friend_request_id}`),

//     /**
//      * @param {number} friend_request_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     rejectRequest: async (friend_request_id) =>
//         await fetcher.$post(`/friend/request/reject/${friend_request_id}`),

//     /**
//      * @param {number} receiver_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     removeFriend: async (receiver_id) =>
//         await fetcher.$post('/friend/remove', { bodyData: { receiver_id } }),

//     /**
//      * @param {number} user_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     blockUser: async (user_id) =>
//         await fetcher.$post(`/friend/block/${user_id}`),

//     /**
//      * @param {number} user_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     unblockUser: async (user_id) =>
//         await fetcher.$post(`/friend/unblock/${user_id}`),
// };

// export const gameAPI = {
//     /**
//      * @param {number} schedule_id
//      * @param {number} score_one
//      * @param {number} score_two
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     postResult: async (schedule_id, score_one, score_two) =>
//         await fetcher.$post(`/game/result`, { bodyData: {schedule_id, score_one, score_two} }),
    
//     /**
//      * @returns {Promise<APITypes.ApiResponse<APITypes.GameInvitationItem[]>>}
//      */
//     getInvitesReceived: async () =>
//         await fetcher.$get(`/game/invites-recieved`),
    
//     /**
//      * @returns {Promise<APITypes.ApiResponse<APITypes.GameInvitationItem[]>>}
//      */
//     getInvitesSent: async () =>
//         await fetcher.$get(`/game/invites-sent`),
    
//     /**
//      * @param {number} user_id 
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     sendInvite: async (user_id) =>
//         await fetcher.$post(`/game/invite/${user_id}`, { bodyData: { game_id: 0, game_mode: "1vs1", tournament: null } }),
//     /**
//      * @param {number} user_id 
//      * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem>>}
//      */
//     createMatch: async (user_id) =>
//         await fetcher.$post(`/game/schedule`, { bodyData: {user_id, game_id: 0, game_mode: "1vs1", tournament: null } }),
    
//     /**
//      * @param {number} invite_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     acceptInvite: async (invite_id) =>
//         await fetcher.$post(`/game/invite/accept/${invite_id}`),

//     /**
//      * @param {number} invite_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     cancelInvite: async (invite_id) =>
//         await fetcher.$post(`/game/invite/cancel/${invite_id}`),
    
//     /**
//      * @param {number} invite_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     rejectInvite: async (invite_id) =>
//         await fetcher.$post(`/game/invite/reject/${invite_id}`),
    
//     /**
//      * @param {string} name
//      * @param {APITypes.TournamentMode} mode
//      * @param {number[]} players 
//      * @returns {Promise<APITypes.ApiResponse<{tournament_id: number}>>}
//      */
//     createTournament: async (name, mode, players) => {
//         return await fetcher.$post(`/game/tournament-create`, {
//             bodyData: { name, mode, game_id: 0, players }
//         })
//     },
    
//     /**
//      * @param {number} [page]
//      * @param {number} [userId]
//      * @param {number} [creatorId]
//      * @param {APITypes.TournamentStatus[]} [status]
//      * @param {APITypes.TournamentMode[]} [mode]
//      * @returns {Promise<APITypes.ApiResponse<{max_pages: number, tournaments: APITypes.TournamentItem[]}>>}
//      */
//     getTournaments: async (page, userId, creatorId, status, mode) =>
//         await fetcher.$get(`/game/tournaments`, {searchParams: new URLSearchParams({
//             page: page?.toString() ?? '',
//             user: userId?.toString() ?? '',
//             creator: creatorId?.toString() ?? '',
//             status: status?.join(',') ?? '',
//             mode: mode?.join(',') ?? ''
//         })}),
    
//     /**
//      * @param {number} tournament_id
//      * @returns {Promise<APITypes.ApiResponse<APITypes.TournamentData>>}
//      */
//     getTournamentDetails: async (tournament_id) =>
//         await fetcher.$get(`/game/tournament-details/${tournament_id}`),
    

//     /**
//      * @param {number} schedule_id
//      * @returns {Promise<APITypes.ApiResponse<null>>}
//      */
//     pushRandomResults: async (schedule_id, max_score) => {
//         let score_one, score_two;
//         const rand = Math.random();
//         if (rand < 0.5) {
//             score_one = max_score;
//             score_two = Math.trunc(Math.random() * max_score);
//         } else {
//             score_two = max_score;
//             score_one = Math.trunc(Math.random() * max_score);
//         }
//         console.log('score one: ', score_one);
//         console.log('score two: ', score_two);
//         return (await fetcher.$post(`/game/result`, {bodyData: {
//                 schedule_id,
//                 score_one,
//                 score_two
//             }}));
//     },
//     /**
//      * @param {number} schedule_id
//      * @param {number} score_one
//      * @param {number} score_two
//      * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem>>}
//      */
//     pushResults: async (schedule_id, score_one, score_two) => {
//         return (await fetcher.$post(`/game/result`, {bodyData: {
//                 schedule_id,
//                 score_one,
//                 score_two
//             }}));
//     },
//     /**
//      * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem[]>>}
//      */
//     getGameSchedule: async () =>
//         await fetcher.$get(`/game/schedule`),
    
//     /**
//      * @param {string | true} [username]
//      * @param {number} [page]
//      * @returns {Promise<APITypes.ApiResponse<{history: APITypes.GameScheduleItem[], max_pages: number}>>}
//      */
//     getHistory: async (username, page) =>
//         !username ? await fetcher.$get(`/game/history`, { searchParams: new URLSearchParams({ page: page ? page.toString() : '1' }) } )
//         : username == true ? await fetcher.$get(`/game/history`, {searchParams: new URLSearchParams({user: '', page: page ? page.toString() : '1'})})
//         : await fetcher.$get(`/game/history`, { searchParams: new URLSearchParams({ user: username, page: page ? page.toString() : '1' }) } ),
        
//     /**
//      * @returns {Promise<APITypes.ApiResponse<string>>}
//      */
//     getStats: async () =>
//         await fetcher.$get(`/game/stats`),
    
//     /**
//      * @returns {Promise<APITypes.ApiResponse<APITypes.PlayerData[]>>}
//      */
//     getLeaderboard: async () =>
//         await fetcher.$get(`/game/leaderboard`),
    

// };

export const isStr = (s) => typeof s === 'string';

console.log('env vite: ', import.meta.env);
console.log('backend url: ', import.meta.env.VITE_BACKEND_URL);

// const url = new URL(window.location.origin);
export let fetcher = new Fetcher(import.meta.env.VITE_BACKEND_URL, {
    credentials: 'include',
});


/** @param {boolean} csrftoken  */
async function createFetcher(csrftoken) {
    
    if (csrftoken) {
        const r = await fetcher.$get('/api/csrf');
        if (typeof r.data.csrfToken !== 'string') throw Error("!");
        const csrfHeader = new Headers();
        csrfHeader.append('X-CSRFToken', r.data.csrfToken,)
        fetcher = new Fetcher(import.meta.env.VITE_BACKEND_URL, {
            credentials: 'include',
            headers: csrfHeader
        }, undefined);
    } else {
        console.log('createFetcher NO CSRF');
        fetcher = new Fetcher(import.meta.env.VITE_BACKEND_URL, {
            credentials: 'include',
        }, undefined);
    }
    return fetcher;
}



export const userAPI = {
    /**
     * @param {string} username
     * @param {string} email
     * @param {string} password
     * @param {string} confirmPassword
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    register: async (username, email, password, confirmPassword) =>
        await fetcher.$post('/api/register', {
            bodyData: { username, email, password, confirmPassword },
        }),

    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.LoginData>>}
     */
    getCurrentSession: async () =>
        await fetcher.$get(`/api/login`),

    /**
     * @param {string} username
     * @param {string} password
     * @returns {Promise<APITypes.ApiResponse<APITypes.LoginData>>}
     */
    authenticate: async (username, password) =>
        await fetcher.$post(`/api/login`, { bodyData: { username, password } }),

    auth42: async () =>
        fetcher.$get('api/o/login'),

    /**
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    logout: async () =>
        await fetcher.$post(`/api/logout`),

    /**
     * @param {number} user_id
     * @param {string} current_password
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    deleteProfile: async (user_id, current_password) =>
        await fetcher.$post(`/api/profile/${user_id}/delete`, {bodyData: {
            current_password
        }}),

    /**
     * @param {string} newPassword
     * @param {string} oldPassword
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    changePassword: async (newPassword, oldPassword) =>
        await fetcher.$post(`/api/password-change`, {bodyData: {
            old_password: oldPassword,
            new_password: newPassword,
        }}),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.UserData>>}
     */
    getProfile: async (user_id) =>
        await fetcher.$get(`/api/profile/${user_id}`),

    /**
     * @param {number} user_id
     * @param {FormData} data
     * @returns {Promise<APITypes.ApiResponse<APITypes.UserData>>}
     */
    postProfile: async (user_id, data) =>
        await fetcher.$post(`/api/profile/${user_id}/edit`, {bodyData: data}),
    /**
     * @param {string} query
     * @returns {Promise<APITypes.ApiResponse<APITypes.SearchResult[]>>}
     */
    searchUser: async (query) =>
        await fetcher.$get(`/api/search`, { searchParams: new URLSearchParams({ q: query }) }),
};

export const friendAPI = {
    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.FriendRequestItem[]>>}
     */
    getRequestsReceived: async (user_id) =>
        await fetcher.$get(`/api/friend/requests/${user_id}`),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.FriendRequestItem[]>>}
     */
    getRequestsSent: async (user_id) =>
        await fetcher.$get(`/api/friend/requests-sent/${user_id}`),

    /**
     * @param {number} receiver_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    sendRequest: async (receiver_id) =>
        await fetcher.$post('/api/friend/request', { bodyData: { receiver_id } }),

    /**
     * @param {number} friend_request_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    cancelRequest: async (friend_request_id) =>
        await fetcher.$post(`/api/friend/request/cancel/${friend_request_id}`),

    /**
     * @param {number} friend_request_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    acceptRequest: async (friend_request_id) =>
        await fetcher.$post(`/api/friend/request/accept/${friend_request_id}`),

    /**
     * @param {number} friend_request_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    rejectRequest: async (friend_request_id) =>
        await fetcher.$post(`/api/friend/request/reject/${friend_request_id}`),

    /**
     * @param {number} receiver_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    removeFriend: async (receiver_id) =>
        await fetcher.$post('/api/friend/remove', { bodyData: { receiver_id } }),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    blockUser: async (user_id) =>
        await fetcher.$post(`/api/friend/block/${user_id}`),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    unblockUser: async (user_id) =>
        await fetcher.$post(`/api/friend/unblock/${user_id}`),
};

export const gameAPI = {
    /**
     * @param {number} schedule_id
     * @param {number} score_one
     * @param {number} score_two
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    postResult: async (schedule_id, score_one, score_two) =>
        await fetcher.$post(`/api/game/result`, { bodyData: {schedule_id, score_one, score_two} }),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameInvitationItem[]>>}
     */
    getInvitesReceived: async () =>
        await fetcher.$get(`/api/game/invites-recieved`),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameInvitationItem[]>>}
     */
    getInvitesSent: async () =>
        await fetcher.$get(`/api/game/invites-sent`),
    
    /**
     * @param {number} user_id 
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    sendInvite: async (user_id) =>
        await fetcher.$post(`/api/game/invite/${user_id}`, { bodyData: { game_id: 0, game_mode: "1vs1", tournament: null } }),
    /**
     * @param {number} user_id 
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem>>}
     */
    createMatch: async (user_id) =>
        await fetcher.$post(`/api/game/schedule`, { bodyData: {user_id, game_id: 0, game_mode: "1vs1", tournament: null } }),
    
    /**
     * @param {number} invite_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    acceptInvite: async (invite_id) =>
        await fetcher.$post(`/api/game/invite/accept/${invite_id}`),

    /**
     * @param {number} invite_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    cancelInvite: async (invite_id) =>
        await fetcher.$post(`/api/game/invite/cancel/${invite_id}`),
    
    /**
     * @param {number} invite_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    rejectInvite: async (invite_id) =>
        await fetcher.$post(`/api/game/invite/reject/${invite_id}`),
    
    /**
     * @param {string} name
     * @param {APITypes.TournamentMode} mode
     * @param {number[]} players 
     * @returns {Promise<APITypes.ApiResponse<{tournament_id: number}>>}
     */
    createTournament: async (name, mode, players) => {
        return await fetcher.$post(`/api/game/tournament-create`, {
            bodyData: { name, mode, game_id: 0, players }
        })
    },
    
    /**
     * @param {number} [page]
     * @param {number} [userId]
     * @param {number} [creatorId]
     * @param {APITypes.TournamentStatus[]} [status]
     * @param {APITypes.TournamentMode[]} [mode]
     * @returns {Promise<APITypes.ApiResponse<{max_pages: number, tournaments: APITypes.TournamentItem[]}>>}
     */
    getTournaments: async (page, userId, creatorId, status, mode) =>
        await fetcher.$get(`/api/game/tournaments`, {searchParams: new URLSearchParams({
            page: page?.toString() ?? '',
            user: userId?.toString() ?? '',
            creator: creatorId?.toString() ?? '',
            status: status?.join(',') ?? '',
            mode: mode?.join(',') ?? ''
        })}),
    
    /**
     * @param {number} tournament_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.TournamentData>>}
     */
    getTournamentDetails: async (tournament_id) =>
        await fetcher.$get(`/api/game/tournament-details/${tournament_id}`),
    

    /**
     * @param {number} schedule_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    pushRandomResults: async (schedule_id, max_score) => {
        let score_one, score_two;
        const rand = Math.random();
        if (rand < 0.5) {
            score_one = max_score;
            score_two = Math.trunc(Math.random() * max_score);
        } else {
            score_two = max_score;
            score_one = Math.trunc(Math.random() * max_score);
        }
        console.log('score one: ', score_one);
        console.log('score two: ', score_two);
        return (await fetcher.$post(`/api/game/result`, {bodyData: {
                schedule_id,
                score_one,
                score_two
            }}));
    },
    /**
     * @param {number} schedule_id
     * @param {number} score_one
     * @param {number} score_two
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem>>}
     */
    pushResults: async (schedule_id, score_one, score_two) => {
        return (await fetcher.$post(`/api/game/result`, {bodyData: {
                schedule_id,
                score_one,
                score_two
            }}));
    },
    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem[]>>}
     */
    getGameSchedule: async () =>
        await fetcher.$get(`/api/game/schedule`),
    
    /**
     * @param {string | true} [username]
     * @param {number} [page]
     * @returns {Promise<APITypes.ApiResponse<{history: APITypes.GameScheduleItem[], max_pages: number}>>}
     */
    getHistory: async (username, page) =>
        !username ? await fetcher.$get(`/api/game/history`, { searchParams: new URLSearchParams({ page: page ? page.toString() : '1' }) } )
        : username == true ? await fetcher.$get(`/api/game/history`, {searchParams: new URLSearchParams({user: '', page: page ? page.toString() : '1'})})
        : await fetcher.$get(`/api/game/history`, { searchParams: new URLSearchParams({ user: username, page: page ? page.toString() : '1' }) } ),
        
    /**
     * @returns {Promise<APITypes.ApiResponse<string>>}
     */
    getStats: async () =>
        await fetcher.$get(`/api/game/stats`),
    
    /** @returns {Promise<APITypes.ApiResponse<APITypes.PlayerData[]>>} */
    getLeaderboard: async () =>
        await fetcher.$get(`/api/game/leaderboard`),
    

};

/** @returns {Promise<APITypes.ApiResponse<APITypes.ChatRoomData[]>>} */
export const chatAPI = {
    getChatRooms: () => fetcher.$get('/api/chat/rooms'),
}


export class SessionStore {

    constructor() {
        // this.#initNotificationSocket();
    }

    /** @type {GlobalSockHandler | null} */
    messageSocket = null;

    #isLoggedIn = false;

    /** @type {APITypes.UserSession | undefined} */
    #sessionData;

    get isLoggedIn() {
        return this.#isLoggedIn;
    }

    /**
     * 
     * @param {any} error 
    */
    //  * @param {boolean} notifyBadStatus 
    handleFetchError(error) {
        if (error instanceof DOMException) {
            document.dispatchEvent(new ToastNotificationErrorEvent(`DOMException: ${error.name}: ${error.message}`))
        } else if (error instanceof TypeError) {
            document.dispatchEvent(new ToastNotificationErrorEvent(`TypeError: ${error.message}`))
        } else if (error instanceof Error) {
            document.dispatchEvent(new ToastNotificationErrorEvent(error.message))
        } else if (typeof error === 'string' ) {
            document.dispatchEvent(new ToastNotificationErrorEvent(error))
        }
        // else if (notifyBadStatus && error && error.message)
            
    }


    /**
     * @template {APITypes.JSONValue} T
     * @param {Promise<APITypes.ApiResponse<T>>} fetchPromise 
     * @param {(statusCode: number, message: string) => void} [onError]
    */
    async fetchAndNotifyOnUnsuccess(fetchPromise, onError) {
        try {
            const response = await fetchPromise;
            if (!response.success) {
                if (typeof onError === 'function') {
                    onError(response.statuscode, response.message);
                }
            } else {
                return response.data;
            }
        } catch (error) {
            this.handleFetchError(error);
        }
        return false;
    }

    /**
     * @template {APITypes.JSONValue} T
     * @param {Promise<APITypes.ApiResponse<T>>} fetchPromise
     * @returns {Promise<false | T>}
    */
    async fetchShort(fetchPromise) {
        const r = await this.fetchAndNotifyOnUnsuccess(fetchPromise, (c, m) => {
            console.log('FETCH error: ', c, 'MSG: ', m);
            
            if (c !== 200) throw Error(m);
        });
        console.log('FETCH SHORT: R: ', r);
        
        return r;
    }

    /**
     * @template {APITypes.JSONValue} T
     * @param {Promise<APITypes.ApiResponse<T>>} fetchPromise 
    */
    async fetchResponse(fetchPromise) {
        try {
            const response = await fetchPromise;
            return response;
        } catch (error) {
            this.handleFetchError(error);
        }
    }

    /** @param {string} error  */
    async createFetcherError(error) {
        await createFetcher(false);
        return error;
    }

    /**
     * @param {FormDataEntryValue | null} [confirmPassword] 
     * @param {FormDataEntryValue | null} [email] 
     * @param {FormDataEntryValue | null} [password]
     * @param {FormDataEntryValue | null} [username]  
     */
    async registerAndLogin(username, email, password, confirmPassword) {
        if (!isStr(username) || !isStr(email) || !isStr(password) || ! isStr(confirmPassword)) {
            return 'invalid data';
        }
        await createFetcher(true);
        const r = await this.fetchResponse(userAPI.register(username, email, password, confirmPassword));
        if (!r) {
            return this.createFetcherError('unable to fetch data');
        }
        if (!r.success) {
            return this.createFetcherError(r.message);
        }
        return this.login(username, password);
        
        
        // try {
        //     await createFetcher(true);
        //     const registerData = await userAPI.register(username, email, password, confirmPassword);
        //     if (!registerData.success) {
        //         await createFetcher(false);
        //         document.dispatchEvent(new ToastNotificationErrorEvent(registerData.message));
        //     } else {
        //         return await this.login(username, password);
        //     }
        // } catch (error) {
        //     this.handleFetchError(error);
        //     return null;
        // }
    }

    /**
     * 
     * @param {FormDataEntryValue | null} [username] 
     * @param {FormDataEntryValue | null} [password] 
     * @returns 
     */
    async login(username, password) {
        await createFetcher(true);
        /** @type {APITypes.ApiResponse<APITypes.LoginData> | undefined} */
        let loginResponse;
        if (isStr(username) && isStr(password)) {
            loginResponse = await this.fetchResponse(userAPI.authenticate(username, password));
        } else if (username === undefined && password === undefined) {
            loginResponse = await this.fetchResponse(userAPI.getCurrentSession());
        } else {
            return this.createFetcherError('invalid login data');
        }

        if (!loginResponse) {
            return this.createFetcherError('unable to fetch data');
        }

        if (!loginResponse.success) {
            return this.createFetcherError(loginResponse.message);
        }

        this.#isLoggedIn = true;
        await createFetcher(true);
        await this.updateData(["all"], loginResponse.data.user_id);
        if (this.#sessionData == undefined || this.#sessionData.user == undefined) {
            this.#isLoggedIn = false;
            this.#sessionData = undefined
            return this.createFetcherError('unable to fetch userdata');
        }
    
        this.messageSocket = new GlobalSockHandler(this.#sessionData.user);
        await this.messageSocket.init();
        if (router.isInitialized) {
            router.mountRootAndGoTo('/');
        }

        return null;
            
        
            
      

        // }
        // try {
        //     await createFetcher(true);
            
        //     let loginData
        //     if (username && password) {
        //         // console.log('login with credentials');
        //         loginData = await userAPI.authenticate(username, password);
                
        //         await createFetcher(true);
        //     } else {
        //         // console.log('login without credentials, fetch active');
        //         loginData = await userAPI.getCurrentSession();
                
        //         // console.log(loginData);
        //     }
        //     if (loginData.success) {
        //         this.#isLoggedIn = true;
        //         await createFetcher(true);
        //         await this.updateData(["all"], loginData.data.user_id);
        //         if (this.#sessionData?.user) {
        //             this.messageSocket = new GlobalSockHandler(this.#sessionData?.user);
        //             await this.messageSocket.init();
        //         }

        //         else throw new Error("NO USER DATA?!?!")
        //     } else {
        //         await createFetcher(false);
        //     }
        //     return loginData;
        // } catch (error) {
        //     this.handleFetchError(error);
        //     return null;
        // }
    }

    async clearSession() {
        this.#isLoggedIn = false;
        this.#sessionData = undefined;
        await createFetcher(false);
        this.messageSocket?.closeSocket();
        this.messageSocket = null;
        this.#pubsub.publish(this.#sessionData);
    }

    async logout() {
        try {
            await userAPI.logout();
            await this.clearSession();
        } catch (error) {
            this.handleFetchError(error);
        }
    }

  
    /** @param {number} user_id */
    getReceivedFriendRequest = (user_id) => this.#sessionData?.friend_requests_received?.find((i)=> i.id === user_id);
    /** @param {number} user_id */
    getSentFriendRequest = (user_id) => this.#sessionData?.friend_requests_sent?.find((i)=> i.id === user_id);
    /** @param {number} user_id */
    getFriend = (user_id) => this.#sessionData?.user?.friends?.find((i)=> i.id === user_id);
    /** @param {number} user_id */
    getBlocked = (user_id) => this.#sessionData?.user?.blocked?.find((i)=> i.id === user_id);
    /** @param {number} user_id @param {APITypes.GameMode} mode */
    getReceivedGameInvitation = (user_id, mode) => this.#sessionData?.game_invitations_received?.find((i)=> i.game_mode === "1vs1" && i.id === user_id);
    /** @param {number} user_id @param {"received" | "sent"} type @param {APITypes.GameMode} mode */
    getGameInvitations = (user_id, type, mode) => {
        if (type === "received") return this.#sessionData?.game_invitations_received?.filter(item => item.game_mode === mode && item.id === user_id);
        if (type === "sent") return this.#sessionData?.game_invitations_sent?.filter(item => item.game_mode === mode && item.id === user_id);
        return undefined;
    }

    /** @param {number} schedule_id */
    getGameByScheduleId = (schedule_id) =>
        this.#sessionData?.game_schedule?.find((i)=> i.schedule_id === schedule_id);

    /** @param {number | null} [tournament_id] */
    getTournamentById = (tournament_id) => tournament_id == undefined ? undefined
        : this.#sessionData?.tournaments?.find((i)=> i.id === tournament_id);

    /** @param {"all" | APITypes.GameMode} mode */
    getGamesByGameMode = (mode) =>
        mode === "all" ? this.#sessionData?.game_schedule : this.#sessionData?.game_schedule?.find((i)=> i.game_mode === mode);

    /** @param {number} user_id @param {"all" | APITypes.GameMode} mode */
    getGamesWithUser = (user_id, mode) => {
        const filt = /** @param {APITypes.GameScheduleItem} game */ ( game) => {
            if (mode === "all")
                return game.player_one.id === user_id || game.player_two.id === user_id;
            if (mode !== game.game_mode) return (false);
            return game.player_one.id === user_id || game.player_two.id === user_id;
        }
        return this.#sessionData?.game_schedule?.filter(filt);
            
    }

    /** @param {number} user_id */
    canSend1vs1GameInvitation = (user_id) => {
        // console.log('canSend1vs1GameInvitation: user_id: ', user_id);
        // console.log('canSend1vs1GameInvitation: getReceivedGameInvitation: ', this.getGameInvitations(user_id, "received", "1vs1"));
        // console.log('canSend1vs1GameInvitation: getSentGameInvitation: ', this.getGameInvitations(user_id, "received", "1vs1"));
        // console.log('canSend1vs1GameInvitation: getGamesWithUser: ', this.getGamesWithUser(user_id, "1vs1"));
        const rec = this.getGameInvitations(user_id, "received", "1vs1");
        if (rec && rec.length > 0) return false;
        const sent = this.getGameInvitations(user_id, "sent", "1vs1");
        if (sent && sent.length > 0) return false;
        const games = this.getGamesWithUser(user_id, "1vs1");
        if (games && games.length > 0) return false;
        return true;
    }

    /** @param {number} user_id  */
    async sendGameInvitation(user_id) {
        if (!this.#isLoggedIn || !this.#sessionData) return;
        const res = await this.fetchShort(gameAPI.sendInvite(user_id));
        console.log('res: ', res);
        if(res !== false) {
            await this.updateData(["game_invitations_sent"]);
        }
    }

    /**
     * @param {number} user_id
     */
    async createMatch(user_id) {
        if (!this.#isLoggedIn || !this.#sessionData) return;
        const res = await this.fetchShort(gameAPI.createMatch(user_id));
        if (res) {
            await this.updateData(['game_schedule']);
            return res;
        }
    }

    /**
     * @param {string} tournamentName
     * @param {APITypes.TournamentMode} mode
     * @param {number[]} players
    */
    async createTournament(tournamentName, mode, players) {
        if (!this.#isLoggedIn || !this.#sessionData) return;
        const d = await this.fetchShort(gameAPI.createTournament(tournamentName, mode, players));
        if (d !== false) {
            await this.updateData(["game_invitations_sent"]);
        }
        return d;
    }

    async updateUserData(formData) {
        if (!this.#isLoggedIn || !this.#sessionData?.user) return;
        try {
            const ret = await userAPI.postProfile(this.#sessionData?.user?.id, formData);
            await this.updateData(["user"]);
            // console.log('res uodate user data: ', ret);
            if (ret.statuscode === 200) {
                document.dispatchEvent(new ToastNotificationSuccessEvent(ret.message))
            } else {
                document.dispatchEvent(new ToastNotificationErrorEvent(ret.message))
            }
        } catch (error) {
            this.handleFetchError(error);
        }
        
        
    }

    /**
     * @typedef {keyof APITypes.UserSession | "all"} ListItem
     * @param {ListItem[]} lists
     * @param {number} [user_id]
     * @returns {Promise<void>}
     */
    async updateData(lists, user_id) {
        if (this.#sessionData?.user) user_id = this.#sessionData.user.id;
        console.log('SESSIONSERVICE: updateData: ', lists);
        
        if (!user_id) throw new Error("unable to fetch data without the user id");
        /** @type {Promise<APITypes.ApiResponse<APITypes.UserData> | APITypes.ApiResponse<APITypes.FriendRequestItem[]> | APITypes.ApiResponse<APITypes.GameInvitationItem[]> | APITypes.ApiResponse<APITypes.GameScheduleItem[]> | APITypes.ApiResponse<{ history: APITypes.GameScheduleItem[]; max_pages: number; }> | APITypes.ApiResponse<{max_pages: number, tournaments: APITypes.TournamentItem[]}> > []} */
        let promises = [];
        // if (1) {
        if (lists.length == 1 && lists[0] == "all") {
            // console.log('fetch all');
            lists = ["user", "friend_requests_received", "friend_requests_sent", "game_invitations_received", "game_invitations_sent", "game_schedule", "game_results", "tournaments"]
            promises = [
                userAPI.getProfile(user_id),
                friendAPI.getRequestsReceived(user_id),
                friendAPI.getRequestsSent(user_id),
                gameAPI.getInvitesReceived(),
                gameAPI.getInvitesSent(),
                gameAPI.getGameSchedule(),
                gameAPI.getHistory(),
                gameAPI.getTournaments(),
            ]
        } else {
            for (const list of lists) {
                console.log('UPDATE: ', list);
                switch (list) {
                    case "user":
                        promises.push(userAPI.getProfile(user_id));
                        break;
                    case "friend_requests_received":
                        promises.push(friendAPI.getRequestsReceived(user_id));
                        break;
                    case "friend_requests_sent":
                        promises.push(friendAPI.getRequestsSent(user_id));
                        break;
                    case "game_invitations_received":
                        promises.push(gameAPI.getInvitesReceived());
                        break;
                    case "game_invitations_sent":
                        promises.push(gameAPI.getInvitesSent());
                        break;
                    case "game_schedule":
                        promises.push(gameAPI.getGameSchedule());
                        break;
                    case "game_results":
                        promises.push(gameAPI.getHistory());
                        break;
                    case "tournaments":
                        promises.push(gameAPI.getTournaments(undefined, user_id));
                        break;
                    default:
                        throw new Error("INVALID UPDATE ITEM");
                }
            }
        }
        try {
            // console.log("promises: ", promises);
            const data = await Promise.all(promises);
            if (this.#sessionData === undefined) this.#sessionData = {}
            data.forEach((val, i) => {
                // console.log('foreach push.., list[i]', lists[i], ", val: ", val);
                if (val.statuscode !== 200) {
                    document.dispatchEvent(new ToastNotificationErrorEvent(val.message))
                } else if (this.#sessionData) {
                    if (Object.hasOwn(val.data, 'history')) {
                        // @ts-ignore
                        this.#sessionData[lists[i]] = val.data.history;
                    } else if (Object.hasOwn(val.data, 'tournaments')) {
                        // @ts-ignore
                        this.#sessionData[lists[i]] = val.data.tournaments;
                    } else {
                        this.#sessionData[lists[i]] = val.data
                    }
                }
            });
            this.#pubsub.publish(this.#sessionData);  
        } catch (error) {
            this.handleFetchError(error);
        }
        
    }


    /**
     * @param {"add-friend" | "remove-friend" | "block-user" | "unblock-user"} action
     * @param {number} user_id
     */
    async handleUser(action, user_id) {
        // console.log('handle action! user: ', this.#sessionData);
        if (!this.#isLoggedIn || !this.#sessionData) return;
        let data;
        try {
            if (action === "add-friend") {
                data = await friendAPI.sendRequest(user_id);
                await this.updateData(["friend_requests_sent"]);
            } else if (action === "remove-friend") {
                data = await friendAPI.removeFriend(user_id);
                await this.updateData(["user", 'game_invitations_received', 'game_invitations_sent', 'game_schedule']);
            } else if (action === "block-user") {
                data = await friendAPI.blockUser(user_id);
                await this.updateData(["user", 'game_invitations_received', 'game_invitations_sent', 'game_schedule']);
            } else if (action === "unblock-user") {
                data = await friendAPI.unblockUser(user_id);
                await this.updateData(["user"]);
            }
            if (data && data.statuscode !== 200)
                document.dispatchEvent(new ToastNotificationErrorEvent(data.message))
        } catch (error) {
            this.handleFetchError(error)
        }
    }

    async finishGameUpdateData(schedule_id) {
        const item = this.getGameByScheduleId(schedule_id);
        if (item == undefined)
            throw new Error("SessionService: finishGameUpdateData: invalid schedule_id -> not found");
        try {
            const d = await gameAPI.pushRandomResults(schedule_id, 10);
            this.updateData(["game_schedule"]);
        } catch (error) {
            this.handleFetchError(error)
        }
    }


    /**
     * @param {"friend-reject" | "friend-accept" | "friend-cancel" | "game-reject" | "game-accept" | "game-cancel"} action
     * @param {number} request_id 
     */
    async handleRequest(action, request_id) {
        if (!this.#isLoggedIn || !this.#sessionData) return;
        try {
            let data;
            let toUpdate = [];
            if (action === "game-accept") {
                data = await gameAPI.acceptInvite(request_id);
                toUpdate = ["game_invitations_received", "game_schedule", "tournaments"];
            
            } else if (action === "game-reject") {
                data = await gameAPI.rejectInvite(request_id);
                toUpdate = ["game_invitations_received"]
            
            } else if (action === "game-cancel") {
                data = await gameAPI.cancelInvite(request_id);
                toUpdate = ["game_invitations_sent"]
            
            } else if (action === "friend-accept") {
                data = await friendAPI.acceptRequest(request_id);
                toUpdate = ["friend_requests_received", "user"]
            
            } else if (action === "friend-reject") {
                data = await friendAPI.rejectRequest(request_id);
                toUpdate = ["friend_requests_received"]
            
            } else if (action === "friend-cancel") {
                data = await friendAPI.cancelRequest(request_id);
                toUpdate = ["friend_requests_sent"]
            }
            if (data && data.statuscode !== 200) {
                // console.log("dispatch stasu wrign!: ", data.message);
                document.dispatchEvent(new ToastNotificationErrorEvent(data.message));
            } else if (data) {
                await this.updateData(toUpdate);
            }
        } catch (error) {
            this.handleFetchError(error)
        }
    }

    /** @type {Map<number, APITypes.UserData>} */
    cachedProfileData = new Map();
    /** @type {Map<number, APITypes.GameScheduleItem[]>} */
    cachedProfileGameHistoryData = new Map();


    /**
     * @param {BaseBase} [host]
     * @param {boolean} [force] 
     * @returns {PubSubConsumer<APITypes.UserSession | undefined>}
     */
    subscribe(host, force = false) {
        // // console.log('subscribe to sessionService');
        return this.#pubsub.subscribe(this.#sessionData, host, force);
    }

    #pubsub = new PubSub();

    get session() {
        return this.#sessionData;
    }

}

export const sessionService = new SessionStore();

