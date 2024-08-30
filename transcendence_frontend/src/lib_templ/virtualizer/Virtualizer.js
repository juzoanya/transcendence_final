import { BaseElement, createRef, html, ref } from '../BaseElement.js';
import { Ref } from '../templ/nodes/FuncNode.js';
import { clamp, collapseMargins, findFirstAndLast, getMarginAsNumber, getScrollHeight } from './helpers.js';

const OVERHANG = 1000;

export class SizeCache {
    /** @type {Map < number | string, number >} */
    #map = new Map();
    #totalSize = 0;
    #avg = 0;
    #initial = 0;


    /** @param {number} [initialAvg]  */
    constructor(initialAvg) {
        if (initialAvg != undefined) {
            this.#avg = initialAvg;
            this.#initial = initialAvg;
        }
    }

    getSizeAtIndexOrAverage(index) {
        return this.#map.get(index) ?? this.average;
    }

    get initial() {
        return this.#initial;
    }

    get average() {
        return this.#avg
    }

    /**
     * @param {number | string} index 
     * @param {number} value 
     */
    set(index, value) {
        const prev = this.#map.get(index) || 0;
        this.#map.set(index, value);
        this.#totalSize += value - prev;
        this.#avg = this.#totalSize / this.#map.size
    }
}


/**
 * @typedef {import('../BaseBase.js').Tpl} Tpl
 * @typedef {import('../BaseBase.js').BaseBaseProps} BaseBaseProps
 */

/**
 * @template T
 * @typedef {(item: T, idx: number) => Tpl} RenderItemFunction
 */

/**
 * @template T
 * @typedef {object} VirtData
 * @property {RenderItemFunction<T>} rendercb
 * @property {T[]} [items]
 * @property {import('../BaseElement.js').Ref<HTMLElement>} [scrollref]
 */

/**
 * @template T
 * @typedef {BaseBaseProps & VirtData<T> } VirtProps
 */

/** @type {RenderItemFunction<unknown>} */
const defaultRenderItem = (item, idx) => html`${idx}: ${JSON.stringify(item, null, 2)}`;

/**
 * @prop rendercb
 * @prop items
 * @template T
 * @extends BaseElement<VirtProps<T>>
 */
export class Virtcomp extends BaseElement {
    constructor() {
        super(false, false);
        this.props.rendercb = (item, idx) => defaultRenderItem(item, idx);
        this.props.items = [];
    }
    #items = [];
    /** @type {{pos: number, size: number}[]} */
    #renderItems = [];
    /** @type {HTMLElement | null} */
    #scrollref = null;
    #renderCb = (i, v) => {};
    /** @type {'top' | 'bottom' | null} */
    #initialPin = 'bottom';
    #realScrollHeight = 0;
    #estimatedScrollHeight = 0;
    /** @type {Map<string, {pos: number, size: number}>} */
    #renderedChildrenPositions = new Map();
    #offsetInScroller = 0;
    #currentScrollPos = 0;
    #viewPortHeight = 0;
    _first = -1;
    _last = -1;
    _physicalMin = 0;
    _physicalMax = 0;
    // _firstVisible = 0;
    // _lastVisible = 0;
    // _scrollEventListeners = []
    _scrollEventListenerOptions = {passive:true}
    _mutationObserver = new MutationObserver( this.onChildsAmountChange.bind(this) );
    // _hostElementRO = new ResizeObserver( this.scheduleLayoutUpdate.bind(this) );
    #childrenRO = new ResizeObserver(this.onChildSizeChange.bind(this));
    // _viewportSize = {height: 0, width:0}
    // _scrollPosition = 0;
    // _pin = 0;
    // _overhang = 1000;
    // _scrollHeight = 1;
    // _scrollError = 0;
    // _physicalMin = 0;
    // _physicalMax = 0;

    // _physicalItems = new Map();
    // _newPhysicalItems = new Map();
    // _stable = true;
    // _estimate = true;

    heights = new SizeCache(100);
    margins = new SizeCache();
    // cache = new Map();
    #leadingMargin = 0;
    #trailingMargin = 0;

    // @ts-ignore
    onPropChange(key, value) {
        console.log('onPropChange: value: ', value);
        
        if (key === 'items') {
            if (Array.isArray(value)) {
                if (value !== this.#items) {
                    this.#items = value;
                    this.scheduleReflow();
                }
            }
        } else if (key === 'scrollref' && value instanceof Ref) {
            this.#scrollref = value.value;
        } else if (key === 'rendercb' && typeof value === 'function') {
            this.#renderCb = value;
        }
        return false;
    }


    connectedCallback() {
        super.connectedCallback();

        this.style.display = 'block';
        this.style.position = 'relative';
        this.style.contain = 'size layout';

        this._connected = true;
        this._mutationObserver.observe(this, { childList: true });
        // this._hostElementRO.observe(this);
        
        this.observeChildren();
        this.initScroll();
        this.scheduleLayoutUpdate();
    }

    async initScroll() {
        console.log('initScroll');
        
        await this.updateComplete;
        console.log('initScroll awaited - scroller? :', this.#scrollref);
        if (this.#scrollref) {
            this.#scrollref.addEventListener( 'scroll', this, this._scrollEventListenerOptions);
        }
    }

    async scheduleLayoutUpdate() {
        await Promise.resolve();
        this.updateLayout();
    }

    scheduleReflow() {
        this.shouldReflow = true;
    }


    observeChildren() {
        const children = this.children;
        let i = 0;
        while (this.#childrenRO && i < children.length) {
            this.#childrenRO.observe(children[i]);
            i++;
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // @ts-ignore
        this.#scrollref.removeEventListener( 'scroll', this, this._scrollEventListenerOptions ) 
        this._scrollEventListeners = [];
        this._clippingAncestors = [];
        this._mutationObserver.disconnect();
        // this._hostElementRO.disconnect();
        this.#childrenRO.disconnect();
        this._connected = false;
    }

    /**
     * Updates initiated by: scrolling -> schedule Layout
     */
    /** @param {CustomEvent} event  */
    handleEvent(event) {
        console.log('handle scroll event!');
        if (event.type === 'scroll' && event.currentTarget === this.#scrollref) {
            this.scheduleLayoutUpdate();
        }
    }

    updateEstimatedScrollHeight() {
        this.#estimatedScrollHeight = getScrollHeight(this.#items.length, this.margins.average, this.heights.average);
    }

    /**
     * schedule reflow if:
     * 1. threshold -> initial + new items are in the viewscreen + overhang
     * 2. new items were set
     */


    updateLayout() {
        if (!(this._connected && this.#scrollref)) 
            return;
        // console.log('\n!!!!! _updateLayout');
        
        const hostElementBounds = this.getBoundingClientRect();
        const scrollerBounds = this.#scrollref.getBoundingClientRect()
        // console.log('hostElement: ',this);
        // console.log('scroller: ', this.#scrollref);
        // console.log('hostElementBounds: ',hostElementBounds);
        // console.log('scrollerBounds: ', scrollerBounds);
        // console.log('scrolltop: ', this.scrollTop);
        // console.log('scroller scrolltop: ', this.#scrollref.scrollTop);
        // console.log('calc: ',  scrollerBounds.top - hostElementBounds.top + this.scrollTop);
        
        
        
        
        this.#realScrollHeight = this.#scrollref.scrollHeight ?? 1;

        const currHeight = this.#viewPortHeight;
        this.#viewPortHeight = scrollerBounds.height;

        const currScrollPos = this.#currentScrollPos;
        this.#currentScrollPos = this.#scrollref.scrollTop;
        
        console.log('scrollpos: ', this.#currentScrollPos);
        
        // console.log('scrolldiff: ',  Math.abs(currScrollPos - this.#scrollref.scrollTop));
        
        if (currHeight !== scrollerBounds.height || Math.abs(currScrollPos - this.scrollTop) >= 1) {
            // console.log('change happened!');
            // console.log('change happened!: currHeight', currHeight);
            // console.log('change happened!: scrollerBounds.height', scrollerBounds.height);
            // console.log('change happened!: currScrollPos', currScrollPos);
            // console.log('change happened!: this.scrollTop', this.scrollTop);
            const min = Math.max(0, this.#currentScrollPos - OVERHANG);
            const max = Math.min(this.#estimatedScrollHeight, this.#currentScrollPos + this.#viewPortHeight + OVERHANG);
            // console.log('schwellenwert!!!!: min: ', min);
            // console.log('schwellenwert!!!!: max: ', max);
            // console.log('schwellenwert!!!!: this._physicalMax: ', this._physicalMax);
            // console.log('schwellenwert!!!!: this._physicalMin: ', this._physicalMin);
            if (this._physicalMin > min || this._physicalMax < max) {
                
                this.scheduleReflow();
            }
            
            /**
             * example min: scrollpos is 0 -> on the top -> -1000 is min
             * if physicalmin > 1000 ?
             */
        }

        if (this.shouldReflow) {
            this.shouldReflow = false;
            this.reflow();
        }

        // if (this._physicalMin > min || this._physicalMax < max) {
        //     this._scheduleReflow();
        // } else {
        //     this._updateVisibleIndices({ emit: true });
        // }

    }

    reflow() {
        console.log('reflow');
        
        this.#estimatedScrollHeight = getScrollHeight(this.#items.length ?? 0, this.margins.average, this.heights.average);
        // this.#currentScrollPos = this.calculateInitialPosition()
        // this.getItems()
        // updateVisible?
        // createChildrenspositions
        this.getItemsToRender(OVERHANG);

    }


    // getInitialItemsToRender(overhang = 1000) {

    //     // let lower = this.#currentScrollPos - overhang;
    //     // let 
    //     // while ()
    //     // let upper = this.#currentScrollPos + this.#viewPortHeight + overhang;
            
    // }

    getSize(i) {
        return this.#renderedChildrenPositions[i] ? this.heights.getSizeAtIndexOrAverage(i) : this.heights.average;
    }

    getItemsToRender(overhang, initial) {
        // if (initial) {
        //     let anchor = { index: 0, pos: 0 };
        //     if (this.#initialPin === 'top') {
        //         anchor.index = 0;
        //         anchor.pos = 0;
        //     } else if (this.#initialPin === 'bottom') {
        //         anchor.index = this.#items.length;
        //         anchor.pos = this.#items.length * this.heights.initial;
        //     } else {
        //         return null;
        //     }
        // }
        // if (this.#viewPortHeight === 0 || this.#items.length === 0) {
        //     return 0;
        // }
        // findFirstAndLast()
        
        
        let topOffset = this.#currentScrollPos - overhang;
        let bottomOffset = this.#currentScrollPos + this.#viewPortHeight + overhang;
        console.log('topOffset: ', topOffset);
        console.log('bottomOffset: ', bottomOffset);
        
        let anchor;
        if (topOffset <= 0) {
            anchor = 0;
        } else if (bottomOffset > this.#estimatedScrollHeight - this.#viewPortHeight) {
            anchor = this.#items.length -1;
        } else {
            const diff = topOffset + bottomOffset;
            const size = this.heights.average + this.margins.average;
            anchor = clamp(0, Math.floor( diff / 2 / size), this.#items.length - 1)
        }
        const anchorPos = this.getItemPosition(anchor);
        const anchorSize = this.getSize(anchor);
        const anchorLeadingMargin = this.margins.getSizeAtIndexOrAverage(anchor);
        const anchorTrailingMargin = this.margins.getSizeAtIndexOrAverage(anchor + 1);


        console.log('anchor: ', anchor);
        console.log('anchorPos: ', anchorPos);
        console.log('anchorSize: ', anchorSize);
        console.log('anchorLeadingMargin: ', anchorLeadingMargin);
        console.log('anchorTrailingMargin: ', anchorTrailingMargin);
        

        this._first = this._last = anchor;
        this._physicalMin = anchorPos - anchorLeadingMargin;
        this._physicalMax = anchorPos + anchorSize + anchorTrailingMargin;
        console.log('this._physicalMin: ', this._physicalMin);
        console.log('this._physicalMax: ', this._physicalMax);
     
        
        while (this._physicalMin > topOffset && this._first > 0) {

            let size = this.getSize(--this._first);
            let margin = this.margins.getSizeAtIndexOrAverage(this._first);
            this._physicalMin -= size;
            const pos = this._physicalMin;
            console.log('\nLAST: \nfirst: ', this._first);
            console.log('pos: ', pos);
            console.log('size: ', size);
            
            this.#renderedChildrenPositions.set(this._first.toString(), { pos, size });
            this._physicalMin -= margin;
            console.log('_physicalMin: ', this._physicalMin);
        }
        while (this._physicalMax < bottomOffset && this._last < this.#items.length - 1) {
            
            let size = this.getSize(++this._last);
            let margin = this.margins.getSizeAtIndexOrAverage(this._last);
            this._physicalMin -= size;
            const pos = this._physicalMax;
            console.log('\nLAST:\nlast: ', this._last);
            console.log('pos: ', pos);
            console.log('size: ', size);
            
            this.#renderedChildrenPositions.set(this._first.toString(), { pos, size });
            this._physicalMax += size + margin;
            console.log('_physicalMax: ', this._physicalMax);
        }
        console.log('rendered child: ', this.#renderedChildrenPositions);
        console.log('my new first: ', this._first);
        console.log('my new last: ', this._last);
        super.requestUpdate();
    }


   
    // resetReflow() {
    //     if (this._pendingLayoutUpdate) {
    //         this._pendingLayoutUpdate = false;
    //     }
    // }

    // getRenderedItemPosition(index) {
    //     return null;
    // }

    calculateUnrenderedItemPosition(index) {
        if (this._first === -1 || this._last === -1) {
            return this.margins.average + (index * this.heights.average + this.margins.average);
        } else if (index < this._first) {
            const d = this._first - index;
            return this.#renderedChildrenPositions[this._first]
                - this.margins.getSizeAtIndexOrAverage(this._first - 1)
                - (d * this.heights.average) + ( (d - 1) * this.margins.average )
        } else {
            const d = index - this._last;
            return this.#renderedChildrenPositions[this._last]
                + this.heights.getSizeAtIndexOrAverage(this._last) + this.margins.getSizeAtIndexOrAverage(this._last)
                + d * (this.heights.average + this.margins.average)
        }
    }

    getItemPosition(index) {
        if (index === 0) {
            return this.margins.getSizeAtIndexOrAverage(index);
        } else {
            const renderedPosition = this.#renderedChildrenPositions[index];
            if (renderedPosition != null) {
                return renderedPosition;
            }
            return this.calculateUnrenderedItemPosition(index);
        }
    }

    // calculateInitialPosition() {
    //     let pos;
    //     if (this.#initialPin === 'top') {
    //         pos = 0;
    //     } else if (this.#initialPin === 'bottom') {
    //         pos = this.#items.length * this.heights.initial;
    //     } else {
    //         return this.#currentScrollPos;
    //     }
    //     return pos;
    //     // pos += this.#offsetInScroller;
    //     // return clamp(-this.#offsetInScroller, pos, this.#realScrollHeight);
    // }

    /**
     * set (physical)items to render in the range -> sets the position and the height for each item
     *      1. set the anchor
     *      
     *      2. in the loops
     *          -> calculate height and margin and sets these in metrics cache
     *          -> pos is equal to physicalMin / -Max
     *          -> size is equal to - 1. size, thats stored in this map or in the size cache map
     *              -> if there is no size -> use the average or default one (100px)
     *                     -> order
     *                      1. physical map size
     *                      2. chached map real size
     *                      1. chached map average size
     *                      1. default size (100) size
     *          2.1 set from first?
     *          2.2 set from last?
     * 
     *      sets stable to true and achors to null, after the reflow, when:
     *                                                          this._first === -1 && this._last == -1
     *                                                       or first and last before reflow are the same after reflow
     *              -> means -> set first items in newPhysical items, if stable set to physicalitems
     *    -> when getting physical item, get first from newPhysical, then from physical
     */




    




    setHeightToEstimatedScrollHeight() {
        this.style.minHeight = `${Math.min(8200000, this.#estimatedScrollHeight)}px`;
    }
    
    /**
     * Updates initiated Mutationsobserver:
     *  new Children mounted -> update the positions by the children positions array
     */
    onChildsAmountChange() {
        if (!this._connected)
            return;
        this.observeChildren();
        this._childrenPos = null;
        this._childrenPos?.forEach((pos, index) => {
            const child = this.children[index - this._first];
            if (child && child instanceof HTMLElement) {
                child.style.position = 'absolute';
                child.style.boxSizing = 'border-box';
                child.style.transform = `translate(0px, ${pos}px)`;
                // @ts-ignore GET LEADING MARGIN VALUE OF FIRST ELEM!!!
                child.style.top = yOffset === undefined ? null : yOffset + 'px';
            }
        });
        this.setHeightToEstimatedScrollHeight();
    }


    /**
     * Measure flow ->
     * 1. observe the sizing of all children
     * 2. get boundingrects of all changes -> set these to a map with the child(change.target) as the key
     * 3. get all current children (rendered and visible), iterate over these, set in a map at index first + i the 
     * 3. set the rects 
     */

    /**
     * Updates initiated Resizeobserver of Children:
     * child sizes changed -> get their sizes and fill the cache with values
     */
    /** @param {ResizeObserverEntry[]} changes */
    onChildSizeChange(changes) {
        console.log('onChildSizeChange');
        const changesMap = new Set();
        for (let i = 0; i < changes.length; ++i) {
            if (changes[i]?.target instanceof HTMLElement)
                changesMap.add( changes[i].target);
        }
        for (let i = 0; i < this.children.length; ++i) {
            const child = this.children[i];
            const prevChild = this.children[i - 1];
            if (changesMap.has(child) && (prevChild == undefined || changesMap.has(prevChild))) {
                const idx = this._first + i;
                this.heights.set(idx, child.getBoundingClientRect().height);
                const marginBottomPrev = prevChild ? getMarginAsNumber(window.getComputedStyle(prevChild).marginBottom) : 0;
                const marginTopCurr = getMarginAsNumber(window.getComputedStyle(child).marginTop);
                this.margins.set(idx, collapseMargins(marginBottomPrev, marginTopCurr));
            }
        }

        this.scheduleLayoutUpdate();
        // this._toBeMeasured.clear();
        // if (this._layoutCompletePromise && this._pendingLayoutComplete === null) {
        //     this._pendingLayoutComplete = requestAnimationFrame(() =>
        //         requestAnimationFrame(() => this._resolveLayoutCompletePromise())
        //     );
        // }
        // this._itemsChanged = false;
    }




    render() {
        console.log('VIRTUALIZER RENDER');
        
        const items = [];
        const first = clamp(0, this._first, this.#items.length);
        const last = clamp(0, this._last, this.#items.length);
        console.log('items to render: ', last - first);
        
        for (let i = first; i < last; ++i) {
            items.push(this.#items[first]);
        }
        return html`${items.map((item, idx) => this.#renderCb(item, idx))}`;
    }



    // _updateVisibleIndices() {
    //     console.log('_updateVisibleIndices: start first: ', this._first);
    //     console.log('_updateVisibleIndices: start last: ', this._last);
    //     console.log('_updateVisibleIndices: start: firstVisible: ', this._firstVisible);
    //     console.log('_updateVisibleIndices: start: lastVisible: ', this._lastVisible);
        
    //     if (this._first === -1 || this._last === -1) {
    //         console.log('_updateVisibleIndices : some -1 -> RETURN!!');
    //         return;
    //     }

    //     let firstVisible = this._first;
    //     console.log('_updateVisibleIndices - deb1');
    //     while ( firstVisible < this._last) {
    //         console.log('--loop : _updateVisibleIndices : first visible: ', firstVisible);
            
    //         const pos = this._getItemPositionY(firstVisible);
    //         console.log('--loop : _updateVisibleIndices : pos: ', pos);
            
    //         const itemHeight = this._getSize(firstVisible) || this.predictedItemHeight();
    //         console.log('--loop : _updateVisibleIndices : itemHeight: ', itemHeight);
    //         if (Math.round(pos +  itemHeight ) <= Math.round(this._scrollPosition))
    //             break;
    //         firstVisible++;
    //     }
    //     console.log('_updateVisibleIndices - deb2');
        

    //     let lastVisible = this._last;
    //     while (lastVisible > this._first) {
    //         const pos = this._getItemPositionY(lastVisible);
    //         if (Math.round(pos) >= Math.round(this._scrollPosition + this._viewportSize.height))
    //             break;
    //         lastVisible--;
    //     }
    //     console.log('_updateVisibleIndices: end: firstVisible: ', firstVisible);
    //     console.log('_updateVisibleIndices: end: lastVisible: ', lastVisible);
        
    //     if (firstVisible !== this._firstVisible)
    //         this._firstVisible = firstVisible;
    //     if (lastVisible !== this._lastVisible)
    //         this._lastVisible = lastVisible;
    // }





}
customElements.define("virt-ualizer", Virtcomp);



export class VirtTest extends BaseElement {
    constructor() {
        super(false, false);

        this.data = Array.from({length: 100});
        console.log('data: ', this.data);
        this.data = this.data.map((v, i) => ({item: i}))
        console.log('data: ', this.data);
    }

    scrollRef = createRef();
    
    // 
    render() {
        console.log('render virtcomp, data: ', this.data);
        
        return html`
            <div ${ref(this.scrollRef)} class="mt-5 overflow-scroll" style="${"height: 150px"}">
                <virt-ualizer
                .scrollref=${this.scrollRef}
                .items=${this.data}
                .rendercb=${(item) => html`<p class="bg-success">Hallo item</p>`}
                ></virt-ualizer>
            </div>
        `;
    }

}
customElements.define("virt-test", VirtTest);

// const OVERHANG = 1000;

// export class SizeCache {
//     /** @type {Map < number | string, number >} */
//     #map = new Map();
//     #totalSize = 0;
//     #avg = 0;
//     #initial = 0;


//     /** @param {number} [initialAvg]  */
//     constructor(initialAvg) {
//         if (initialAvg != undefined) {
//             this.#avg = initialAvg;
//             this.#initial = initialAvg;
//         }
//     }

//     getSizeAtIndexOrAverage(index) {
//         return this.#map.get(index) ?? this.average;
//     }

//     get initial() {
//         return this.#initial;
//     }

//     get average() {
//         return this.#avg
//     }

//     /**
//      * @param {number | string} index 
//      * @param {number} value 
//      */
//     set(index, value) {
//         const prev = this.#map.get(index) || 0;
//         this.#map.set(index, value);
//         this.#totalSize += value - prev;
//         this.#avg = this.#totalSize / this.#map.size
//     }
// }


// /**
//  * @typedef {import('../BaseBase.js').Tpl} Tpl
//  * @typedef {import('../BaseBase.js').BaseBaseProps} BaseBaseProps
//  */

// /**
//  * @template T
//  * @typedef {(item: T, idx: number) => Tpl} RenderItemFunction
//  */

// /**
//  * @template T
//  * @typedef {object} VirtData
//  * @property {RenderItemFunction<T>} rendercb
//  * @property {T[]} [items]
//  * @property {import('../BaseElement.js').Ref<HTMLElement>} [scrollref]
//  */

// /**
//  * @template T
//  * @typedef {BaseBaseProps & VirtData<T> } VirtProps
//  */

// /** @type {RenderItemFunction<unknown>} */
// const defaultRenderItem = (item, idx) => html`${idx}: ${JSON.stringify(item, null, 2)}`;

// /**
//  * @prop rendercb
//  * @prop items
//  * @template T
//  * @extends BaseElement<VirtProps<T>>
//  */
// export class Virtcomp extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.props.rendercb = (item, idx) => defaultRenderItem(item, idx);
//         this.props.items = [];
//     }
//     #items = [];
//     /** @type {HTMLElement | null} */
//     #scrollref = null;
//     #renderCb = (i, v) => {};
//     /** @type {'top' | 'bottom' | null} */
//     #initialPin = 'bottom';
//     #realScrollHeight = 0;
//     #estimatedScrollHeight = 0;
//     /** @type {Map<string, {pos: number, size: number}>} */
//     #renderedChildrenPositions = new Map();
//     #offsetInScroller = 0;
//     #currentScrollPos = 0;
//     #viewPortHeight = 0;
//     _first = -1;
//     _last = -1;
//     _physicalMin = 0;
//     _physicalMax = 0;
//     // _firstVisible = 0;
//     // _lastVisible = 0;
//     // _scrollEventListeners = []
//     _scrollEventListenerOptions = {passive:true}
//     _mutationObserver = new MutationObserver( this.onChildsAmountChange.bind(this) );
//     // _hostElementRO = new ResizeObserver( this.scheduleLayoutUpdate.bind(this) );
//     #childrenRO = new ResizeObserver(this.onChildSizeChange.bind(this));
//     // _viewportSize = {height: 0, width:0}
//     // _scrollPosition = 0;
//     // _pin = 0;
//     // _overhang = 1000;
//     // _scrollHeight = 1;
//     // _scrollError = 0;
//     // _physicalMin = 0;
//     // _physicalMax = 0;

//     // _physicalItems = new Map();
//     // _newPhysicalItems = new Map();
//     // _stable = true;
//     // _estimate = true;

//     heights = new SizeCache(100);
//     margins = new SizeCache();
//     // cache = new Map();
//     #leadingMargin = 0;
//     #trailingMargin = 0;

//     // @ts-ignore
//     onPropChange(key, value) {
//         console.log('onPropChange: value: ', value);
        
//         if (key === 'items') {
//             if (Array.isArray(value)) {
//                 if (value !== this.#items) {
//                     this.#items = value;
//                     this.scheduleReflow();
//                 }
//             }
//         } else if (key === 'scrollref' && value instanceof Ref) {
//             this.#scrollref = value.value;
//         } else if (key === 'rendercb' && typeof value === 'function') {
//             this.#renderCb = value;
//         }
//         return false;
//     }


//     connectedCallback() {
//         super.connectedCallback();

//         this.style.display = 'block';
//         this.style.position = 'relative';
//         this.style.contain = 'size layout';

//         this._connected = true;
//         this._mutationObserver.observe(this, { childList: true });
//         // this._hostElementRO.observe(this);
        
//         this.observeChildren();
//         this.initScroll();
//         this.scheduleLayoutUpdate();
//     }

//     async initScroll() {
//         console.log('initScroll');
        
//         await this.updateComplete;
//         console.log('initScroll awaited - scroller? :', this.#scrollref);
//         if (this.#scrollref) {
//             this.#scrollref.addEventListener( 'scroll', this, this._scrollEventListenerOptions);
//         }
//     }

//     async scheduleLayoutUpdate() {
//         await Promise.resolve();
//         this.updateLayout();
//     }

//     scheduleReflow() {
//         this.shouldReflow = true;
//     }


//     observeChildren() {
//         const children = this.children;
//         let i = 0;
//         while (this.#childrenRO && i < children.length) {
//             this.#childrenRO.observe(children[i]);
//             i++;
//         }
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         // @ts-ignore
//         this.#scrollref.removeEventListener( 'scroll', this, this._scrollEventListenerOptions ) 
//         this._scrollEventListeners = [];
//         this._clippingAncestors = [];
//         this._mutationObserver.disconnect();
//         // this._hostElementRO.disconnect();
//         this.#childrenRO.disconnect();
//         this._connected = false;
//     }

//     /**
//      * Updates initiated by: scrolling -> schedule Layout
//      */
//     /** @param {CustomEvent} event  */
//     handleEvent(event) {
//         console.log('handle scroll event!');
//         if (event.type === 'scroll' && event.currentTarget === this.#scrollref) {
//             this.scheduleLayoutUpdate();
//         }
//     }

//     updateEstimatedScrollHeight() {
//         this.#estimatedScrollHeight = getScrollHeight(this.#items.length, this.margins.average, this.heights.average);
//     }

//     /**
//      * schedule reflow if:
//      * 1. threshold -> initial + new items are in the viewscreen + overhang
//      * 2. new items were set
//      */


//     updateLayout() {
//         if (!(this._connected && this.#scrollref)) 
//             return;
//         // console.log('\n!!!!! _updateLayout');
        
//         const hostElementBounds = this.getBoundingClientRect();
//         const scrollerBounds = this.#scrollref.getBoundingClientRect()
//         // console.log('hostElement: ',this);
//         // console.log('scroller: ', this.#scrollref);
//         // console.log('hostElementBounds: ',hostElementBounds);
//         // console.log('scrollerBounds: ', scrollerBounds);
//         // console.log('scrolltop: ', this.scrollTop);
//         // console.log('scroller scrolltop: ', this.#scrollref.scrollTop);
//         // console.log('calc: ',  scrollerBounds.top - hostElementBounds.top + this.scrollTop);
        
        
        
        
//         this.#realScrollHeight = this.#scrollref.scrollHeight ?? 1;

//         const currHeight = this.#viewPortHeight;
//         this.#viewPortHeight = scrollerBounds.height;

//         const currScrollPos = this.#currentScrollPos;
//         this.#currentScrollPos = this.#scrollref.scrollTop;
        
//         console.log('scrollpos: ', this.#currentScrollPos);
        
//         // console.log('scrolldiff: ',  Math.abs(currScrollPos - this.#scrollref.scrollTop));
        
//         if (currHeight !== scrollerBounds.height || Math.abs(currScrollPos - this.scrollTop) >= 1) {
//             // console.log('change happened!');
//             // console.log('change happened!: currHeight', currHeight);
//             // console.log('change happened!: scrollerBounds.height', scrollerBounds.height);
//             // console.log('change happened!: currScrollPos', currScrollPos);
//             // console.log('change happened!: this.scrollTop', this.scrollTop);
//             const min = Math.max(0, this.#currentScrollPos - OVERHANG);
//             const max = Math.min(this.#estimatedScrollHeight, this.#currentScrollPos + this.#viewPortHeight + OVERHANG);
//             // console.log('schwellenwert!!!!: min: ', min);
//             // console.log('schwellenwert!!!!: max: ', max);
//             // console.log('schwellenwert!!!!: this._physicalMax: ', this._physicalMax);
//             // console.log('schwellenwert!!!!: this._physicalMin: ', this._physicalMin);
//             if (this._physicalMin > min || this._physicalMax < max) {
                
//                 this.scheduleReflow();
//             }
            
//             /**
//              * example min: scrollpos is 0 -> on the top -> -1000 is min
//              * if physicalmin > 1000 ?
//              */
//         }

//         if (this.shouldReflow) {
//             this.shouldReflow = false;
//             this.reflow();
//         }

//         // if (this._physicalMin > min || this._physicalMax < max) {
//         //     this._scheduleReflow();
//         // } else {
//         //     this._updateVisibleIndices({ emit: true });
//         // }

//     }

//     reflow() {
//         console.log('reflow');
        
//         this.#estimatedScrollHeight = getScrollHeight(this.#items.length ?? 0, this.margins.average, this.heights.average);
//         // this.#currentScrollPos = this.calculateInitialPosition()
//         // this.getItems()
//         // updateVisible?
//         // createChildrenspositions
//         this.getItemsToRender(OVERHANG);

//     }


//     // getInitialItemsToRender(overhang = 1000) {

//     //     // let lower = this.#currentScrollPos - overhang;
//     //     // let 
//     //     // while ()
//     //     // let upper = this.#currentScrollPos + this.#viewPortHeight + overhang;
            
//     // }

//     getSize(i) {
//         return this.#renderedChildrenPositions[i] ? this.heights.getSizeAtIndexOrAverage(i) : this.heights.average;
//     }

//     getItemsToRender(overhang, initial) {
//         // if (initial) {
//         //     let anchor = { index: 0, pos: 0 };
//         //     if (this.#initialPin === 'top') {
//         //         anchor.index = 0;
//         //         anchor.pos = 0;
//         //     } else if (this.#initialPin === 'bottom') {
//         //         anchor.index = this.#items.length;
//         //         anchor.pos = this.#items.length * this.heights.initial;
//         //     } else {
//         //         return null;
//         //     }
//         // }
//         // if (this.#viewPortHeight === 0 || this.#items.length === 0) {
//         //     return 0;
//         // }
//         findFirstAndLast()
        
        
//         let topOffset = this.#currentScrollPos - overhang;
//         let bottomOffset = this.#currentScrollPos + this.#viewPortHeight + overhang;
//         console.log('topOffset: ', topOffset);
//         console.log('bottomOffset: ', bottomOffset);
        
//         let anchor;
//         if (topOffset <= 0) {
//             anchor = 0;
//         } else if (bottomOffset > this.#estimatedScrollHeight - this.#viewPortHeight) {
//             anchor = this.#items.length -1;
//         } else {
//             const diff = topOffset + bottomOffset;
//             const size = this.heights.average + this.margins.average;
//             anchor = clamp(0, Math.floor( diff / 2 / size), this.#items.length - 1)
//         }
//         const anchorPos = this.getItemPosition(anchor);
//         const anchorSize = this.getSize(anchor);
//         const anchorLeadingMargin = this.margins.getSizeAtIndexOrAverage(anchor);
//         const anchorTrailingMargin = this.margins.getSizeAtIndexOrAverage(anchor + 1);


//         console.log('anchor: ', anchor);
//         console.log('anchorPos: ', anchorPos);
//         console.log('anchorSize: ', anchorSize);
//         console.log('anchorLeadingMargin: ', anchorLeadingMargin);
//         console.log('anchorTrailingMargin: ', anchorTrailingMargin);
        

//         this._first = this._last = anchor;
//         this._physicalMin = anchorPos - anchorLeadingMargin;
//         this._physicalMax = anchorPos + anchorSize + anchorTrailingMargin;
//         console.log('this._physicalMin: ', this._physicalMin);
//         console.log('this._physicalMax: ', this._physicalMax);
     
        
//         while (this._physicalMin > topOffset && this._first > 0) {

//             let size = this.getSize(--this._first);
//             let margin = this.margins.getSizeAtIndexOrAverage(this._first);
//             this._physicalMin -= size;
//             const pos = this._physicalMin;
//             console.log('\nLAST: \nfirst: ', this._first);
//             console.log('pos: ', pos);
//             console.log('size: ', size);
            
//             this.#renderedChildrenPositions.set(this._first.toString(), { pos, size });
//             this._physicalMin -= margin;
//             console.log('_physicalMin: ', this._physicalMin);
//         }
//         while (this._physicalMax < bottomOffset && this._last < this.#items.length - 1) {
            
//             let size = this.getSize(++this._last);
//             let margin = this.margins.getSizeAtIndexOrAverage(this._last);
//             this._physicalMin -= size;
//             const pos = this._physicalMax;
//             console.log('\nLAST:\nlast: ', this._last);
//             console.log('pos: ', pos);
//             console.log('size: ', size);
            
//             this.#renderedChildrenPositions.set(this._first.toString(), { pos, size });
//             this._physicalMax += size + margin;
//             console.log('_physicalMax: ', this._physicalMax);
//         }
//         console.log('rendered child: ', this.#renderedChildrenPositions);
//         console.log('my new first: ', this._first);
//         console.log('my new last: ', this._last);
//         super.requestUpdate();
//     }


   
//     // resetReflow() {
//     //     if (this._pendingLayoutUpdate) {
//     //         this._pendingLayoutUpdate = false;
//     //     }
//     // }

//     // getRenderedItemPosition(index) {
//     //     return null;
//     // }

//     calculateUnrenderedItemPosition(index) {
//         if (this._first === -1 || this._last === -1) {
//             return this.margins.average + (index * this.heights.average + this.margins.average);
//         } else if (index < this._first) {
//             const d = this._first - index;
//             return this.#renderedChildrenPositions[this._first]
//                 - this.margins.getSizeAtIndexOrAverage(this._first - 1)
//                 - (d * this.heights.average) + ( (d - 1) * this.margins.average )
//         } else {
//             const d = index - this._last;
//             return this.#renderedChildrenPositions[this._last]
//                 + this.heights.getSizeAtIndexOrAverage(this._last) + this.margins.getSizeAtIndexOrAverage(this._last)
//                 + d * (this.heights.average + this.margins.average)
//         }
//     }

//     getItemPosition(index) {
//         if (index === 0) {
//             return this.margins.getSizeAtIndexOrAverage(index);
//         } else {
//             const renderedPosition = this.#renderedChildrenPositions[index];
//             if (renderedPosition != null) {
//                 return renderedPosition;
//             }
//             return this.calculateUnrenderedItemPosition(index);
//         }
//     }

//     // calculateInitialPosition() {
//     //     let pos;
//     //     if (this.#initialPin === 'top') {
//     //         pos = 0;
//     //     } else if (this.#initialPin === 'bottom') {
//     //         pos = this.#items.length * this.heights.initial;
//     //     } else {
//     //         return this.#currentScrollPos;
//     //     }
//     //     return pos;
//     //     // pos += this.#offsetInScroller;
//     //     // return clamp(-this.#offsetInScroller, pos, this.#realScrollHeight);
//     // }

//     /**
//      * set (physical)items to render in the range -> sets the position and the height for each item
//      *      1. set the anchor
//      *      
//      *      2. in the loops
//      *          -> calculate height and margin and sets these in metrics cache
//      *          -> pos is equal to physicalMin / -Max
//      *          -> size is equal to - 1. size, thats stored in this map or in the size cache map
//      *              -> if there is no size -> use the average or default one (100px)
//      *                     -> order
//      *                      1. physical map size
//      *                      2. chached map real size
//      *                      1. chached map average size
//      *                      1. default size (100) size
//      *          2.1 set from first?
//      *          2.2 set from last?
//      * 
//      *      sets stable to true and achors to null, after the reflow, when:
//      *                                                          this._first === -1 && this._last == -1
//      *                                                       or first and last before reflow are the same after reflow
//      *              -> means -> set first items in newPhysical items, if stable set to physicalitems
//      *    -> when getting physical item, get first from newPhysical, then from physical
//      */




    




//     setHeightToEstimatedScrollHeight() {
//         this.style.minHeight = `${Math.min(8200000, this.#estimatedScrollHeight)}px`;
//     }
    
//     /**
//      * Updates initiated Mutationsobserver:
//      *  new Children mounted -> update the positions by the children positions array
//      */
//     onChildsAmountChange() {
//         if (!this._connected)
//             return;
//         this.observeChildren();
//         this._childrenPos = null;
//         this._childrenPos?.forEach((pos, index) => {
//             const child = this.children[index - this._first];
//             if (child && child instanceof HTMLElement) {
//                 child.style.position = 'absolute';
//                 child.style.boxSizing = 'border-box';
//                 child.style.transform = `translate(0px, ${pos}px)`;
//                 // @ts-ignore GET LEADING MARGIN VALUE OF FIRST ELEM!!!
//                 child.style.top = yOffset === undefined ? null : yOffset + 'px';
//             }
//         });
//         this.setHeightToEstimatedScrollHeight();
//     }


//     /**
//      * Measure flow ->
//      * 1. observe the sizing of all children
//      * 2. get boundingrects of all changes -> set these to a map with the child(change.target) as the key
//      * 3. get all current children (rendered and visible), iterate over these, set in a map at index first + i the 
//      * 3. set the rects 
//      */

//     /**
//      * Updates initiated Resizeobserver of Children:
//      * child sizes changed -> get their sizes and fill the cache with values
//      */
//     /** @param {ResizeObserverEntry[]} changes */
//     onChildSizeChange(changes) {
//         const changesMap = new Set();
//         for (let i = 0; i < changes.length; ++i) {
//             if (changes[i]?.target instanceof HTMLElement)
//                 changesMap.add( changes[i].target);
//         }
//         for (let i = 0; i < this.children.length; ++i) {
//             const child = this.children[i];
//             const prevChild = this.children[i - 1];
//             if (changesMap.has(child) && (prevChild == undefined || changesMap.has(prevChild))) {
//                 const idx = this._first + i;
//                 this.heights.set(idx, child.getBoundingClientRect().height);
//                 const marginBottomPrev = prevChild ? getMarginAsNumber(window.getComputedStyle(prevChild).marginBottom) : 0;
//                 const marginTopCurr = getMarginAsNumber(window.getComputedStyle(child).marginTop);
//                 this.margins.set(idx, collapseMargins(marginBottomPrev, marginTopCurr));
//             }
//         }

//         this.scheduleLayoutUpdate();
//         // this._toBeMeasured.clear();
//         // if (this._layoutCompletePromise && this._pendingLayoutComplete === null) {
//         //     this._pendingLayoutComplete = requestAnimationFrame(() =>
//         //         requestAnimationFrame(() => this._resolveLayoutCompletePromise())
//         //     );
//         // }
//         // this._itemsChanged = false;
//     }




//     render() {
//         console.log('VIRTUALIZER RENDER');
        
//         const items = [];
//         const first = clamp(0, this._first, this.#items.length);
//         const last = clamp(0, this._last, this.#items.length);
//         console.log('items to render: ', last - first);
        
//         for (let i = first; i < last; ++i) {
//             items.push(this.#items[first]);
//         }
//         return html`${items.map((item, idx) => this.#renderCb(item, idx))}`;
//     }



//     // _updateVisibleIndices() {
//     //     console.log('_updateVisibleIndices: start first: ', this._first);
//     //     console.log('_updateVisibleIndices: start last: ', this._last);
//     //     console.log('_updateVisibleIndices: start: firstVisible: ', this._firstVisible);
//     //     console.log('_updateVisibleIndices: start: lastVisible: ', this._lastVisible);
        
//     //     if (this._first === -1 || this._last === -1) {
//     //         console.log('_updateVisibleIndices : some -1 -> RETURN!!');
//     //         return;
//     //     }

//     //     let firstVisible = this._first;
//     //     console.log('_updateVisibleIndices - deb1');
//     //     while ( firstVisible < this._last) {
//     //         console.log('--loop : _updateVisibleIndices : first visible: ', firstVisible);
            
//     //         const pos = this._getItemPositionY(firstVisible);
//     //         console.log('--loop : _updateVisibleIndices : pos: ', pos);
            
//     //         const itemHeight = this._getSize(firstVisible) || this.predictedItemHeight();
//     //         console.log('--loop : _updateVisibleIndices : itemHeight: ', itemHeight);
//     //         if (Math.round(pos +  itemHeight ) <= Math.round(this._scrollPosition))
//     //             break;
//     //         firstVisible++;
//     //     }
//     //     console.log('_updateVisibleIndices - deb2');
        

//     //     let lastVisible = this._last;
//     //     while (lastVisible > this._first) {
//     //         const pos = this._getItemPositionY(lastVisible);
//     //         if (Math.round(pos) >= Math.round(this._scrollPosition + this._viewportSize.height))
//     //             break;
//     //         lastVisible--;
//     //     }
//     //     console.log('_updateVisibleIndices: end: firstVisible: ', firstVisible);
//     //     console.log('_updateVisibleIndices: end: lastVisible: ', lastVisible);
        
//     //     if (firstVisible !== this._firstVisible)
//     //         this._firstVisible = firstVisible;
//     //     if (lastVisible !== this._lastVisible)
//     //         this._lastVisible = lastVisible;
//     // }





// }
// customElements.define("virt-ualizer", Virtcomp);



// export class VirtTest extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.data = Array.from({length: 100});
//         console.log('data: ', this.data);
//         this.data = this.data.map((v, i) => ({item: i}))
//         console.log('data: ', this.data);
//     }

//     scrollRef = createRef();
    
//     // 
//     render() {
//         console.log('render virtcomp, data: ', this.data);
        
//         return html`
//             <div ${ref(this.scrollRef)} class="mt-5 overflow-scroll" style="${"height: 150px"}">
//                 <virt-ualizer
//                 .scrollref=${this.scrollRef}
//                 .items=${this.data}
//                 .rendercb=${(item) => html`<p class="bg-success">Hallo item</p>`}
//                 ></virt-ualizer>
//             </div>
//         `;
//     }

// }
// customElements.define("virt-test", VirtTest);
