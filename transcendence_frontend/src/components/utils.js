import { html } from '../lib_templ/BaseElement.js';

export const rRow = (classes, content) => html`
    <div class="row ${classes}">${content}</div>
`;

export const rCol = (classes, content) => html`
    <div class="${classes}">${content}</div>
`;

/**
 * @param {string} [date]
 */
export const humanizedDate = (date) => {
    // console.log('date: ', date);
    return date == undefined ? '-' : new Date(date).toLocaleDateString();
}


/**
 * @param {string} route 
 * @param {string} pathToCheckAgainst
 * @param {boolean} exact
 */
export function comparePath(route, pathToCheckAgainst, exact) {
    if (route.at(-1) === '/') {
        route = route.substring(0, route.length - 1);
    }
    if (exact) {
        return (route === pathToCheckAgainst);
    }
    return (route.slice(0, pathToCheckAgainst.length) === pathToCheckAgainst);
}