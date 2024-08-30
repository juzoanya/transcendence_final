/**
 * @param {string} name
 * @returns {string | null}
 */
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === `${name}=`) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1),
                );
                break;
            }
        }
    }
    return cookieValue;
}
export const csrftoken = getCookie('csrftoken');

export const csrfHeader = new Headers();
if (csrftoken) csrfHeader.set('X-CSRFToken', csrftoken);

// const request = new Request( "/profile", { method: 'POST', headers, mode: 'same-origin' } );

// fetch(request).then(function(response) {
//     // ...
// });

// class Fetcher {
//     /** @param {Object} data  */
//     constructor(data) {
//         if (typeof data !== "object") throw new Error("invalid Data Object");
//     }
//     get() {

//     }
//     post() {

//     }
//     put() {

//     }
//     delete() {

//     }
// }
