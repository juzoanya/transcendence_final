
/**
 * @param {string | undefined} game 
 * @param {number | undefined} tournamentId 
 */
export function getTournamentLink(game, tournamentId) {
    if (tournamentId == undefined) {
        return ('/');
    }
    const url = new URL(`${window.location.origin}/games/${game ?? 'pong'}/tournament/${tournamentId}`);
    return url.href;
}

/**
 * @param {APITypes.GameScheduleItem} schedule
 * @param {{
 *      rand?: boolean,
 *      tournament?: number
 * }} [options]
 */
export function getMatchLink(schedule, options) {
    const url = new URL(`${window.location.origin}/games/${schedule?.game_id?.toLowerCase() ?? 'pong'}/play/${schedule.schedule_id}${options?.rand ? '(rand)' : ''}`);
    if (options?.tournament != undefined) {
        url.searchParams.append('tournament', options.tournament.toString());
    }
    return url.href;
}