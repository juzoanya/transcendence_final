import { html, ifDefined } from '../lib_templ/BaseElement.js';
import { getTournamentLink } from '../routes/home/utils.js';
import { sessionService } from '../services/api/API.js';
import { avatarLink } from './bootstrap/AvatarComponent';
import { renderCardInfo } from './bootstrap/BsCard';

/** @param {APITypes.GameScheduleItem} data */
export const renderInlineMatch = (data) => html`
    <div class="row py-2 w-100 g-0 justify-content-start align-content-center">
        <div class="col-5 text-truncate text-start">
            ${avatarLink(data.player_one)}
        </div>
        <div class="col-2 text-truncate">
            ${renderCardInfo('VS')}
        </div>
        <div class="col-5 text-truncate  text-start">
            ${avatarLink(data.player_two)}
        </div>
    </div>
`

/**
 * @param {number} currScore 
 * @param {number} otherScore 
 */
export const renderSingleScore = (currScore, otherScore) => html`
<span class="badge text-bg-${currScore > otherScore ? 'success' : 'danger'}">${currScore}</span>
`

/**
 * @param {number} s1 
 * @param {number} s2 
 * @returns 
 */
export const renderScore = (s1, s2) => html`
    ${renderSingleScore(s1, s2)}
    ${renderSingleScore(s2, s1)}
`

/** @param {APITypes.GameScheduleItem} data @param {'winner-first' | 'loser-first' | number} [mode] */
export const renderScoreMode = (data, mode) => {
    const u1 = data.player_one;
    const u2 = data.player_two;
    const s1 = data.result.player_one_score;
    const s2 = data.result.player_two_score;
    if (typeof mode === 'number') {
        return u1.id === mode ? renderScore(s1, s2) : renderScore(s2, s1);
    } else if (mode === 'winner-first') {
        return s1 > s2 ? renderScore(s1, s2) : renderScore(s2, s1);
    } else if (mode === 'loser-first') {
        return s1 < s2 ? renderScore(s1, s2) : renderScore(s2, s1);
    }
}

/** @param {APITypes.GameScheduleItem} data @param {number} [userId] */
export const renderMatchWinner = (data, userId) => {
    return renderCardInfo('Winner', html`
        <span class="badge text-bg-${data.result.winner_id === userId ? 'success' : 'danger'}">
            ${data.result.winner}
        </span>
    `)
}

export const getPongSvg = () => html`
    <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        <!-- Spielfeld -->
        <rect width="100%" height="100%" fill="inherit" />
        
        <!-- Paddel links -->
        <rect x="10" y="40" width="7" height="40" fill="white" />
        
        <!-- Paddel rechts -->
        <rect x="180" y="10" width="7" height="40" fill="white" />
        
        <!-- Ball -->
        <rect x="60" y="20" width="7" height="7" fill="white" />
        
        <!-- Mittellinie -->
        <line x1="100" y1="6" x2="100" y2="100" stroke="white" stroke-dasharray="7" />
    </svg>
`


export const get1vs1MatchImg = () => html`
    <img
        class="rounded-4 object-fit-cover border border-white border-3"
        alt="avatar"
        src="/images/match_1_2.webp"
        width="50"
        height="50"
    />
`

export const getRRMatchImg = (size) => html`
   
    <img
        
        class="rounded-5 object-fit-cover border border-white border-3"
        alt="avatar"
        src="/images/match_rr_2.webp"
        width="${size ?? 50}"
        height="${size ?? 50}"
    />
`

export const getSEMatchImg = (size) => html`
    <img
        
        class="rounded-3 object-fit-cover border border-white border-2"
        alt="avatar"
        src="/images/match_se_3.webp"
        width="${size ?? 50}"
        height="${size ?? 50}"
    />
`

export const getRRMatchImgTooltip = () => html`
   
    <img
        data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Round Robin Tournament"
        class="rounded-5 object-fit-cover border border-white border-3"
        alt="avatar"
        src="/images/match_rr_2.webp"
        width="50"
        height="50"
    />
`

export const getSEMatchImgTooltip = () => html`
    <img
        data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Single Elimination Tournament"
        class="rounded-3 object-fit-cover border border-white border-2"
        alt="avatar"
        src="/images/match_se_3.webp"
        width="50"
        height="50"
    />
`

/** @param {APITypes.TournamentMode} [mode] */
export const getTournamentIcon = (mode) => !mode ? '' : mode === 'round robin' ? getRRMatchImgTooltip() : getSEMatchImgTooltip();

/**
 * @param {APITypes.GameScheduleItem} schedule
 */
export const getMatchIcon = (schedule) => {
    const tdata = sessionService.getTournamentById(schedule.tournament);
    const img = tdata?.mode === 'round robin' ? getRRMatchImg() : tdata?.mode === 'single elimination' ? getSEMatchImg() : get1vs1MatchImg();
    return html`
        <a class="d-inline-flex"
            href="#"
            data-bs-toggle="popover" data-bs-placement="top" data-bs-html="true"
            
            data-bs-content="${`
                ${!tdata ? '1vs1' : tdata.mode} Match
                ${!tdata ? '' : `
                    <a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                        href="${ifDefined(`/games/${tdata.game_id.toLowerCase()}/tournament/${tdata.id}`)}"
                    >
                        <br>
                        <br>
                        <b>Tournament:</b>
                        <br>
                         ${tdata.name}
                    </a>
                `}
                
            `}"
        >
            ${img}
            </a>
    `
         
         

    // return !tdata ? img : html`
    //     <a class="d-inline-flex"
    //         href="${ifDefined(`/games/${tdata.game_id.toLowerCase()}/tournament/${tdata.id}`)}"
    //         data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Single Elimination Match"
    //     >
    //         ${img}
    //     </a>
    // `
}

/**
 * @param {number} [tid]
 */
export const getMatchIconByTournamentId = (tid) => {
    const tdata = sessionService.getTournamentById(tid);
    const img = tdata?.mode === 'round robin' ? getRRMatchImg() : tdata?.mode === 'single elimination' ? getSEMatchImg() : get1vs1MatchImg();
    return html`
        <a class="d-inline-flex"
            href="#"
            data-bs-toggle="popover" data-bs-placement="top" data-bs-html="true"
            
            data-bs-content="${`
                ${!tdata ? '1vs1' : tdata.mode} Match
                ${!tdata ? '' : `
                    <a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                        href="${ifDefined(`/games/${tdata.game_id.toLowerCase()}/tournament/${tdata.id}`)}"
                    >
                        <br>
                        <br>
                        <b>Tournament:</b>
                        <br>
                         ${tdata.name}
                    </a>
                `}
                
            `}"
        >
            ${img}
            </a>
    `
}

/** @param {APITypes.TournamentItem | APITypes.TournamentData | string} [d] */
export const getTournamentAvatarLink = (d) => {
    if (typeof d === 'string') {
        d = sessionService.session?.tournaments?.find(t => t.name === d);
    }
    return !d ? '' : html`
        <a
            href="${getTournamentLink(d.game_id.toLowerCase() ?? 'pong', d.id)}"
            class="d-inline-flex align-items-center link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
        >
            ${d.mode === 'round robin' ? getRRMatchImg(40) : getSEMatchImg(40)}
            <span class="ms-2">${d.name ?? ''}</span>
        </a>

`
}
/** @param {APITypes.TournamentItem | APITypes.TournamentData | string} [d] */
export const getTournamentAvatarInfo = (d) => {
    if (typeof d === 'string') {
        d = sessionService.session?.tournaments?.find(t => t.name === d);
    }
    return !d ? undefined : html`
        <span
            class="d-inline-flex align-items-center link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
        >
            ${d.mode === 'round robin' ? getRRMatchImg(40) : getSEMatchImg(40)}
            <span class="ms-2">${d.name ?? ''}</span>
        </span>

`
}

/** @param {APITypes.TournamentStatus} [status] */
export const getStatusBadge = (status) => {
    //     <span class="badge rounded-pill text-bg-primary">Primary</span>
    // <span class="badge rounded-pill text-bg-secondary">Secondary</span>
    // <span class="badge rounded-pill text-bg-success">Success</span>
    // <span class="badge rounded-pill text-bg-danger">Danger</span>
    // <span class="badge rounded-pill text-bg-warning">Warning</span>
    // <span class="badge rounded-pill text-bg-info">Info</span>
    // <span class="badge rounded-pill text-bg-light">Light</span>
    // <span class="badge rounded-pill text-bg-dark">Dark</span>
        const color = status === 'waiting' ? 'info' : status === 'finished' ? 'success' : status === 'in progress' ? 'warning' : 'primary';

        return html`
            <span class="badge rounded-pill text-bg-${color}">${status ?? ''}</span>
        `
    }
    


// /** @param {APITypes.GameScheduleItem} data @param {number | undefined} userId */
// export const renderScoreUserFirst = (data, userId) => data.player_one.id === userId ? html`
//         ${renderSingleScore(data.result.player_one_score, data.result.player_two_score)}
//         ${renderSingleScore(data.result.player_two_score, data.result.player_one_score)}
//     ` : html`
//         ${renderSingleScore(data.result.player_one_score, data.result.player_two_score)}
//         ${renderSingleScore(data.result.player_two_score, data.result.player_one_score)}
// `

// /** @param {APITypes.GameScheduleItem} data @param {'winner-first' | 'loser-first'} mode */
// export const renderScoref = (data, mode) => mode === 'winner-first' && data.result.player_one_score > data.result.player_two_score ? html`
//         ${renderSingleScore(data.result.player_one_score, data.result.player_two_score)}
//         ${renderSingleScore(data.result.player_two_score, data.result.player_one_score)}
//     ` : html`
//         ${renderSingleScore(data.result.player_one_score, data.result.player_two_score)}
//         ${renderSingleScore(data.result.player_two_score, data.result.player_one_score)}
// `


// /** @param {APITypes.GameScheduleItem} data @param {'winner-first' | 'loser-first'} mode */
// export const renderScore = (data, mode) => {
//     return html`
//         ${renderSingleScore(data.result.player_one_score, data.result.player_two_score)}
//         ${renderSingleScore(data.result.player_two_score, data.result.player_one_score)}
//     `
// }

// /** @param {APITypes.GameScheduleItem} data */
// export const renderInlineMatch = (data) => html`
//     <div class="col-12 col-md-6 row justify-content-start text-start align-content-center">
//         <div class="col-5">
//             ${avatarLink(data.player_one)}
//         </div>
//         <div class="col-2">
//             ${renderCardInfo('VS')}
//         </div>
//         <div class="col-4">
//             ${avatarLink(data.player_two)}
//         </div>
//     </div>
// `
    // <div class="col-12 col-md-6  text-sm-start d-flex justify-content-center align-items-center">
    //     ${avatarLink(data.player_one)}
    //     ${renderCardInfo('VS', '')}
    //     ${avatarLink(data.player_two)}
    // </div>