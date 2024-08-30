import { BaseElement } from '../BaseElement.js';
import { NotFoundComp, InvalidComp } from './routerDefaults.js';

// /**
//  * Beschreibt ein Objekt, das eine Route in einer Anwendung darstellt.
//  * @typedef {object} Route
//  * @property {string} path - Der Pfad der Route.
//  * @property {string} title - Der Pfad der Route.
//  * @property {string} component - Der Name des Komponenten, der mit dieser Route verknüpft ist.
//  * @property {Array<string>} [segments]
//  */

// export default class Router {
//     static #fadeDuration = 100;

//     /** @type {Route} */
//     static componentDefault404 = {
//         component: 'router-default-not-found',
//         title: '404 Not Found',
//         path: '',
//     };

//     static componentinvalidComponent = {
//         component: 'router-invalid-web-component',
//         title: 'INVALID COMPONENT',
//         path: '',
//     };

//     static makeRedirect = Symbol('router-make-redirect');

//     /** @type {Array<Route> | undefined} */
//     #routes;

//     /** @type {BaseElement | HTMLElement | undefined} */
//     #root;

//     /** @param {Array<Route>} routes */
//     constructor(routes) {
//         this.#setRoutes(routes);
//     }

//     /** @param {Array<Route>} routes  */
//     #setRoutes(routes) {
//         this.#routes = routes;
//         routes.forEach((route) => {
//             const routeSegments = route.path.split('/').slice(1);
//             routeSegments.forEach((segment) => {
//                 if (segment[0] === ':') {
//                     Object.defineProperty(route, segment.slice(1), {
//                         writable: true,
//                     });
//                 }
//             });
//             route.segments = routeSegments;
//         });
//     }

//     #isInit = false;

//     /** @param {string} rootElem */
//     init(rootElem) {
//         if (this.#isInit) return;
//         window.addEventListener('click', (e) => {
//             const target = e.composedPath()[0];
//             if (target instanceof HTMLElement) {
//                 let href;
//                 const rootNode = target.getRootNode();
//                 if (target instanceof HTMLAnchorElement)
//                     href = target.getAttribute('href');
//                 else if (target.closest('a'))
//                     href = target.closest('a')?.getAttribute('href');
//                 else if (
//                     rootNode instanceof ShadowRoot &&
//                     rootNode.host.closest('a')
//                 )
//                     href = rootNode.host.closest('a')?.getAttribute('href');
//                 if (href) {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     this.go(href);
//                 }
//             }
//         });
//         window.addEventListener('popstate', (event) => {
//             // console.log("popstate!")
//             if (!event.state?.route) {
//                 // // console.log("no prev entry: go to '/'");
//                 this.go('/', false);
//             } else {
//                 this.go(event.state.route, false, true);
//             }
//         });
//         // // console.log("router: mount root component")
//         this.#root = document.createElement(rootElem);
//         document.body.appendChild(this.#root);
//         // document.dispatchEvent()
//         // // // console.log("first path: ", location.pathname);
//         // // console.log("router, go on init");
//         this.go(window.location.pathname, false);
//     }

//     /**
//      * @param {Array<string>} urlSegments
//      * @param {{ [x: string]: string; } | {}} params
//      * @returns {Route | undefined}
//      */
//     #findRoute(urlSegments, params) {
//         const match = this.#routes?.find((route) => {
//             // // // console.log("FIND ROUTE: route: ", route, " | urlSegments: ", urlSegments);
//             if (route.segments?.length !== urlSegments.length) {
//                 return false;
//             }
//             const isMatch = route.segments.every((segment, i) => {
//                 // // // console.log("evetry segment: seg1: ", segment, " | seg2: ", urlSegments[i], " | equal? ", segment === urlSegments[i]);
//                 // // console.log("segments: ", segment);
//                 if (segment[0] === ':') {
//                     route[segment.slice(1)] = decodeURIComponent(
//                         urlSegments[i],
//                     );
//                     params[segment.slice(1)] = decodeURIComponent(
//                         urlSegments[i],
//                     );
//                     // // console.log("new param route obj: ", route);
//                 }
//                 return segment === urlSegments[i] || segment[0] === ':';
//             });
//             // // // console.log("is Match? ", isMatch);
//             return isMatch;
//         });
//         return match;
//     }

//     static toggleHistoryState(route, addToHistory) {
//         if (addToHistory) {
//             // // console.log("ROUTER Push State, current history: ", history.state);
//             window.history.pushState({ route }, '', route);
//             // // console.log("ROUTER Push State, new history: ", history.state);
//         } else if (!addToHistory) {
//             // console.log("ROUTER REPLACE, current history: ", history.state);
//             window.history.replaceState({ route }, '', route);
//             // // console.log("ROUTER REPLACE, new history: ", history.state);
//         }
//     }

//     getOutlet = () => this.#root?.querySelector('#root-outlet');

//     /**
//      * @param {HTMLElement} component
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      * @returns {Promise<boolean>}
//      */
//     async mountComp(component, route, params, url) {
//         let val;
//         if (component instanceof BaseElement &&typeof component.onBeforeMount === 'function') {
//             val = await component.onBeforeMount(route, params, url);
//             if (val === Router.makeRedirect) {
//                 return false;
//             }
//         }
//         this.getOutlet()?.appendChild(component);
//         if (component instanceof BaseElement && typeof component.onAfterMount === 'function') {
//             await component.onAfterMount(route);
//         }
//         return true;
//     }

//     /**
//      * @param {HTMLElement} component
//      * @param {string} route
//      */
//     async unmountComp(component, route) {
//         const firstChildElem = this.getOutlet()?.firstElementChild;
//         if (!firstChildElem) return;
//         if (component instanceof BaseElement && typeof component.onBeforeUnMount === 'function')
//             component.onBeforeUnMount();
//         firstChildElem.remove();
//         if (component instanceof BaseElement && typeof component.onAfterUnMount === 'function')
//             component.onAfterUnMount();
//     }

//     /**
//      * @param {string | URL | null | undefined} route
//      * @returns {Promise<symbol>}
//      */
//     async redirect(route) {
//         window.history.replaceState({ route }, '', route);
//         if (typeof route === 'string') this.go(route, false);
//         return Router.makeRedirect;
//     }

//     /**
//      * @param {string} route
//      * @param {boolean} addToHistory
//      * @param {boolean} isFromHistory
//      */
//     async go(route, addToHistory = true, isFromHistory = false) {
//         // console.log('router go!, curr scroll: ', window.history.scrollRestoration);
//         if (!this.#isInit) this.#isInit = true;

//         const url = new URL(route, window.location.origin);
//         route = url.pathname;

       

//         let component;
//         const params = {};
//         const urlSegments = route.split('/').slice(1);
//         let matchObj = this.#findRoute(urlSegments, params);

//         // console.log('matchObj Router: ', matchObj);
//         if (this.#root instanceof BaseElement) {
//             await this.#root.onRouteChange(route, params, url);
//         }

//         if (!matchObj) matchObj = Router.componentDefault404;
//         component = document.createElement(matchObj.component);
//         if (!component) {
//             matchObj = Router.componentinvalidComponent;
//             component = document.createElement(matchObj.component);
//         }
//         Router.toggleHistoryState(route, addToHistory);
//         document.title = matchObj.title;

        
        

//         const curr = this.getOutlet()?.firstElementChild;
//         if (!curr) {
//             this.mountComp(component, route, params, url);
//         }else if (curr?.tagName === component.tagName
//             && curr instanceof BaseElement
//             && typeof curr.onRouteChange === 'function') {
//             await curr.onRouteChange(route, params, url);
//         } else {
//             const fadeOut = curr.animate([{ opacity: 1 }, { opacity: 0 }], {
//                 duration: Router.#fadeDuration,
//             });
//             fadeOut.addEventListener('finish', () => {
//                 if (curr instanceof HTMLElement)
//                 this.unmountComp(curr, route);
//                 if (!this.mountComp(component, route, params, url)) return;
//                 component.animate([{ opacity: 0 }, { opacity: 1 }], {
//                     duration: Router.#fadeDuration,
//                 });
//             });
//         }
//         if (!isFromHistory) {
//             // console.log('scroll to topp!!!');
//             window.scrollTo({left: 0, top: 0, behavior: "auto"});
//         } else {
//             // console.log('no scroll! from history');
//         }
//     }
// }

/**
 * Beschreibt ein Objekt, das eine Route in einer Anwendung darstellt.
 * @typedef {object} Route
 * @property {string} path - Der Pfad der Route.
 * @property {string} title - Der Pfad der Route.
 * @property {string} component - Der Name des Komponenten, der mit dieser Route verknüpft ist.
 * @property {Array<string>} [segments]
 */

export default class Router {
    static #fadeDuration = 100;

    /** @type {Route} */
    static componentDefault404 = {
        component: 'router-default-not-found',
        title: '404 Not Found',
        path: '',
    };

    static componentinvalidComponent = {
        component: 'router-invalid-web-component',
        title: 'INVALID COMPONENT',
        path: '',
    };

    static makeRedirect = Symbol('router-make-redirect');

    /** @type {Array<Route> | undefined} */
    #routes;

    /** @type {BaseElement | HTMLElement | undefined} */
    #root;

    /** @param {Array<Route>} routes */
    constructor(routes) {
        this.#setRoutes(routes);
    }

    /** @param {Array<Route>} routes  */
    #setRoutes(routes) {
        this.#routes = routes;
        routes.forEach((route) => {
            const routeSegments = route.path.split('/').slice(1);
            routeSegments.forEach((segment) => {
                if (segment[0] === ':') {
                    Object.defineProperty(route, segment.slice(1), {
                        writable: true,
                    });
                }
            });
            route.segments = routeSegments;
        });
    }

    #isInit = false;

    /** @param {string} rootElem */
    init(rootElem) {
        if (this.#isInit) return;
        window.addEventListener('click', (e) => {
            const target = e.composedPath()[0];
            if (target instanceof HTMLElement) {
                let href;
                const rootNode = target.getRootNode();
                if (target instanceof HTMLAnchorElement)
                    href = target.getAttribute('href');
                else if (target.closest('a'))
                    href = target.closest('a')?.getAttribute('href');
                else if (
                    rootNode instanceof ShadowRoot &&
                    rootNode.host.closest('a')
                )
                    href = rootNode.host.closest('a')?.getAttribute('href');
                if (href) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.go(href);
                }
            }
        });
        window.addEventListener('popstate', (event) => {
            console.log("popstate!")
            if (!event.state?.route) {
                // // console.log("no prev entry: go to '/'");
                this.go('/', false);
            } else {
                this.go(event.state.route, false, true);
            }
        });
        // // console.log("router: mount root component")
        this.#root = document.createElement(rootElem);
        document.body.appendChild(this.#root);
        // document.dispatchEvent()
        // // // console.log("first path: ", location.pathname);
        // // console.log("router, go on init");
        this.go(window.location.pathname, false);
    }

    /**
     * @param {Array<string>} urlSegments
     * @param {{ [x: string]: string; } | {}} params
     * @returns {Route | undefined}
     */
    #findRoute(urlSegments, params) {
        const match = this.#routes?.find((route) => {
            // // // console.log("FIND ROUTE: route: ", route, " | urlSegments: ", urlSegments);
            if (route.segments?.length !== urlSegments.length) {
                return false;
            }
            const isMatch = route.segments.every((segment, i) => {
                // // // console.log("evetry segment: seg1: ", segment, " | seg2: ", urlSegments[i], " | equal? ", segment === urlSegments[i]);
                // // console.log("segments: ", segment);
                if (segment[0] === ':') {
                    route[segment.slice(1)] = decodeURIComponent(
                        urlSegments[i],
                    );
                    params[segment.slice(1)] = decodeURIComponent(
                        urlSegments[i],
                    );
                    // // console.log("new param route obj: ", route);
                }
                return segment === urlSegments[i] || segment[0] === ':';
            });
            // // // console.log("is Match? ", isMatch);
            return isMatch;
        });
        return match;
    }

    static toggleHistoryState(route, addToHistory) {
        if (addToHistory) {
            // // console.log("ROUTER Push State, current history: ", history.state);
            window.history.pushState({ route }, '', route);
            // // console.log("ROUTER Push State, new history: ", history.state);
        } else if (!addToHistory) {
            // console.log("ROUTER REPLACE, current history: ", history.state);
            window.history.replaceState({ route }, '', route);
            // // console.log("ROUTER REPLACE, new history: ", history.state);
        }
    }

    getOutlet = () => this.#root?.querySelector('#root-outlet');

    /**
     * @param {HTMLElement} component
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {boolean}
     */
    mountComp(component, route, params, url) {
        let val;
        if (component instanceof BaseElement &&typeof component.onBeforeMount === 'function') {
            val = component.onBeforeMount(route, params, url);
            // if (val === Router.makeRedirect) {
            //     return false;
            // }
        }
        this.getOutlet()?.appendChild(component);
        if (component instanceof BaseElement && typeof component.onAfterMount === 'function') {
            component.onAfterMount(route);
        }
        return true;
    }

    /**
     * @param {HTMLElement} component
     * @param {string} route
     */
    unmountComp(component, route) {
        const firstChildElem = this.getOutlet()?.firstElementChild;
        if (!firstChildElem) return;
        if (component instanceof BaseElement && typeof component.onBeforeUnMount === 'function')
            component.onBeforeUnMount();
        firstChildElem.remove();
        if (component instanceof BaseElement && typeof component.onAfterUnMount === 'function')
            component.onAfterUnMount();
    }

    /**
     * @param {string | URL | null | undefined} route
     * @returns {symbol}
     */
    redirect(route) {
        window.history.replaceState({ route }, '', route);
        if (typeof route === 'string') this.go(route, false);
        return Router.makeRedirect;
    }

    /**
     * @param {string} route
     * @param {boolean} addToHistory
     * @param {boolean} isFromHistory
     */
    go(route, addToHistory = true, isFromHistory = false) {
        console.log('router go to: ', route);
        if (!this.#isInit) this.#isInit = true;

        const url = new URL(route, window.location.origin);
        route = url.pathname;

       

        let component;
        const params = {};
        const urlSegments = route.split('/').slice(1);
        let matchObj = this.#findRoute(urlSegments, params);

        // console.log('matchObj Router: ', matchObj);
        if (this.#root instanceof BaseElement) {
            this.#root.onRouteChange(route, params, url);
        }

        if (!matchObj) matchObj = Router.componentDefault404;
        component = document.createElement(matchObj.component);
        if (!component) {
            matchObj = Router.componentinvalidComponent;
            component = document.createElement(matchObj.component);
        }
        Router.toggleHistoryState(route, addToHistory);
        document.title = matchObj.title;

        
        

        const curr = this.getOutlet()?.firstElementChild;
        if (!curr) {
            this.mountComp(component, route, params, url);
        }else if (curr?.tagName === component.tagName
            && curr instanceof BaseElement
            && typeof curr.onRouteChange === 'function') {
            curr.onRouteChange(route, params, url);
        } else if (curr instanceof HTMLElement) {
            this.unmountComp(curr, route);
            this.mountComp(component, route, params, url)
        }
        if (!isFromHistory) {
            // console.log('scroll to topp!!!');
            window.scrollTo({left: 0, top: 0, behavior: 'auto'});
        } else {
            // console.log('no scroll! from history');
        }
    }
}

// /**
//  * Beschreibt ein Objekt, das eine Route in einer Anwendung darstellt.
//  * @typedef {object} Route
//  * @property {string} path - Der Pfad der Route.
//  * @property {string} title - Der Pfad der Route.
//  * @property {string} component - Der Name des Komponenten, der mit dieser Route verknüpft ist.
//  * @property {Array<string>} [segments]
//  */

// export default class Router {
//     static #fadeDuration = 100;

//     /** @type {Route} */
//     static componentDefault404 = {
//         component: 'router-default-not-found',
//         title: '404 Not Found',
//         path: '',
//     };

//     static componentinvalidComponent = {
//         component: 'router-invalid-web-component',
//         title: 'INVALID COMPONENT',
//         path: '',
//     };

//     static makeRedirect = Symbol('router-make-redirect');

//     /** @type {Array<Route> | undefined} */
//     #routes;

//     /** @type {BaseElement | HTMLElement | undefined} */
//     #root;

//     /** @param {Array<Route>} routes */
//     constructor(routes) {
//         this.#setRoutes(routes);
//     }

//     /** @param {Array<Route>} routes  */
//     #setRoutes(routes) {
//         this.#routes = routes;
//         routes.forEach((route) => {
//             const routeSegments = route.path.split('/').slice(1);
//             routeSegments.forEach((segment) => {
//                 if (segment[0] === ':') {
//                     Object.defineProperty(route, segment.slice(1), {
//                         writable: true,
//                     });
//                 }
//             });
//             route.segments = routeSegments;
//         });
//     }

//     #isInit = false;

//     /** @param {string} rootElem */
//     init(rootElem) {
//         if (this.#isInit) return;
//         window.addEventListener('click', (e) => {
//             const target = e.composedPath()[0];
//             if (target instanceof HTMLElement) {
//                 let href;
//                 const rootNode = target.getRootNode();
//                 if (target instanceof HTMLAnchorElement)
//                     href = target.getAttribute('href');
//                 else if (target.closest('a'))
//                     href = target.closest('a')?.getAttribute('href');
//                 else if (
//                     rootNode instanceof ShadowRoot &&
//                     rootNode.host.closest('a')
//                 )
//                     href = rootNode.host.closest('a')?.getAttribute('href');
//                 if (href) {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     this.go(href);
//                 }
//             }
//         });
//         window.addEventListener('popstate', (event) => {
// //             // console.log("popstate!")
//             if (!event.state?.route) {
// //                 // console.log("no prev entry: go to '/'");
//                 this.go('/', false);
//             } else {
//                 this.go(event.state.route, false);
//             }
//         });
// //         // console.log("router: mount root component")
//         this.#root = document.createElement(rootElem);
//         document.body.appendChild(this.#root);
//         // document.dispatchEvent()
// //         // // console.log("first path: ", location.pathname);
// //         // console.log("router, go on init");
//         this.go(window.location.pathname, false);
//     }

//     /**
//      * @param {Array<string>} urlSegments
//      * @param {{ [x: string]: string; } | {}} params
//      * @returns {Route | undefined}
//      */
//     #findRoute(urlSegments, params) {
//         const match = this.#routes?.find((route) => {
// //             // // console.log("FIND ROUTE: route: ", route, " | urlSegments: ", urlSegments);
//             if (route.segments?.length !== urlSegments.length) {
//                 return false;
//             }
//             const isMatch = route.segments.every((segment, i) => {
// //                 // // console.log("evetry segment: seg1: ", segment, " | seg2: ", urlSegments[i], " | equal? ", segment === urlSegments[i]);
// //                 // console.log("segments: ", segment);
//                 if (segment[0] === ':') {
//                     route[segment.slice(1)] = decodeURIComponent(
//                         urlSegments[i],
//                     );
//                     params[segment.slice(1)] = decodeURIComponent(
//                         urlSegments[i],
//                     );
// //                     // console.log("new param route obj: ", route);
//                 }
//                 return segment === urlSegments[i] || segment[0] === ':';
//             });
// //             // // console.log("is Match? ", isMatch);
//             return isMatch;
//         });
//         return match;
//     }

//     static toggleHistoryState(route, addToHistory, replace) {
//         if (addToHistory && !replace) {
// //             // console.log("ROUTER Push State, current history: ", history.state);
//             window.history.pushState({ route }, '', route);
// //             // console.log("ROUTER Push State, new history: ", history.state);
//         } else if (!addToHistory && replace) {
// //             // console.log("ROUTER REPLACE, current history: ", history.state);
//             window.history.replaceState({ route }, '', route);
// //             // console.log("ROUTER REPLACE, new history: ", history.state);
//         }
//     }

//     getOutlet = () => this.#root?.querySelector('#root-outlet');

//     /**
//      *
//      * @param {HTMLElement} component
//      * @param {string} route
//      * @param {object} params
//      * @returns {Promise<boolean>}
//      */
//     async mountComp(component, route, params) {
//         let val;
//         if (
//             component instanceof BaseElement &&
//             typeof component.onBeforeMount === 'function'
//         ) {
//             val = await component.onBeforeMount(route, params, this);
//             if (val === Router.makeRedirect) {
//                 return false;
//             }
//         }
//         this.getOutlet()?.appendChild(component);
//         if (
//             component instanceof BaseElement &&
//             typeof component.onAfterMount === 'function'
//         )
//             component.onAfterMount(route, this);
//         return true;
//     }

//     unmountComp(component, route) {
//         const firstChildElem = this.getOutlet()?.firstElementChild;
//         if (!firstChildElem) return;
//         if (typeof component.onBeforeUnMount === 'function')
//             component.onBeforeUnMount(route, this);
//         firstChildElem.remove();
//         if (typeof component.onAfterUnMount === 'function')
//             component.onAfterUnMount(route, this);
//     }

//     /**
//      * @param {string | URL | null | undefined} route
//      * @returns {symbol}
//      */
//     redirect(route) {
//         window.history.replaceState({ route }, '', route);
//         if (typeof route === 'string') this.go(route, false);
//         return Router.makeRedirect;
//     }

//     /**
//      * @param {string} route
//      * @param {boolean} addToHistory
//      * @param {boolean} replace
//      */
//     go(route, addToHistory = true, replace = false) {
// //         console.log('router go!, curr scroll: ', window.history.scrollRestoration);
//         if (!this.#isInit) this.#isInit = true;

//         const url = new URL(route, window.location.origin);
//         route = url.pathname;

//         if (this.#root instanceof BaseElement) {
//             this.#root.onRouteChange(route, url);
//         }

//         let component;
//         const params = {};
//         const urlSegments = route.split('/').slice(1);
//         let matchObj = this.#findRoute(urlSegments, params);
// //         console.log('matchObj Router: ', matchObj);
//         if (!matchObj) matchObj = Router.componentDefault404;
//         component = document.createElement(matchObj.component);
//         if (!component) {
//             matchObj = Router.componentinvalidComponent;
//             component = document.createElement(matchObj.component);
//         }
//         Router.toggleHistoryState(route, addToHistory, replace);
//         document.title = matchObj.title;

        
        

//         const curr = this.getOutlet()?.firstElementChild;
//         if (curr?.tagName === component.tagName) {
//             if (
//                 curr instanceof BaseElement &&
//                 typeof curr.onRouteChange === 'function'
//             ) {
//                 curr.onRouteChange(route, url);
//                 return;
//             }
//         }

//         if (!curr) {
//             this.mountComp(component, route, params);
//             return;
//         }

//         const fadeOut = curr.animate([{ opacity: 1 }, { opacity: 0 }], {
//             duration: Router.#fadeDuration,
//         });
//         fadeOut.addEventListener('finish', () => {
//             this.unmountComp(curr, route);
//             if (!this.mountComp(component, route, params)) return;
//             component.animate([{ opacity: 0 }, { opacity: 1 }], {
//                 duration: Router.#fadeDuration,
//             });
//         });
//     }
// }

// #appendNode(node, oldRoute, newRoute) {
//     const curr = this.#root.firstElementChild;
//     if (!curr) {
//         this.#root.appendChild(node);
//     }else if (curr.tagName === node.tagName && curr instanceof BaseElem && typeof curr["onRouteChange"] === "function") {
// // //         console.log("SAME NODE");
//         curr["onRouteChange"]();
//     } else {
//         let fadeOut = curr.animate([{opacity: 1}, {opacity: 0}],{ duration: 200});
//         fadeOut.addEventListener("finish", () => {
//             curr.remove();
//             this.#root.appendChild(node);
//             let fadeIn = node.animate([
//                 {opacity: 0}, {opacity: 1}
//             ],{ duration: 200});
//         });
//     }
// }

// go(route, addToHistory=true, replace=false) {
// // //     console.log("router, go: ", route);
//     const oldRoute = location.pathname;

//     let component;
//     const urlSegments = route.split("/").slice(1);
//     const matchObj = this.#findRoute(urlSegments);
//     if (matchObj) {
// // //         console.log("match found: ", matchObj)
//         component = document.createElement(matchObj.component);
//     }
//     if (component) {
// // //         console.log("component created");
//         let shouldAddToHistory;
//         if (!addToHistory && typeof component["beforeHistoryPush"] === "function")
//             shouldAddToHistory = component["beforeHistoryPush"]();
//         if (shouldAddToHistory)
//             addToHistory = shouldAddToHistory;
//         this.toggleHistoryState(route, addToHistory, replace);
//         this.#appendNode(component);
//         document.title = matchObj?.title ?? "Title";
//         if (typeof component["afterRouteMount"] === "function")
//             component["afterRouteMount"]();

//     } else {
//         component = document.createElement("template");
//         component.innerHTML = /*html*/`<div><h1>DOCUMENT NOT FOUND</h1></div>`.trim();
//         this.#appendNode(component.content?.firstChild?.cloneNode(true))
//         document.title = "Not Found";
//     }

// }
