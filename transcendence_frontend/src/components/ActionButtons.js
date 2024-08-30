import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { sessionService } from '../services/api/API.js';
import BsButton from './bootstrap/BsButton.js';

/**
 * @typedef {"primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark" | "link"} BsBtnColor
 */
/**
 * @typedef {"lock"
 *          | "unlock"
 *          | "user-plus"
 *          | "user-xmark"
 *          | "xmark"
 *          | "check"
 *          | "ellipsis-vertical"
 *          | "gamepad"} FaIconList
 */

/**
 * @typedef {object} ActionBtnData
 * @property {BsBtnColor} [color]
 * @property {FaIconList} [icon]
 * @property {string} [text]
 * @property {string} [label]
 * @property {string} [radius]
 * @property {boolean} [dropdownitem]
 * @property {boolean} [stretch]
 * @property {boolean} [showText]
 * @property {boolean} [outline]
 * @property {()=>void} [cb]
 * @property {BaseElement} [host]
 */

/**
 * @typedef {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral} TplLit
 */

/**
 * @param {any} handler
 * @param {ActionBtnData} defConf
 * @param {ActionBtnData} [conf]
 * @returns {TplLit}
 */
export const getBtn = (handler, defConf, conf) => {
    // console.log('get acion gtn');
    if (!conf) conf = {};
    const asyncHandler = async () => {
        console.log('action btn clicked');
        await handler();
        if (!conf.host && conf.cb && typeof conf.cb === 'function') conf.cb();
        if (conf.host && !conf.cb && conf.host instanceof BaseElement)
            conf.host.requestUpdate();
    };
    const show = conf.showText ?? defConf.showText;
    const text = show ? conf.text ?? defConf.text ?? '' : '';
    
    const color = conf.color ?? defConf.color ?? "success";
    const icon = conf.icon ?? defConf.icon ?? "check";
    const radius = conf.radius ?? defConf.radius ?? "3";
    const outline = conf.outline ?? defConf.outline ?? true;
    const dropdownitem = conf.dropdownitem ?? false;
    const stretch = conf.stretch ?? false;
    const label = conf.label ?? defConf.label ?? 'click Button';
    console.log('LABEL: ', label);
    

    return html`
    <bs-button
      ._async_handler=${asyncHandler}
      color="${color}"
      icon="${icon}"
      radius="${radius}"
      ?outline=${outline}
      loadingText="${text}"
      text="${text}"
      ?dropdownitem="${dropdownitem}"
      ?stretch="${stretch}"
      label="${label}"
    >
    </bs-button>
  `;
};


/** @type {ActionBtnData} */
const defaultConf = {
    color: 'dark',
    icon: 'check',
    text: '',
    radius: '3',
    showText: true,
    outline: true,
}

/**
 * @typedef {Object} DefaultConfigs
 * @property {ActionBtnData} block
 * @property {ActionBtnData} unblock
 * @property {ActionBtnData} addFriend
 * @property {ActionBtnData} removeFriend
 * @property {ActionBtnData} acceptReq
 * @property {ActionBtnData} rejectReq
 * @property {ActionBtnData} cancelReq
 * @property {ActionBtnData} sendGameInvite
 * @property {ActionBtnData} pushRes
 */

/** @type {DefaultConfigs} */
export const configs = {
    block: {...defaultConf, label: 'Block User', text: "block", color: "danger", icon: "lock" },
    unblock: {...defaultConf, label: 'Unblock User', text: "unblock", color: "success", icon: "unlock" },
    addFriend: {...defaultConf, label: 'Add User as a Friend', text: "add", color: "dark", icon: "user-plus" },
    removeFriend: {...defaultConf, label: 'Remove Friend', text: "remove", color: "danger", icon: "user-xmark" },
    acceptReq: {...defaultConf, label: 'Accept Request', text: "accept", color: "success", icon: "check" },
    rejectReq: {...defaultConf, label: 'Reject Request', text: "reject", color: "danger", icon: "xmark" },
    cancelReq: {...defaultConf, label: 'Cancel Request', text: "cancel", color: "danger", icon: "xmark" },

    sendGameInvite: {...defaultConf, label: 'send 1vs1 game invitation', text: "invite to a match", color: "primary", icon: "gamepad", showText: true },
    pushRes: {...defaultConf, label: 'push random results', text: "push random results", color: "success", icon: "check", showText: true },
}

/**
 * @typedef {Object} ActionButtons
 * @property {(id: number, conf?: ActionBtnData) => TplLit} unBlockUser
 * @property {(id: number, conf?: ActionBtnData) => TplLit} blockUser
 * @property {(id: number, conf?: ActionBtnData) => TplLit} sendFriendRequest
 * @property {(id: number, conf?: ActionBtnData) => TplLit} removeFriend
 * @property {(id: number, conf?: ActionBtnData) => TplLit} cancelFriendRequest
 * @property {(id: number, conf?: ActionBtnData) => TplLit} acceptFriendRequest
 * @property {(id: number, conf?: ActionBtnData) => TplLit} rejectFriendRequest
 * @property {(id: number, conf?: ActionBtnData) => TplLit} sendGameInvitation
 * @property {(id: number, conf?: ActionBtnData) => TplLit} cancelGameInvitation
 * @property {(id: number, conf?: ActionBtnData) => TplLit} acceptGameInvitation
 * @property {(id: number, conf?: ActionBtnData) => TplLit} rejectGameInvitation
 * @property {(id: number, conf?: ActionBtnData) => TplLit} pushRandomGameResult
 */

/** @type {ActionButtons} */
export const actions = {
    unBlockUser: (userId, conf) =>
        getBtn(sessionService.handleUser.bind(sessionService, "unblock-user", userId), configs.unblock, conf),
    blockUser: (userId, conf) =>
        getBtn(sessionService.handleUser.bind(sessionService, "block-user", userId), configs.block, conf),
    sendFriendRequest: (userId, conf) =>
        getBtn(sessionService.handleUser.bind(sessionService, "add-friend", userId), configs.addFriend, conf),
    removeFriend: (userId, conf) =>
        getBtn(sessionService.handleUser.bind(sessionService, "remove-friend", userId), configs.removeFriend, conf),
    cancelFriendRequest: (requestId, conf) =>
        getBtn(sessionService.handleRequest.bind(sessionService, "friend-cancel", requestId),  {...configs.cancelReq, label: 'cancel friend request'}, conf),
    acceptFriendRequest: (requestId, conf) =>
        getBtn(sessionService.handleRequest.bind(sessionService, "friend-accept", requestId), {...configs.acceptReq, label: 'accept friend request'}, conf),
    rejectFriendRequest: (requestId, conf) =>
        getBtn(sessionService.handleRequest.bind(sessionService, "friend-reject", requestId), {...configs.rejectReq, label: 'reject friend request'}, conf),
    sendGameInvitation: (userId, conf) =>
        getBtn(sessionService.sendGameInvitation.bind(sessionService, userId),configs.sendGameInvite, conf),
    cancelGameInvitation: (invitationId, conf) =>
        getBtn(sessionService.handleRequest.bind(sessionService, "game-cancel", invitationId), {...configs.cancelReq, label: 'cancel game invitation'}, conf),
    acceptGameInvitation: (invitationId, conf) =>
        getBtn(sessionService.handleRequest.bind(sessionService, "game-accept", invitationId), {...configs.acceptReq, label: 'accept game invitation'}, conf),
    rejectGameInvitation: (invitationId, conf) =>
        getBtn(sessionService.handleRequest.bind(sessionService, "game-reject", invitationId), {...configs.rejectReq, label: 'reject game invitation'}, conf),
    pushRandomGameResult: (scheduleId, conf) =>
        getBtn(sessionService.finishGameUpdateData.bind(sessionService, scheduleId), configs.pushRes, conf),
};


/**
 * @typedef {Object} ActionButtonGroups
 * @property {(id: number, showText: boolean, host?: BaseElement) => TplLit} receivedGameInvitation
 * @property {(id: number, showText: boolean, host?: BaseElement) => TplLit} receivedFriendInvitation
 */

/** @type {ActionButtonGroups} */
export const actionButtonGroups = {
    receivedGameInvitation: (invitationId, showText, host) => html`
        <div>
            ${actions.acceptGameInvitation(invitationId, { showText, host })}
            ${actions.rejectGameInvitation(invitationId, { showText, host })}
        </div>
    `,
    receivedFriendInvitation: (requestId, showText, host) => html`
        <div>
            ${actions.acceptFriendRequest(requestId, { showText })}
            ${actions.rejectFriendRequest(requestId, { showText })}
        </div>
    `
}


/**
 * @param {string} label
 * @param {ActionBtnData} conf
 * @param {Array<TplLit>} actions
 * @returns {TplLit}
 */
export const renderDropdown = (label, conf, actions) => {
    const color = `btn-${conf.outline ? 'outline-' : ''}${conf.color ?? 'primary'}`;
    return html`
    <div class="dropdown">
        <button
            class="btn ${color} mx-1"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="${label}"
        >
            ${conf.icon ? html`<i class="fa-solid fa-fw fa-${conf.icon}"></i>` : ''}
            ${conf.text ?? ''}
        </button>
        <ul class="dropdown-menu">
            ${actions && actions instanceof Array ? actions.map((action) => html`<li>${action}</li>`) : ''}
        </ul>
    </div>
  `;
};


// cb: () => {
//     router.redirect(`/profile/${data.id}`);
// },

/**
 * @typedef {import('../lib_templ/BaseElement.js').BaseElement} BE
 */

/**
 * @typedef {Object} ActionButtonDropdowns
 * @property {(id: number, cb?: () => void) => TplLit} friendActions
 * @property {(id: number, cb?: () => void) => TplLit} userActions
 */
/** @type {ActionButtonDropdowns} */
export const actionButtonDropdowns = {
    friendActions: (userId, cb) =>
        renderDropdown('Toggle Friend Actions', {...defaultConf, icon: "ellipsis-vertical"},
            [
                actions.removeFriend( userId, { dropdownitem: true, cb} ),
                actions.blockUser( userId, { dropdownitem: true, cb }),
            ]
        ),
    userActions: (userId, cb) =>
        renderDropdown('Toggle Non Friend Actions', {...defaultConf, icon: "ellipsis-vertical"},
            [
                actions.blockUser( userId, { dropdownitem: true, cb }),
            ]
        )
}

// /**
//  * @typedef {object} ActionBtnData
//  * @property {string} [color]
//  * @property {string} [icon]
//  * @property {string} [text]
//  * @property {string} [radius]
//  * @property {boolean} [dropdownitem]
//  * @property {boolean} [stretch]
//  * @property {boolean} [showText]
//  * @property {boolean} [outline]
//  * @property {string} [loadingText]
//  * @property {()=>void} [cb]
//  * @property {BaseElement} [host]
//  */

// /**
//  * @param {any} handler
//  * @param {ActionBtnData} conf
//  * @param {ActionBtnData} defConf
//  * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//  */
// const getBtn = (handler, conf, defConf) => {
//     const asyncHandler = async () => {
//         await handler();
//         if (!conf.host && conf.cb && typeof conf.cb === 'function') conf.cb();
//         if (conf.host && !conf.cb && conf.host instanceof BaseElement)
//             conf.host.requestUpdate();
//     };
//     let text;
//     if (conf.showText || (conf.showText === undefined && defConf.showText))
//         text = conf.text ?? defConf.text;
//     else text = '';
//     if (conf.showText || (conf.showText === undefined && defConf.showText))
//         text = conf.text ?? defConf.text;
//     else text = '';
//     let loadingText;
//     if (conf.showText || (conf.showText === undefined && defConf.showText))
//         loadingText = conf.loadingText ?? defConf.loadingText;
//     else loadingText = '';
//     if (conf.showText || (conf.showText === undefined && defConf.showText))
//         loadingText = conf.loadingText ?? defConf.loadingText;
//     else loadingText = '';
//     const color = conf.color ?? defConf.color;
//     const icon = conf.icon ?? defConf.icon;
//     const radius = conf.radius ?? defConf.radius;
//     const outline = conf.outline ?? defConf.outline;
//     const dropdownitem = conf.dropdownitem ?? '';
//     const stretch = conf.stretch ?? '';

//     return html`
//     <bs-button
//       ._async_handler=${asyncHandler}
//       color="${color}"
//       icon="${icon}"
//       radius="${radius}"
//       ?outline=${outline}
//       loadingText="${loadingText}"
//       text="${text}"
//       ?dropdownitem="${dropdownitem}"
//       ?stretch="${stretch}"
//     >
//     </bs-button>
//   `;
// };

// /**
//  *
//  *
//  * @param {ActionBtnData} conf
//  * @param {Array<import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral>} actions
//  * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//  */
// export const renderDropdow = (conf, actions) => {
//     const color = `btn-${conf.outline ? 'outline-' : ''}${conf.color ?? 'primary'}`;
//     return html`
//     <div class="dropdown">
//       <button
//         class="btn ${color} "
//         ?outline=${conf.outline}
//         type="button"
//         data-bs-toggle="dropdown"
//         aria-expanded="false"
//       >
//         ${conf.icon ? html`<i class="fa-solid fa-fw fa-${conf.icon}"></i>` : ''}
//         ${conf.text ?? ''}
//       </button>
//       <ul class="dropdown-menu">
//         ${actions && actions instanceof Array ?
//             actions.map((action) => html`<li>${action}</li>`)
//             : ''}
//       </ul>
//     </div>
//   `;
// };

// export const actions = {
//     /**
//      * @param {number} userId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     unBlockUser: (userId, conf) =>
//         getBtn(sessionService.unblockUser.bind(sessionService, userId), conf, {
//             color: 'success',
//             icon: 'unlock',
//             text: 'unblock user',
//             loadingText: 'unblock user',
//             radius: '3',
//             showText: true,
//             outline: false,
//         }),
//     /**
//      * @param {number} userId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     blockUser: (userId, conf) =>
//         getBtn(sessionService.blockUser.bind(sessionService, userId), conf, {
//             color: 'danger',
//             icon: 'lock',
//             text: 'block user',
//             loadingText: 'block user',
//             radius: '3',
//             showText: true,
//             outline: true,
//         }),
//     /**
//      * @param {number} userId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     sendFriendRequest: (userId, conf) =>
//         getBtn(
//             sessionService.sendFriendRequest.bind(sessionService, userId),
//             conf,
//             {
//                 color: 'dark',
//                 icon: 'user-plus',
//                 text: 'add',
//                 loadingText: 'add',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} userId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     removeFriend: (userId, conf) =>
//         getBtn(sessionService.removeFriend.bind(sessionService, userId), conf, {
//             color: 'danger',
//             icon: 'user-xmark',
//             text: 'remove friend',
//             loadingText: 'remove friend',
//             radius: '3',
//             showText: true,
//             outline: true,
//         }),
//     /**
//      * @param {number} requestId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     cancelFriendRequest: (requestId, conf) =>
//         getBtn(
//             sessionService.cancelFriendRequest.bind(sessionService, requestId),
//             conf,
//             {
//                 color: 'danger',
//                 icon: 'xmark',
//                 text: 'cancel',
//                 loadingText: 'cancel',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} requestId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     acceptFriendRequest: (requestId, conf) =>
//         getBtn(
//             sessionService.acceptFriendRequest.bind(sessionService, requestId),
//             conf,
//             {
//                 color: 'success',
//                 icon: 'check',
//                 text: 'accept',
//                 loadingText: 'accept',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} requestId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     rejectFriendRequest: (requestId, conf) =>
//         getBtn(
//             sessionService.rejectFriendRequest.bind(sessionService, requestId),
//             conf,
//             {
//                 color: 'danger',
//                 icon: 'xmark',
//                 text: 'reject',
//                 loadingText: 'reject',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} userId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     sendGameInvitation: (userId, conf) =>
//         getBtn(
//             sessionService.sendGameInvitation.bind(sessionService, userId),
//             conf,
//             {
//                 color: 'warning',
//                 icon: 'gamepad',
//                 text: 'play',
//                 loadingText: 'play',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} invitationId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     cancelGameInvitation: (invitationId, conf) =>
//         getBtn(null, conf, {
//             color: 'danger',
//             icon: 'xmark',
//             text: 'block',
//             loadingText: 'block',
//             radius: '3',
//             showText: true,
//             outline: true,
//         }),
//     /**
//      * @param {number} invitationId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     acceptGameInvitation: (invitationId, conf) =>
//         getBtn(
//             sessionService.acceptGameInvitation.bind(sessionService, invitationId),
//             conf,
//             {
//                 color: 'success',
//                 icon: 'check',
//                 text: 'accept',
//                 loadingText: 'accept',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} invitationId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     rejectGameInvitation: (invitationId, conf) =>
//         getBtn(
//             sessionService.rejectGameInvitation.bind(sessionService, invitationId),
//             conf,
//             {
//                 color: 'danger',
//                 icon: 'xmark',
//                 text: 'reject',
//                 loadingText: 'reject',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
//     /**
//      * @param {number} scheduleId
//      * @param {ActionBtnData} conf
//      * @returns {import('../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     startGame: (scheduleId, conf) =>
//         getBtn(
//             sessionService.startGameByScheduleId.bind(sessionService, scheduleId),
//             conf,
//             {
//                 color: 'primary',
//                 icon: 'gamepad',
//                 text: 'start Match',
//                 loadingText: 'start Match',
//                 radius: '3',
//                 showText: true,
//                 outline: true,
//             },
//         ),
// };

// actions.receivedGameInvitations = (invitationId, showText) => html`
//   <div>
//     ${actions.acceptGameInvitation(invitationId, { showText })}
//     ${actions.rejectGameInvitation(invitationId, { showText })}
//   </div>
// `;
