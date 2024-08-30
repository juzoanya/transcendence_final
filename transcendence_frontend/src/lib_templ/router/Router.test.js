import { expect, test } from 'vitest';
import Router from './Router';



const routes = [
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
];

const router = new Router(routes);

test('extract params', {}, () => {
    // const res = router.extractRoute('/games/pong/play/1');
    // console.log(res)
    let res;
    console.log('1');
    res = router.checkSegment(':tournament_id(int)', '1')
    console.log('res: ', res);
    console.log('2');
    res = router.checkSegment(':tournament_id(int', '1')
    console.log('res: ', res);
    console.log('3');
    res = router.checkSegment('tournament_id(int)', '1')
    console.log('res: ', res);
    console.log('4');
    res = router.checkSegment('tournament_idint)', '1')
    console.log('res: ', res);
    console.log('5');
    res = router.checkSegment(':game(string)', 'pong')
    console.log('res: ', res);
});
