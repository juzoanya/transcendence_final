// import { BaseElement } from '../BaseElement.js';
import { BaseElement } from '../BaseElement.js';
import { NotFoundComp, InvalidComp } from './routerDefaults.js';


function assertParam(value, type) {
    let convertedValue;
    // console.log('assertParam: value: ', value, ', type: ', type);
    
    switch (type) {
        case 'int':
            convertedValue = Number(value);
            if (isNaN(convertedValue) || !Number.isInteger(convertedValue)) {
                throw new Error("Invalid int format");
            }
            break;
        case 'float':
            convertedValue = Number(value);
            if (isNaN(convertedValue)) {
                throw new Error("Invalid number format");
            }
            break;
        case 'boolean':
            if (value.toLowerCase() === 'true' || value === '1') {
                convertedValue = true;
            } else if (value.toLowerCase() === 'false' || value === '0') {
                convertedValue = false;
            } else {
                throw new Error("Invalid boolean format");
            }
            break;
        case 'date':
            convertedValue = new Date(value);
            if (isNaN(convertedValue.getTime())) {
                throw new Error("Invalid date format");
            }
            break;
        default:
            convertedValue = String(value);
            // throw new Error("Unsupported type specified");
    }

    return convertedValue;
}

const ANIMATION_TIME = 200

// /**
//  * Animates element to fade out.
//  * @param {HTMLElement} element - The element to fade out.
//  */
// function fadeOutElement(element) {
//     return element.animate([
//         { opacity: 1 },
//         { opacity: 0 }
//     ], {
//         duration: ANIMATION_TIME, // 300ms
//         fill: 'forwards' // Make sure animation stays at final state
//     }).finished;
// }

// /**
//  * Animates element to fade in.
//  * @param {HTMLElement} element - The element to fade in.
//  */
// function fadeInElement(element) {
//     element.style.opacity = '0'; // Set initial opacity for fadeIn
//     element.animate([
//         { opacity: 0 },
//         { opacity: 1 }
//     ], {
//         duration: ANIMATION_TIME, // 300ms
//         fill: 'forwards'
//     }).finished;
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
    static show404 = Symbol('router-page-not-found');

    /** @type {Array<Route> | undefined} */
    #routes;

    /** @type {BaseElement | HTMLElement | undefined} */
    #root;

    /** @param {Array<Route>} routes @param {string} [notFoundComponent] */
    constructor(routes, notFoundComponent) {
        if (notFoundComponent != undefined) {
            Router.componentDefault404.component = notFoundComponent;
        }
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

    /** @param {string} route  */
    async mountRootAndGoTo(route) {
        // console.log('remount root, init: ', this.#isInit);
        if (this.#root != undefined) {
            this.#root.remove();
        }
        this.#root = document.createElement(this.rootComponent ?? Router.componentinvalidComponent.component);
        if (this.#root == undefined) {
            this.#root = document.createElement(Router.componentinvalidComponent.component);
        }

        if ('beforeRootMount' in this.#root && typeof this.#root.beforeRootMount === 'function') {
            this.#root.beforeRootMount(new URL(route, window.location.origin));
        }

        document.body.appendChild(this.#root);

        if (this.#root instanceof BaseElement) {
            await this.#root.updateComplete;
        }
        this.go(route, false);
    }

    get isInitialized() {
        return this.#isInit;
    }


    /** @param {string} rootElem */
    async init(rootElem) {

        this.rootComponent = rootElem;

        if (this.#isInit)  {
            // console.log('was init, remount root');
            this.mountRootAndGoTo(window.location.href);
            return;
        }


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
            // console.log("popstate!")
            if (!event.state?.route) {
                // // console.log("no prev entry: go to '/'");
                this.go('/', false);
            } else {
                this.go(event.state.route, false, true);
            }
          
        });

        this.mountRootAndGoTo(window.location.href);
    }

    /**
     * @param {Array<string>} urlSegments
     * @param {{ [x: string]: string; } | {}} params
     * @returns {Route | undefined}
     */
    #findRoute(urlSegments, params) {
        const match = this.#routes?.find((route) => {
            // console.log("FIND ROUTE: route: ", route, " | urlSegments: ", urlSegments);
            // console.log("FIND ROUTE: route.segments?.length: ", route.segments?.length, " | urlSegments: ", urlSegments.length);
            
            if (route.segments?.length !== urlSegments.length) {
                return false;
            }
            const isMatch = route.segments.every((segment, i) => {
                // console.log("evetry segment: seg1: ", segment, " | seg2: ", urlSegments[i], " | equal? ", segment === urlSegments[i]);
                // console.log("segments: ", segment);
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

    checkSegment(segmentClientRoutes, segmentUri) {
        if (typeof segmentUri === 'string' && segmentUri.length > 0 && typeof segmentClientRoutes === 'string' && segmentClientRoutes.length > 0) {
            if (segmentClientRoutes[0] === ':') {
                const pattern = /:(\w+)\((\w+)\)/g;
                const match = pattern.exec(segmentClientRoutes);
                if (match !== null && match[1] != undefined && match[2] != undefined) {
                    try {
                        const param = assertParam(segmentUri, match[2]);
                        // console.log('returned param: ', param);
                        return [true, match[1], param];
                    } catch (error) {
                        console.log('Error asserting the type: ', error);
                    }
                }
                return [false, null, null];
            } else {
                return [segmentClientRoutes === segmentUri, null, null];
            }
        }
        return [false, null, null];
    }

    extractRoute(uri) {
        
        

        // const params = extractParamsFromPath(matchedRoute.path);
        // console.log("Extracted params and types:", params);
        // Weiterführende Logik zur Parametervalidierung und -konvertierung...
    
        

        if (!uri) return;
        const params = {};
        const urlSegments = uri.split('/').slice(1);
        const match = this.#routes?.find((route) => {
            if (!route.segments || route.segments?.length !== urlSegments.length) {
                return false;
            }
            return route.segments.every((segment, i) => {
                // console.log('route: ', route);
                // console.log('segment: ', segment);
                
                if (segment[0] === ':') {
                    params[segment.slice(1)] = decodeURIComponent( urlSegments[i] );
                }
                // console.log('added: ', route[segment.slice(1)]);
                // console.log('added route: ', route);
                
                return segment === urlSegments[i] || segment[0] === ':';
            });
        });
        return [params, match]
    }

    static toggleHistoryState(routeTo, addToHistory) {
        if (addToHistory) {
            // // console.log("ROUTER Push State, current history: ", history.state);
            window.history.pushState({ route: routeTo }, '', routeTo);
            // // console.log("ROUTER Push State, new history: ", history.state);
        } else if (!addToHistory) {
            // console.log("ROUTER REPLACE, current history: ", history.state);
            window.history.replaceState({ route: routeTo }, '', routeTo);
            // // console.log("ROUTER REPLACE, new history: ", history.state);
        }
    }

    getOutlet = () => this.#root?.querySelector('#root-outlet');

    /**
     * @param {HTMLElement} component
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {Symbol | undefined}
     */
    mountComp(component, route, params, url) {
        let val;
        // console.log('Router: mountComp: ', component);
        if (component instanceof BaseElement &&typeof component.onBeforeMount === 'function') {
            // console.log('Router: mountComp. isOk!');
            val = component.onBeforeMount(route, params, url);
            // console.log('mountComp: val: ', val);
            // console.log('val === Router.makeRedirect: ', val === Router.makeRedirect);
            
            if (val === Router.makeRedirect || val === Router.show404) {
                return val;
            }
        }
        // console.log('Router: Mount component: ', component);
        
        this.getOutlet()?.appendChild(component);
        // fadeInElement(component);
        if (component instanceof BaseElement && typeof component.onAfterMount === 'function') {
            component.onAfterMount(route);
        }
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
        // await fadeOutElement(component);
        firstChildElem.remove();
        if (component instanceof BaseElement && typeof component.onAfterUnMount === 'function')
            component.onAfterUnMount();
    }

    /**
     * @param {string | URL | null | undefined | 'history.back'} route
     * @returns {symbol}
     */
    redirect(route) {
        // console.log('REDIRECT: state?: ',history.state);
        
        if (typeof route === 'string' && route === 'history.back' && typeof this.lastRoute === 'string') {
            // this.goneBackMakeReplace = true;
            // console.log('HISTORY REDIRECT BACK: ', this.lastRoute);
            // history.back();
            
            window.history.replaceState({ route: this.lastRoute }, '', this.lastRoute);
            // if (typeof route === 'string') this.go(this.lastRoute, false);
        } else {
            window.history.replaceState({ route }, '', route);
            if (typeof route === 'string') this.go(route, false);
        }
        
        return Router.makeRedirect;
    }


    /**
     * @param {Route | undefined} routeObj
     * @returns {[Route, HTMLElement]}
     */
    createComponentFromRoute(routeObj) {
        if (!routeObj) {
            routeObj = Router.componentDefault404;
        }
        let elem = document.createElement(routeObj.component);
        if (!elem) {
            elem = document.createElement(Router.componentinvalidComponent.component);
        }
        return [routeObj, elem];
    }

    /**
     * @param {string} route
     * @param {boolean} addToHistory
     * @param {boolean} isFromHistory
     */
    go(route, addToHistory = true, isFromHistory = false) {
        if (route === '#') {
            return;
        }

        // console.log('router go to: ', route);
        if (!this.#isInit) this.#isInit = true;
        
        const url = new URL(route, window.location.origin);

        let scrollUp = true;
        if (this.lastRoute && this.lastRoute.pathname === url.pathname) {
            // console.log('ROUTER!!! OK ARE THE SAME!!!');
            scrollUp = false;
        }
        route = url.pathname;
        // console.log('route url: ', url);
        
        const params = {};
        params.searchParams = url.searchParams;
        const urlSegments = route.split('/').slice(1);
        if (urlSegments.at(-1) === '') {
            urlSegments.pop();
            route = route.slice(0, -1);
        }
        
        if (this.#root instanceof BaseElement) {
            this.#root.onRouteChange(route, params, url);
        }

        let [matchObj, component] = this.createComponentFromRoute(this.#findRoute(urlSegments, params));
      
        let curr = this.getOutlet()?.firstElementChild;

        let isAlreadyMounted = false;
        if (curr && curr.tagName === component.tagName && curr instanceof BaseElement && typeof curr.onRouteChange === 'function') {
            isAlreadyMounted = true;
            const res = curr.onRouteChange(route, params, url);
            if (res === Router.makeRedirect) {
                return;
            } else if (res === Router.show404) {
                [matchObj, component] = this.createComponentFromRoute(Router.componentDefault404);
                this.unmountComp(curr, route);
                this.mountComp(component, route, params, url);
            } else if (res === false) {
                this.unmountComp(curr, route);
                isAlreadyMounted = false;
            }
        }

        if (!isAlreadyMounted && !curr) {
            // console.log('Router - mount directly!');
            
            const res = this.mountComp(component, route, params, url);
            if (res === Router.makeRedirect) {
                return;
            } else if (res === Router.show404) {
                [matchObj, component] = this.createComponentFromRoute(Router.componentDefault404);
                this.mountComp(component, route, params, url);
            }
        }
        else if (!isAlreadyMounted && curr instanceof HTMLElement) {
            console.log('Router - unmount: ', curr, ' mount: ', component);
            this.unmountComp(curr, route);
            const res = this.mountComp(component, route, params, url);
            if (res === Router.makeRedirect) {
                return;
            } else if (res === Router.show404) {
                [matchObj, component] = this.createComponentFromRoute(Router.componentDefault404);
                this.mountComp(component, route, params, url);
            }
            
        }

        if (!isFromHistory && scrollUp) {
            // console.log('scroll to topp!!!');
            window.scrollTo({left: 0, top: 0, behavior: 'auto'});
        } else {
            // console.log('no scroll! from history');
        }
        // Router.toggleHistoryState(route, addToHistory);
        // console.log('set history to: ', url.href);
        
        Router.toggleHistoryState(url.href, addToHistory);
        document.title = matchObj.title;
        this.lastRoute = url;
    }

    mountUnmount() {

    }
}
