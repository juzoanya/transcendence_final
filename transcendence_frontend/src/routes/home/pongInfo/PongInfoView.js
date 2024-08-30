import { avatarLink } from '../../../components/bootstrap/AvatarComponent';
import { getPongSvg, renderInlineMatch } from '../../../components/gameUtils';
import { BaseElement, html, ifDefined } from '../../../lib_templ/BaseElement';
import { gameAPI, sessionService } from '../../../services/api/API';
import { TournamentListView } from '../tournament/TournamentListView';

export class PongInfoView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();
        this.pageNoHistory = 1;
        this.pageNoLeaderBoard = 1;
        this.maxHistoryPages = 0;
        this.boundCbHistory = this.renderHistoryItem.bind(this);
    }


    handleParams(params) {
        if (typeof params === 'object' && Object.hasOwn(params, 'searchParams') && params.searchParams instanceof URLSearchParams) {
            this.searchParams = params.searchParams;
            this.searchParams?.forEach((v, k) => {
                console.log('key: ', k, ': ', v);
                
            })
        }
    }
    /** @type {URLSearchParams | undefined} */
    searchParams;

    onBeforeMount(route, params) {
        this.handleParams(params);
        console.log('searchParams: ', params.searchParams);
        
    }

    onRouteChange(route, params) {
        console.log('searchParams: ', params.searchParams);
        this.handleParams(params);
        super.requestUpdate();
    }

    /**
     * @param {APITypes.GameScheduleItem} item 
     * @param {number} i 
     */
    renderHistoryItem(item, i) {
        return html`${renderInlineMatch(item)}`;
    }

    renderHistoryTab = () => html`
            <pageinated-list-card
                onlyarrows
                title="Match History"
                icon="user"
                .page=${this.searchParams?.get('page')??1}
                .fetchdatacb=${async (page) => {
                    console.log('FETCH HISTORY');
                    if (typeof page !== 'number' || page < 0) return;
                    const data = await sessionService.fetchAndNotifyOnUnsuccess(gameAPI.getHistory(true, page));
                    console.log('FETCH HISTORY: data: ', data);
                    if (data) {
                        return [data.max_pages, data.history];
                    }
                }}
                .rendercb=${this.boundCbHistory}
            >
            </pageinated-list-card>
    `

    renderLeaderBoardTab = () => html`
            <pageinated-list-card
                onlyarrows
                title="Leaderboard"
                icon="user"
                .page=${this.searchParams?.get('page')??1}
                .fetchdatacb=${async (page) => {
                    console.log('FETCH HISTORY');
                    if (typeof page !== 'number' || page < 0) return;
                    const data = await sessionService.fetchShort(gameAPI.getLeaderboard());
                    console.log('FETCH HISTORY: data: ', data);
                    if (data) {
                        return [1, data];
                    }
                }}
                .rendercb=${/** @param {APITypes.PlayerData} p  */(p) => html`
                    <div class="py-2 d-flex justify-content-between align-items-center">
                        ${avatarLink(p)}
                        <span>${p.xp}</span>
                    </div>
                `}
            >
            </pageinated-list-card>
    `

    renderInfoTab = () => html`
        <tournament-list-view></tournament-list-view>
    `


    render() {

        console.log('current page from params: ', this.searchParams?.get('page'));
        
        return html`
            <div>
                <ul class="nav nav-tabs" id="myTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="leaderboard" data-bs-toggle="tab" data-bs-target="#leaderboard-pane" type="button" role="tab" aria-controls="leaderboard-pane" aria-selected="false">Leaderboard</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="match-history" data-bs-toggle="tab" data-bs-target="#match-history-pane" type="button" role="tab" aria-controls="match-history-pane" aria-selected="true">Matches</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="game-info" data-bs-toggle="tab" data-bs-target="#game-info-pane" type="button" role="tab" aria-controls="game-info-pane" aria-selected="false">Tournaments</button>
                    </li>
                </ul>
                <div class="tab-content" id="gameInfoContent">
                    <div class="tab-pane fade show active" id="match-history-pane" role="tabpanel" aria-labelledby="match-history" tabindex="0">
                        ${this.renderHistoryTab()}
                    </div>
                    <div class="tab-pane fade" id="leaderboard-pane" role="tabpanel" aria-labelledby="leaderboard" tabindex="0">
                        ${this.renderLeaderBoardTab()}
                    </div>
                    <div class="tab-pane fade" id="game-info-pane" role="tabpanel" aria-labelledby="game-info" tabindex="0">
                        ${this.renderInfoTab()}
                    </div>
                </div>
            </div>
        `
    }
}
//<list-card
//title="All Tournaments"
//.items=${this.currentHistoryPage}
//.rendercb=${this.boundCbHistory}
//>
//</list-card>
customElements.define("pong-info-view", PongInfoView);