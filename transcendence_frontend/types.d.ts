/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./types/api_types.d.ts" />
/// <reference path="./types/internal_types.d.ts" />
/// <reference path="./types/game_types_new.d.ts" />
/// <reference path="./types/notification_types.d.ts" />
/// <reference path="./types/chat_types.d.ts" />


import 'vite/client'

declare namespace RoutingTypes {

    type ParamTypes = {
        int: 'int',
        float: 'float',
        boolean: 'boolean',
        date: 'date',
        string: 'string'
    };
    
    type ExtractRouteParams<T extends string, P = {}> = string extends T
        ? Record<string, ParamTypes[keyof ParamTypes]>
        : T extends `${infer Start}:${infer Param}(${infer Type})/${infer Rest}`
        ? { [k in Param]: Type extends keyof ParamTypes ? ParamTypes[Type] : never } & ExtractRouteParams<Rest, P>
        : T extends `${infer Start}:${infer Param}(${infer Type})`
        ? { [k in Param]: Type extends keyof ParamTypes ? ParamTypes[Type] : never } & P
        : P;
    
    // type ExtractRouteParams<T extends string> = string extends T
    //     ? Record<string, string | number>
    //     : T extends `${infer Start}:${infer Param}/${infer Rest}`
    //     ? { [k in Param | keyof ExtractRouteParams<Rest>]: string | number }
    //     : T extends `${infer Start}:${infer Param}`
    //     ? { [k in Param]: string | number }
    //     : {};

    export interface Route<T extends string> {
        path: T;
        component: string;
        title: string;
        params: ExtractRouteParams<T>;
    }

    export interface RouteDataParams {
        [key: string]: 'string' | 'number';
    }
    export interface RouteData {
        path: string;
        component: string;
        title: string;
        params?: RouteDataParams; 
    }
    export interface TournamentDetailsRouteParams extends RouteDataParams {
        game: 'string';
        tournament_id: 'number';
    }
    
}
