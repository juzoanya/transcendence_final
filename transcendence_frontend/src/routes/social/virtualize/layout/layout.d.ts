import { FlowLayout } from './flowlayout';

declare namespace SizeCacheT {
    export interface SizeCacheConfig {
        roundAverageSize?: boolean;
    }
}

declare namespace LayoutT {
    export type dimension = 'height' | 'width';
    export type Size = {
        [key in dimension]: number;
    };

    export type margin =
        | 'marginTop'
        | 'marginRight'
        | 'marginBottom'
        | 'marginLeft';

    export type Margins = {
        [key in margin]: number;
    };

    export type ItemBox = Size | (Size & Margins);

    export type position = 'left' | 'top';
    export type offset = 'top' | 'right' | 'bottom' | 'left';
    export type offsetAxis = 'xOffset' | 'yOffset';

    // TODO (graynorton@): This has become a bit of a
    // grab-bag. It might make sense to let each layout define
    // its own type and provide its own implementation of
    // `positionChildren()` that knows how to translate the
    // provided fields into the appropriate DOM manipulations.
    export type Positions = {
        left: number;
        top: number;
        width?: number;
        height?: number;
        xOffset?: number;
        yOffset?: number;
    };

    export interface Range {
        first: number;
        last: number;
    }
    export interface InternalRange extends Range {
        firstVisible: number;
        lastVisible: number;
    }

    export interface StateChangedMessage {
        type: 'stateChanged';
        scrollSize: Size;
        range: InternalRange;
        childPositions: ChildPositions;
        scrollError?: Positions;
    }

    export interface VisibilityChangedMessage {
        type: 'visibilityChanged';
        firstVisible: number;
        lastVisible: number;
    }

    export interface UnpinnedMessage {
        type: 'unpinned';
    }

    export type LayoutHostMessage = StateChangedMessage;
    // export type LayoutHostMessage =
    //     | StateChangedMessage
    //     | UnpinnedMessage
    //     | VisibilityChangedMessage;

    export type LayoutChangedCb = (message: LayoutHostMessage) => void;

    export type ChildPositions = Map<number, Positions>;

    export type ChildMeasurements = { [key: number]: ItemBox; };

    export type MeasureChildFunction = <T>(element: Element, item: T) => ItemBox;

    export interface PinOptions {
        index: number;
        block?: ScrollLogicalPosition;
    }

    // export type LayoutConstructor = new (
    //     sink: LayoutHostSink,
    //     config?: object
    // ) => Layout;

    // export interface LayoutSpecifier {
    //     type: LayoutConstructor;
    // }

    // export type LayoutSpecifierFactory = (config?: object) => LayoutSpecifier;

    // export interface BaseLayoutConfig {
    //     direction?: ScrollDirection;
    //     pin?: PinOptions;
    // }

    // export type LayoutConfigValue = LayoutSpecifier | BaseLayoutConfig;

    export interface ScrollToCoordinates {
        top?: number;
        left?: number;
    }

    export type ScrollDirection = 'vertical' | 'horizontal';

    /**
     * Interface for layouts consumed by Virtualizer.
     */
    export interface Layout {
        config?: object;

        items: unknown[];


        _viewportSize: Size;

        viewportScroll: Positions;

        totalScrollSize: Size;

        offsetWithinScroller: Positions;

        readonly measureChildren?: boolean | MeasureChildFunction;

        readonly listenForChildLoadEvents?: boolean;

        updateItemSizes?: (sizes: ChildMeasurements) => void;

        pin: PinOptions | null;

        unpin: Function;

        getScrollIntoViewCoordinates: (options: PinOptions) => ScrollToCoordinates;

        /**
         * Called by a Virtualizer when an update that
         * potentially affects layout has occurred. For example, a viewport size
         * change.
         *
         * The layout is in turn responsible for dispatching events, as necessary,
         * to the Virtualizer. Each of the following events
         * represents an update that should be determined during a reflow. Dispatch
         * each event at maximum once during a single reflow.
         *
         * Events that should be dispatched:
         * - scrollsizechange
         *     Dispatch when the total length of all items in the scrolling direction,
         *     including spacing, changes.
         *     detail: {
         *       'height' | 'width': number
         *     }
         * - rangechange
         *     Dispatch when the range of children that should be displayed changes.
         *     detail: {
         *       first: number,
         *       last: number,
         *       num: number,
         *       stable: boolean,
         *       remeasure: boolean,
         *       firstVisible: number,
         *       lastVisible: number,
         *     }
         * - itempositionchange
         *     Dispatch when the child positions change, for example due to a range
         *     change.
         *     detail {
         *       [number]: {
         *         left: number,
         *         top: number
         *       }
         *     }
         * - scrollerrorchange
         *     Dispatch when the set viewportScroll offset is not what it should be.
         *     detail {
         *       height: number,
         *       width: number,
         *     }
         */
        reflowIfNeeded: (force?: boolean) => void;
    }
}

declare namespace FlowLayoutT {

    type ItemBounds = {
        pos: number;
        size: number;
    };

    // type FlowLayoutConstructor = {
    //     prototype: FlowLayout;
    //     new(onChangeCb: LayoutT.LayoutHostSink, config?: LayoutT.BaseLayoutConfig): FlowLayout;
    // };

    // type FlowLayoutSpecifier = LayoutT.BaseLayoutConfig & {
    //     type: FlowLayoutConstructor;
    // };

    // type FlowLayoutSpecifierFactory = (config?: LayoutT.BaseLayoutConfig) => FlowLayoutSpecifier;

}

declare namespace BaseLayoutT {

    export type UpdateVisibleIndicesOptions = {
        emit?: boolean;
    };

}

/**
 * 
 * 1. init -> hostElementis the HtmlElement where the class lives in
 *  1.1. apply styles -> apply necessary styles to the host element
 *  1.2. assing this as a reference to the HtmlElement
 *  1.3. init layout -> create Layout class
 *          -> measureCallback??
 *  1.4 schedule the update of the layout.
 * 
 * 2. onConnect -> init Obserrvers right after init -> but before the scheduled update is running
 *      2.1 init observers: 1. MutationsObserver. cb is: _finishDOMUpdate
 *                          2. ResizeObserver for the hostElement. cb is: _hostElementSizeChanged
 *                          3. Resizeobserver of all? child elem of host (the list). cb is: _childrenSizeChanged
 *      2.2 getClippingAncestors?
 *  
 * 
 * necessary scrollercontroller:
 *  -> controlls scrolling for the main! scrollbox
 * 
 * functions
 * - detatch
 * - managedScrollTo
 * - correctScrollError
 * 
 * props
 * - element
 * - correctingScrollError
 * - const { scrollTop, scrollLeft } = this._scrollerController;??
 * 
 * 
 * update cycle:
 * 
 * @updateView
 * - get Rect of host element
 * - get rects of ancestorbounds -> main scroll container ? + all, that are overflow !=  visible
 * -    -> add hostElementBound
 * - iterate ancestorbounds and find max bound left, top, bottom, right
 * - get rect of scrollcontainer
 *  - set offset within scroller (left and top)
 * - set total scroll size
 * - set scrollTop(top(the max of ancestors) - hostElementBounds.top + hostElement.scrollTop) and scrollLeft(left - hostElementBounds.left + hostElement.scrollLeft)
 * - set height, width
 * At the END: 
 *  -> set layout.viewportSize: { width: right - left, height: bottom - top }
 *  -> set layout.viewpotScroll: { top: top(the max of ancestors) - hostElementBounds.top + hostElement.scrollTop, left: left(max of ancestors) - hostElementBounds.left + hostElement.scrollLeft };
 *  -> set layout.totalScrollSize = { width: scrollingElement.scrollWidth, height: scrollingElement.scrollHeight };
 * -> set layout.offsetWithinScroller = { left: hostElementBounds.left - scrollingElementBounds.left, top: hostElementBounds.top - scrollingElementBounds.top }
 * 
 * @updateLayout
 * schedule -> _updateLayout
 * 1.  -> seit layout items to own items
 * 2. this._updateView();
 * check if this._childMeasurements:
 *  if yes and this._measureCallback:
 *      this._measureCallback -> funtion of FloatLayout ->  (is this._layout.updateItemSizes.bind(this._layout);)
 *      call this._measureCallback with this._childMeasurements
 * at the end: this._layout.reflowIfNeeded()
 * 
 * unknown items:
 * - this._childMeasurements
 * 
 * 
 * 
 */