import { renderCardInfo } from '../../../components/bootstrap/BsCard';
import { getStatusBadge, getTournamentIcon } from '../../../components/gameUtils';
import { BaseElement, html } from '../../../lib_templ/BaseElement';
import { gameAPI, sessionService } from '../../../services/api/API';
import router from '../../../services/router';
import { getTournamentLink } from '../utils';

export class TournamentListView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();
        this.session = sessionService.subscribe(this);
        this.boundRender = this.renderTournamentList.bind(this);
        this.boundFetcher = this.fetchAllTournaments.bind(this);
    }

    called = 0;
    /**
     * @param {number} page 
     * @param {Set<APITypes.TournamentStatus | 'all Tournaments' | APITypes.TournamentMode | 'i created'>} [filter] 
     */
    async fetchAllTournaments(page, filter) {
        this.called += 1;
        console.log('fetch page: ', page);

        // if (filter === '')
        let states = [];
        let modes = [];
        filter?.forEach((v) => {
            if (v === 'finished' || v === 'in progress' || v === 'waiting') {
                states.push(v);
            }
            if (v === 'round robin' || v === 'single elimination') {
                modes.push(v);
            }
        });
        let userId = this.session.value?.user?.id;
        if (filter?.has('all Tournaments')) {
            userId = undefined;
        }
        let creatorId = undefined;
        if (filter?.has('i created')) {
            creatorId = this.session.value?.user?.id;
        }
       
        if (this.session.value?.user?.id != undefined) {
            const d = await sessionService.fetchShort(
                gameAPI.getTournaments(page,
                    userId,
                    creatorId,
                    states,
                    modes
                )
            );
            if (d) {
                return [d.max_pages, d.tournaments];
            }
        }
    }

    onBeforeMount(route, params, url) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/auth/login');
        }
        if (params.searchParams instanceof URLSearchParams) {
            /** @type {URLSearchParams | undefined} */
            this.searchParams = params.searchParams;
        }
    }
    
    onRouteChange(route, params, url) {
        if (params.searchParams instanceof URLSearchParams) {
            /** @type {URLSearchParams | undefined} */
            this.searchParams = params.searchParams;
        }
    }


    /**
     * @param {APITypes.TournamentItem} tournament 
     * @param {number} i 
     * @returns 
     */
    renderTournamentList = (tournament, i) => {
        
        return html`
            <div class="row align-items-center justify-content-between">
                <div class="col text-start align-middle py-1">
                    ${getTournamentIcon(tournament.mode)}
                </div>
                <div class="col text-start align-middle py-1'">
                    <a class="link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                                href="${getTournamentLink(undefined, tournament.id)}"
                            >
                    ${tournament.name}
                    </a>
                </div>
                <div class="col text-start align-middle py-1">
                    ${getStatusBadge(tournament.status)}
                </div>
            </div>
        `
        // return html`

        // <a href="/games/${tournament.game_id.toLowerCase()}/tournament/${tournament.id}">
        //     <div class="d-flex p-3">
        //         <div class="col" >${renderCardInfo('Name', tournament.name)}</div>
        //         <div class="col" >${renderCardInfo('Game', tournament.game_id)}</div>
        //         <div class="col" >${renderCardInfo('Status', tournament.status)}</div>
        //     </div>

        // </a>
        // `
    }

    render() {
        return html`
            <div>
                <pageinated-list-card
                    onlyarrows
                    header
                    usebutton
                    title="Tournaments"
                    icon="user"
                    .fetchdatacb=${this.boundFetcher}
                    .rendercb=${this.boundRender}
                    .filters=${[
                        {name: 'all Tournaments', color: 'primary'},
                        {name: 'round robin', color: 'secondary'},
                        {name: 'single elimination', color: 'danger'},
                        {name: 'waiting', color: 'info'},
                        {name: 'in progress', color: 'warning'},
                        {name: 'finished', color: 'success'},
                        {name: 'i created', color: 'dark'},
                    ]}
                >
                </pageinated-list-card>
            </div>
          
        `
    }
}
customElements.define("tournament-list-view", TournamentListView);