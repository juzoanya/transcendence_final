import { BaseElement, createRef, html, ref } from '../../../lib_templ/BaseElement.js';

export class SizeCache {
    /** @type {Map < number | string, number >} */
    map = new Map();
    totalSize = 0;
    avg = 0;

    /**
     * @param {number | string} index 
     * @param {number} value 
     */
    set(index, value) {
        const prev = this.map.get(index) || 0;
        this.map.set(index, value);
        this.totalSize += value - prev;
        this.avg = this.totalSize / this.map.size
    }
}


/**
 * @typedef {import('../../../lib_templ/BaseBase.js').Tpl} Tpl
 * @typedef {import('../../../lib_templ/BaseBase.js').BaseBaseProps} BaseBaseProps
 */

/**
 * @template T
 * @typedef {(item: T, idx: number) => Tpl} RenderItemFunction
 */

/**
 * @template T
 * @typedef {object} VirtData
 * @property {RenderItemFunction<T>} rendercb
 * @property {T[]} items
 * @property {import('../../../lib_templ/BaseElement.js').Ref<HTMLElement>} [scrollref]
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
        this.props.items = []
    }
    _first = -1;
    _last = -1;
    _firstVisible = 0;
    _lastVisible = 0;
    _scrollEventListeners = []
    _scrollEventListenerOptions = {passive:true}
    _mutationObserver = new MutationObserver( this.onChildsAmountChange.bind(this) );
    _hostElementRO = new ResizeObserver( this.scheduleLayoutUpdate.bind(this) );
    _childrenRO = new ResizeObserver(this.onChildSizeChange.bind(this));
    _viewportSize = {height: 0, width:0}
    _scrollPosition = 0;
    _pin = 0;
    _overhang = 1000;
    _scrollHeight = 1;
    _scrollError = 0;
    _physicalMin = 0;
    _physicalMax = 0;

    /** @type {Map < number, import('./layout/layout.js').FlowLayoutT.ItemBounds>} */
    _physicalItems = new Map();
    /** @type {Map < number, import('./layout/layout.js').FlowLayoutT.ItemBounds>} */
    _newPhysicalItems = new Map();
    _stable = true;
    _estimate = true;

    heights = new SizeCache();
    margins = new SizeCache();
    /** @type {Map<number, import('./layout/layout.js').LayoutT.Size & import('./layout/layout.js').LayoutT.Margins>} */
    cache = new Map();



    connectedCallback() {
        super.connectedCallback();

        this.style.display = 'block';
        this.style.position = 'relative';
        this.style.contain = 'size layout';

        this._connected = true;
        this._mutationObserver.observe(this, { childList: true });
        this._hostElementRO.observe(this);
        
        this.observeChildren();
        this.initScroll();
        this.scheduleLayoutUpdate();
    }

    async initScroll() {
        console.log('initScroll');
        
        await this.updateComplete;
        console.log('initScroll awaited - scroller? :', this.props.scrollref);
        if (this.props.scrollref?.value) {
            this.props.scrollref.value.addEventListener( 'scroll', this, this._scrollEventListenerOptions);
            this._scrollEventListeners.push(this.props.scrollref.value);
            this._hostElementRO.observe(this.props.scrollref.value);
        }
    }


    async scheduleLayoutUpdate() {
        await Promise.resolve();
        this._updateLayout();
    }

    observeChildren() {
        const children = this.children;
        let i = 0;
        while (this._childrenRO && i < children.length) {
            this._childrenRO?.observe(children[i]);
            i++;
        }
    }


    disconnectedCallback() {
        super.disconnectedCallback();
        this._scrollEventListeners.forEach((target) =>  target.removeEventListener( 'scroll', this, this._scrollEventListenerOptions )  );
        this._scrollEventListeners = [];
        this._clippingAncestors = [];
        // this._scrollerController.detach();
        this._mutationObserver.disconnect();
        this._hostElementRO.disconnect();
        this._childrenRO.disconnect();
        // if (this._layoutCompleteRejecter !== null) {
        //     this._layoutCompleteRejecter('disconnected');
        // }
        // this._resetLayoutCompleteState();
        this._connected = false;
    }

    /**
     * @param {{ [key: number]: import('./layout/layout.js').LayoutT.Size & import('./layout/layout.js').LayoutT.Margins}} metrics
     */
    updateMetricsCache(metrics) {
        /** @type {Set<number>} */
        const marginsToUpdate = new Set();
        console.log('updateMetricsCache: ', metrics);
        
        Object.keys(metrics).forEach((key) => {
            const k = Number(key);
            this.cache.set(k, metrics[k]);
            this.heights.set(k, metrics[k].height);
            marginsToUpdate.add(k);
            marginsToUpdate.add(k + 1);
        });
        for (const k of marginsToUpdate) {
            const a = this.cache.get(k)?.marginTop || 0;
            const b = this.cache.get(k - 1)?.marginBottom || 0;
            this.margins.set(k, collapseMargins(a, b));
        }
    }

    _updateLayout() {
        if (!(this._connected && this.props.scrollref?.value)) 
            return;
        // if (!(this._layout && this._connected && this._hostElement && this._scrollerController?.element && this._layout)) 
        //     return;

        // console.log('update Laylout');
        
        // if (this._layout._items !== this._items) {
        //     this._layout._items = this._items;
        //     this._pendingReflow = true;
        // }
        

        const hostElementBounds = this.getBoundingClientRect();
        const scrollerBounds = this.props.scrollref.value.getBoundingClientRect()
        console.log('hostElement: ',this);
        console.log('scroller: ', this.props.scrollref.value);
        console.log('hostElementBounds: ',hostElementBounds);
        console.log('scrollerBounds: ', scrollerBounds);
        
        let top = Math.max(hostElementBounds.top, scrollerBounds.top);
        let left = Math.max(hostElementBounds.left, scrollerBounds.left);
        let bottom = Math.min(hostElementBounds.bottom, scrollerBounds.bottom);
        let right = Math.min(hostElementBounds.right, scrollerBounds.right);
       
        console.log('calculated bounds:');
        console.log('top: ', top);
        console.log('left: ',left );
        console.log('bottom: ',bottom );
        console.log('right: ',right );
        
        const scrollTop = top - hostElementBounds.top + this.scrollTop;
        const scrollLeft = left - hostElementBounds.left + this.scrollLeft;
        const height = bottom - top;
        const width = right - left;
        console.log('scrollTop: ', scrollTop);
        console.log('scrollLeft: ', scrollLeft);

        const heightChange = this._viewportSize.height !== height;
        const widthChange = this._viewportSize.width !== width;
        const scrollChange = Math.abs(this._scrollPosition - top);

        console.log('setViewPortAndScroll: this._viewportSize: ', this._viewportSize);
        console.log('setViewPortAndScroll: this._scrollPosition: ', this._scrollPosition);
        console.log('setViewPortAndScroll: heightChange: ', heightChange);
        console.log('setViewPortAndScroll: widthChange: ', widthChange);
        console.log('setViewPortAndScroll: scrollChange: ', scrollChange);
        
        
        this._viewportSize.height = height;
        this._viewportSize.width = width;
        // this._latestCoords.top = top;
        // this._latestCoords.left = left;
        this._scrollPosition = top;
        if (scrollChange >= 1 || heightChange) {
            console.log('_checkThresholds');
        
            const itemsToDisplay = (this._first === -1 || this._last === -1) ? 0 : this._last - this._first + 1;
            if ((this._viewportSize.height === 0 && itemsToDisplay > 0) || this._pin !== null) {
                this._pendingReflow = true;
            } else {
                const min = Math.max(0, this._scrollPosition - this._overhang);
                const max = Math.min(  this._scrollHeight, this._scrollPosition + this._viewportSize.height + this._overhang );
                if (this._physicalMin > min || this._physicalMax < max) {
                    this._pendingReflow = true;
                } else {
                    console.log('_checkThresholds -> CALL _updateVisibleIndices');
                    this._updateVisibleIndices();
                }
            }
        }
        
        if (widthChange) {
            this._pendingLayoutUpdate = true;
            this._pendingReflow = true;
        }
        console.log('updateLayout: this._childMeasurements: ', this._childMeasurements);
        console.log('updateLayout: this._pendingReflow: ', this._pendingReflow);
        
        if (this._childMeasurements) {
            this.updateMetricsCache(this._childMeasurements);
            this._pendingReflow = true;
            this._childMeasurements = null;
        }
        if (this._pendingReflow) {
            this._pendingReflow = false;
        }
        this._reflow();
    }


    _reflow() {
        console.log('REFLOW');
        
        const { _first, _last } = this;
        if (this._pendingLayoutUpdate) {
            this._pendingLayoutUpdate = false;
        }
        console.log('REFLOW: this.margins.avg', this.margins.avg);
        console.log('REFLOW: this.avgSize()', this.avgSize());
        console.log('REFLOW: this.props.items.length', this.props.items.length);
        
        this._scrollHeight = Math.max( 1, this.props.items.length * (this.margins.avg + this.avgSize()) + this.margins.avg );
        console.log('REFLOW: scrollHeight: ',this._scrollHeight);
        console.log('REFLOW: this._viewportSize.height: ',this._viewportSize.height);
        
        if (this._viewportSize.height === 0 || this.props.items.length === 0) {
            console.log('REFLOW -> CLEAR ITEMS');
            
            this._clearItems();
        } else {
            console.log('REFLOW -> GET ITEMS');
            this._getItems();
        }
        console.log('REFLOW: call: _updateVisibleIndices');
        
        this._updateVisibleIndices();
        
        /** @type {Map<number, number>} */
        this._childrenPos = new Map();
        if (this._first !== -1 && this._last !== -1) {
            for (let idx = this._first; idx <= this._last; idx++) {
                this._childrenPos.set(idx, this._getItemPositionY(idx));
            }
        }
        this.onChildsAmountChange();
    }

    _updateVisibleIndices() {
        console.log('_updateVisibleIndices: start first: ', this._first);
        console.log('_updateVisibleIndices: start last: ', this._last);
        console.log('_updateVisibleIndices: start: firstVisible: ', this._firstVisible);
        console.log('_updateVisibleIndices: start: lastVisible: ', this._lastVisible);
        
        if (this._first === -1 || this._last === -1) {
            console.log('_updateVisibleIndices : some -1 -> RETURN!!');
            return;
        }

        let firstVisible = this._first;
        console.log('_updateVisibleIndices - deb1');
        while ( firstVisible < this._last) {
            console.log('--loop : _updateVisibleIndices : first visible: ', firstVisible);
            
            const pos = this._getItemPositionY(firstVisible);
            console.log('--loop : _updateVisibleIndices : pos: ', pos);
            
            const itemHeight = this._getSize(firstVisible) || this.avgSize();
            console.log('--loop : _updateVisibleIndices : itemHeight: ', itemHeight);
            if (Math.round(pos +  itemHeight ) <= Math.round(this._scrollPosition))
                break;
            firstVisible++;
        }
        console.log('_updateVisibleIndices - deb2');
        

        let lastVisible = this._last;
        while (lastVisible > this._first) {
            const pos = this._getItemPositionY(lastVisible);
            if (Math.round(pos) >= Math.round(this._scrollPosition + this._viewportSize.height))
                break;
            lastVisible--;
        }
        console.log('_updateVisibleIndices: end: firstVisible: ', firstVisible);
        console.log('_updateVisibleIndices: end: lastVisible: ', lastVisible);
        
        if (firstVisible !== this._firstVisible)
            this._firstVisible = firstVisible;
        if (lastVisible !== this._lastVisible)
            this._lastVisible = lastVisible;
    }

    /** @returns {number} */
    avgSize() {
        return this.heights.avg || 100;
    }

      /**
     * @param {number} idx 
     * @returns {number | undefined}
     */
      _getSize(idx) {
        const item = this._getPhysicalItem(idx);
        return item && this.heights.map.get(idx);
    }


    _clearItems() {
        this._first = -1;
        this._last = -1;
        this._physicalMin = 0;
        this._physicalMax = 0;
        const items = this._newPhysicalItems;
        this._newPhysicalItems = this._physicalItems;
        this._newPhysicalItems.clear();
        this._physicalItems = items;
        this._stable = true;
    }

    myanchor = -1;
    /*
    * Updates _first and _last based on items that should be in the given range.
    */
    _getItems() {
        
        const items = this._newPhysicalItems;
        console.log('_getItems, items: ', this._newPhysicalItems);
        this._stable = true;
        let lower, upper;
        
        lower = this._scrollPosition - this._overhang; //leadingOverhang;
        upper = this._scrollPosition + this._viewportSize.height + this._overhang; // trailingOverhang;
        console.log('_getItems, this._scrollPosition: ', this._scrollPosition);
        console.log('_getItems, lower: ', lower);
        console.log('_getItems, upper: ', upper);
        
        if (upper < 0 || lower > this._scrollHeight) {
            console.log('upper < 0 || lower > this._scrollHeight -> CLEAR ITEMS, return');
            this._clearItems();
            return;
        }
        // if (this.myanchor === -1) {
        //     this._first = this._last = 0;
        //     this._physicalMin = 0;
        //     this._physicalMax = 100;
        //     this.myanchor = 0;
        // }
        
        console.log('_getItems, this._physicalMin: ', this._physicalMin);
        console.log('_getItems, this._physicalMax: ', this._physicalMax);
        while (this._physicalMin > lower && this._first > 0) {
            console.log('WHILE: LOWER: _getItems: this._physicalMin: ', this._physicalMin, ', lower: ', lower, ', this._first', this._first);
            
            let size = this._getSize(--this._first);
            console.log('WHILE: LOWER: _getItems: size of ', this._first, ': ', size);
            if (size === undefined) {
                this._stable = false;
                size = this.avgSize();
                console.log('WHILE: LOWER: _getItems: calc new size ', size);
            }
            let margin = this.margins.map.get(this._first);
            if (margin === undefined) {
                this._stable = false;
                margin = this.margins.avg;
            }
            this._physicalMin -= size;
            items.set(this._first, { pos: this._physicalMin, size });
            this._physicalMin -= margin;
            if (this._stable === false && this._estimate === false) {
                break;
            }
        }

        while (this._physicalMax < upper && this._last < this.props.items.length - 1) {
            console.log('WHILE: UPPER: _getItems: this._physicalMax: ', this._physicalMax, ', upper: ', upper, ', this._last', this._last, ', max len: this.props.items.length - 1: ', this.props.items.length - 1);
            let size = this._getSize(++this._last);
            console.log('WHILE: UPPER: _getItems: size of ', this._first, ': ', size);
            if (size === undefined) {
                this._stable = false;
                size = this.avgSize();
                console.log('WHILE: UPPER: _getItems: calc new size ', size);
            }
            let margin = this.margins.map.get(this._last);
            if (margin === undefined) {
                this._stable = false;
                margin = this.margins.avg;
            }
            items.set(this._last, { pos: this._physicalMax, size });
            this._physicalMax += size + margin;
            if (!this._stable && !this._estimate) {
                break;
            }
        }

        let extentErr;
        const delta = this.avgSize() + this.margins.avg;
        if (this._first === 0) {
            extentErr = this._physicalMin;
        } else if (this._physicalMin <= 0) {
            extentErr = this._physicalMin - this._first * delta;
        } else if (this._last === this.props.items.length - 1) {
            extentErr = this._physicalMax - this._scrollHeight;
        } else if (this._physicalMax >= this._scrollHeight) {
            extentErr = ( this._physicalMax - this._scrollHeight + (this.props.items.length - 1 - this._last) * delta );
        } else {
            extentErr = 0;
        }

        // This handles the cases where we were relying on estimated sizes.
        
        if (extentErr) {
            this._physicalMin -= extentErr;
            this._physicalMax -= extentErr;
            // this._anchorPos -= extentErr;
            this._scrollPosition -= extentErr;
            items.forEach((item) => (item.pos -= extentErr));
            this._scrollError += extentErr;
        }

        if (this._stable) {
            this._newPhysicalItems = this._physicalItems;
            this._newPhysicalItems.clear();
            this._physicalItems = items;
        }
    }


    // /**
    //  * @param {Array < unknown > | undefined} items 
    //  */
    // set items(items) {
    //     if (Array.isArray(items) && items !== this.props.items) {
    //         this._itemsChanged = true;
    //         this.props.items = items;
    //         this.scheduleLayoutUpdate();
    //     }
    // }


    /**
     * Returns the top and left positioning of the item at idx.
     * @param {number} idx
     * @returns {number}
     */
    _getItemPositionY(idx) {
        const item = this._getPhysicalItem(idx);
        if (idx === 0) return this.margins.map.get(0) ?? this.margins.avg;
        if (item) return item.pos;

        if (this._first === -1 || this._last === -1)
            return ( this.margins.avg + idx * (this.margins.avg + this.avgSize()) );
        
        if (idx < this._first) {
            const delta = this._first - idx;
            const refItem = this._getPhysicalItem(this._first);
            if (refItem == undefined) throw new Error("!")
            return (
                refItem.pos - (this.margins.map.get(this._first - 1) || this.margins.avg) -
                (delta * this.heights.avg + (delta - 1) * this.margins.avg)
            );
        }
        const delta = idx - this._last;
        const refItem = this._getPhysicalItem(this._last);
        if (refItem == undefined) throw new Error("!")
        return (
            refItem.pos + (this.heights.map.get(this._last)
                || this.heights.avg) + (this.margins.map.get(this._last)
                || this.margins.avg) + delta * (this.heights.avg + this.margins.avg)
        );

        // return {
        //     top: posTop,
        //     left: 0,
        //     yOffset: -( this.cache.get(idx)?.marginTop ?? this.margins.avg ),
        // };
        // return {
        //     top: posTop,
        //     left: 0,
        //     yOffset: -( this.cache.get(idx)?.marginTop ?? this.margins.avg ),
        // };
    }



    /**
     * @param {number} idx 
     * @returns {import('./layout/layout.js').FlowLayoutT.ItemBounds | undefined}
     */
    _getPhysicalItem(idx) {
        return this._newPhysicalItems.get(idx) ?? this._physicalItems.get(idx);
    }

    onChildsAmountChange() {
        if (!this._connected)
            return;
        this.observeChildren();
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
    
        const max = 8200000;
        console.log('scrollHeight: ', this.scrollHeight);
        
        this.style.minHeight = `${Math.min(max, this._scrollHeight)}px`;
        
        // if (this._scrollError && this._scrollerController) {
        //     const { scrollTop, scrollLeft } = this._scrollerController;
        //     const { top, left } = this._scrollError;
        //     this._scrollError = null;
        //     // this._scrollerController.correctScrollError({
        //     //     top: scrollTop - top,
        //     //     left: scrollLeft - left,
        //     // });
        // }
    }


    /** @param {CustomEvent} event  */
    handleEvent(event) {
        console.log('handle scroll event!');
        if (event.type === 'scroll' && event.currentTarget === this.props.scrollref?.value) {
            // if (this._scrollerController?.correctingScrollError === false) {
            //     // This is a user-initiated scroll, so we unpin the layout
            //     // this._layout?.unpin();
            // }
            this.scheduleLayoutUpdate();
        }
    }

    // /** @returns {Array < HTMLElement >} */
    // get _children() {
    //     /** @type {Array<HTMLElement>} */
    //     const arr = [];
    //     let next = this._hostElement?.firstElementChild;
    //     while(next) {
    //         if (!next.hasAttribute(SIZER_ATTRIBUTE) && next instanceof HTMLElement) {
    //             arr.push(next);
    //         }
    //         next = next.nextElementSibling;
    //     }
    //     return arr;
    // }

    // /** @returns {Promise < void>} */
    // get layoutComplete() {
    //     // Lazily create promise
    //     if(!this._layoutCompletePromise) {
    //         this._layoutCompletePromise = new Promise((resolve, reject) => {
    //             this._layoutCompleteResolver = resolve;
    //             this._layoutCompleteRejecter = reject;
    //         });
    //     }
    //     return this._layoutCompletePromise;
    // }

    // _resolveLayoutCompletePromise() {
    //     if (this._layoutCompleteResolver !== null) {
    //         this._layoutCompleteResolver();
    //     }
    //     this._resetLayoutCompleteState();
    // }

    // _resetLayoutCompleteState() {
    //     this._layoutCompletePromise = null;
    //     this._layoutCompleteResolver = null;
    //     this._layoutCompleteRejecter = null;
    //     this._pendingLayoutComplete = null;
    // } 

    /** @param {ResizeObserverEntry[]} changes */
    onChildSizeChange(changes) {
        const changesMap = new Map();
        let i = 0;
        while (i < changes.length) {
            const change = changes[i];
            if (change?.target instanceof HTMLElement) {
                changesMap.set( change.target, change.contentRect );
            }
            i++;
        }
        i = 0;
        this._childMeasurements = {};
        const children = this.children;
        while (i < children.length) {
            const child = children[i];
            if (changesMap.has(child)) {
                const idx = this._first + i;
                const style = window.getComputedStyle(child);
                this._childMeasurements[idx] = {
                    marginTop: getMarginValue(style.marginTop),
                    marginBottom: getMarginValue(style.marginBottom),
                    height: child.getBoundingClientRect().height,
                };
            }
            i++;
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


    // _scrollRef = createRef();
    _containerRef = createRef();
    render() {
        return html`${this.props.items.map((item, idx) => this.props.rendercb(item, idx))}`;
    }

}
customElements.define("virt-ualizer", Virtcomp);



function getMarginValue(value) {
    const float = value ? parseFloat(value) : NaN;
    return Number.isNaN(float) ? 0 : float;
}


/**
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
export function collapseMargins(a, b) {
    const m = [a, b].sort();
    return m[1] <= 0 ? Math.min(...m) : m[0] >= 0 ? Math.max(...m) : m[0] + m[1];
}
