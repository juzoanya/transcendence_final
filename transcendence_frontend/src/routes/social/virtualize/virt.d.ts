import { LayoutT } from './layout/layout';
import { Virtualizer, virtualizerRef } from './virtualizer';

declare namespace ScrollerControllerT {

    type retargetScrollCallback = () => LayoutT.ScrollToCoordinates;
    type endScrollCallback = () => void;
    type Nullable<T> = T | null;

}

declare namespace VirtT {

    export interface VirtualizerHostElement extends HTMLElement {
        [virtualizerRef]?: Virtualizer;
    }

    // export interface VirtualizerChildElementProxy {
    //     scrollIntoView: (options?: ScrollIntoViewOptions) => void;
    // }

    // interface ScrollElementIntoViewOptions extends ScrollIntoViewOptions {
    //     index: number;
    // }

    // export interface VirtualizerConfig {
    //     layout?: LayoutT.LayoutConfigValue;

    //     /**
    //      * The parent of all child nodes to be rendered.
    //      */
    //     hostElement: VirtualizerHostElement;

    //     scroller?: boolean;
    // }
}
