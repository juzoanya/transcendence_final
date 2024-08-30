import { BaseElement, html } from '../lib_templ/BaseElement.js';
import Router from '../lib_templ/router/Router.js';
// {
//     path: '/login',
//     component: 'login-register-route',
//     title: 'Login',
// },
// {
//     path: '/logout',
//     component: 'login-register-route',
//     title: '',
// },
// {
//     path: '/register',
//     component: 'login-register-route',
//     title: 'Register',
// },
// {
//     path: '/pwforgot',
//     component: 'login-register-route',
//     title: 'Reset your Password',
// },
// {
//     path: '/chat',
//     component: 'chat-view',
//     title: 'Chat',
// },
// {
//     path: '/chat/:chatroom_name',
//     component: 'chat-view',
//     title: 'Chat',
//     params: {
//         chatroom_name: 'string'
//     }
// },
// {
//     path: '/social',
//     component: 'friends-view',
//     title: 'Friendlist',
// },
// {
//     path: '/social/friends',
//     component: 'friends-view',
//     title: 'Friendlist',
// },
// {
//     path: '/social/requests-received',
//     component: 'friends-view',
//     title: 'Friendlist',
// },
// {
//     path: '/social/requests-sent',
//     component: 'friends-view',
//     title: 'Friendlist',
// },
// {
//     path: '/social/blocked-users',
//     component: 'friends-view',
//     title: 'Friendlist',
// },
const routes = [
    {
        path: '',
        component: 'game-window',
        title: 'Welcome to awesome Pong!',
    },
    {
        path: '/auth/:authroute',
        component: 'login-register-route',
        title: 'Login',
    },
    {
        path: '/auth/oauth-failure/:auth_error',
        component: 'login-register-route',
        title: 'Login',
    },
    {
        path: '/social/chat',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social/chat/:chatroom_name',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social/:subpage',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/settings',
        component: 'settings-view',
        title: 'Profile ',
    },
    {
        path: '/settings/:subpage',
        component: 'settings-view',
        title: 'Profile ',
        params: {
            subpage: 'string'
        }
    },
    {
        path: '/profile',
        component: 'profile-view',
        title: 'Profile ',
    },
    {
        path: '/profile/:pk',
        component: 'profile-view',
        title: 'Profile ',
        params: {
            pk: 'number'
        }
    },
    {
        path: '/games/:game/info',
        component: 'pong-info-view',
        title: 'Pong Infos',
        params: {
            game: 'string'
        }
    },
    {
        path: '/games/:game/info/:subpage',
        component: 'pong-info-view',
        title: 'Pong Infos',
        params: {
            game: 'string',
            subpage: 'string',
        }
    },
    {
        path: '/games/:game/tournaments',
        component: 'tournament-list-view',
        title: 'See your Tournament',
        params: {
            game: 'string'
        }
    },
    {
        path: '/games/:game/tournament/create',
        component: 'tournament-create-view',
        title: 'Create a Tournament',
        params: {
            game: 'string'
        }
    },
    {
        path: '/games/:game/tournament/:tournament_id',
        component: 'tournament-details-view',
        title: 'Tournament',
        params: {
            game: 'string',
            tournament_id: 'number'
        }
    },
    {
        path: '/games/:game/play/:schedule_id',
        component: 'game-screen',
        title: 'Game View ',
        params: {
            game: 'string',
            schedule_id: 'number'
        }
    },
    {
        path: '/virtualizer',
        component: 'virt-test',
        title: 'Game View ',
    },
];


customElements.define('pong-not-found', class extends BaseElement {

    connectedCallback() {
        super.connectedCallback();
        this.style.width = '100%';
        this.style.display = 'block';
        this.imageWidth = window.innerWidth < window.innerHeight ? '100%' : 'auto';
        this.imageHeight = window.innerHeight < window.innerWidth ? '100%' : 'auto';
        // this.imageMaxHeight = window.innerHeight < window.innerWidth ? ''
    }
    // class="img-fluid"
    render() {
        return html`
            <div class="h-100 w-100 d-flex align-items-center justify-content-center">
                <a style="${"transform: translate(0, -70px);"}" href="/" class="btn btn-primary position-fixed">Back to Home</a>
                <img class="pong-full-image" src="/images/404_4.webp"  alt="404 not found image">
            </div>
        `
            // <img style="max-height: 80vh" class="img-fluid" src="/images/404_2.webp"  alt="404 not found image">
    }
});

const router = new Router(routes, 'pong-not-found');

export default router;


