/* eslint-disable import/prefer-default-export */
/* eslint-disable prettier/prettier */

import { ToastNotificationErrorEvent, ToastNotificationSuccessEvent } from '../src/components/bootstrap/BsToasts';
import { SelectedNavLink } from '../src/components/Navs';
// import { BaseElement } from '../src/lib_templ/BaseElement';
import { SelectedSearchResult } from '../src/routes/social/ProfileSearch';


export { };
interface CustomEventMap extends HTMLElementEventMap {
    toast_notification_error: ToastNotificationErrorEvent;
    toast_notification_success: ToastNotificationSuccessEvent;
    profile_search_selected_result: SelectedSearchResult;
    selected_nav_link: SelectedNavLink;
}

export interface BaseElement extends HTMLElement { }

declare global {
    // interface HTMLElement{}

    interface Document {
        // adds definition to Document, but you can do the same with HTMLElement
        addEventListener<K extends keyof CustomEventMap>(
            type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void,
        ): void;
        dispatchEvent<K extends keyof CustomEventMap>(
            ev: CustomEventMap[K],
        ): boolean;

        // createElement(tagName: string, options?: ElementCreationOptions): HTMLElement | BaseElement;
        // createElement(tagName: "my-custom-element"): BaseElement;
    }
    interface HTMLElement {
        // adds definition to Document, but you can do the same with HTMLElement
        addEventListener<K extends keyof CustomEventMap>(
            type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void,
        ): void;
        removeEventListener<K extends keyof CustomEventMap>(
            type: K,
            listener: (this: Document, ev: CustomEventMap[K]) => void,
        ): void;
        dispatchEvent<K extends keyof CustomEventMap>(
            ev: CustomEventMap[K],
        ): boolean;

        // appendChild<T extends Node>(node: T): T;
    }
}
