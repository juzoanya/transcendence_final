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
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
export function collapseMargins(a, b) {
    const m = [a, b].sort();
    return m[1] <= 0 ? Math.min(...m) : m[0] >= 0 ? Math.max(...m) : m[0] + m[1];
}

// BaseLayout<BaseLayoutConfig>
export class FlowLayout {
    /** @type {import('./layout.js').LayoutT.Positions} */
    _latestCoords = { left: 0, top: 0 };

    /** @type {import('./layout.js').LayoutT.Size} */
    _viewportSize = { width: 0, height: 0 };

    _pendingReflow = false;
    _pendingLayoutUpdate = false;
    /** @type {import('./layout.js').LayoutT.PinOptions | null} */
    _pin = null;
    _firstVisible = 0;
    _lastVisible = 0;
    _physicalMin = 0;
    _physicalMax = 0;
    _first = -1;
    _last = -1;
    _scrollPosition = 0;
    _scrollError = 0;
    _items = [];
    _scrollSize = 1;
    _overhang = 1000;

  
    /** @type {Map < number, import('./layout.js').FlowLayoutT.ItemBounds>} */
    _physicalItems = new Map();
    /** @type {Map < number, import('./layout.js').FlowLayoutT.ItemBounds>} */
    _newPhysicalItems = new Map();
    _stable = true;
    _estimate = true;

    heights = new SizeCache();
    margins = new SizeCache();
    /** @type {Map<number, import('./layout.js').LayoutT.Size & import('./layout.js').LayoutT.Margins>} */
    cache = new Map();

    /**
     * @param {{ [key: number]: import('./layout.js').LayoutT.Size & import('./layout.js').LayoutT.Margins}} metrics
     */
    updateMetricsCache(metrics) {
        /** @type {Set<number>} */
        const marginsToUpdate = new Set();
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

    clear() {
        this.heights.map.clear();
        this.heights.totalSize = 0;
        this.heights.avg = 0;

        this.margins.map.clear();
        this.margins.totalSize = 0;
        this.margins.avg = 0;

        this.cache.clear();
    }


    /** @returns {number} */
    avgSize() {
        return this.heights.avg || 100;
    }


    /** @param {import('./layout').LayoutT.LayoutChangedCb} onChangeCb */
    constructor(onChangeCb) {
        this.onChangeCb = onChangeCb;
        Promise.resolve();
    }


    /** @param {{width: number, height: number, top: number, left: number}} x  */
    setViewPortAndScroll({width, height, top, left}) {
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
        this._latestCoords.top = top;
        this._latestCoords.left = left;
        this._scrollPosition = top;
        if (scrollChange >= 1 || heightChange) {
            const itemsToDisplay = (this._first === -1 || this._last === -1) ? 0 : this._last - this._first + 1;
            if ((this._viewportSize.height === 0 && itemsToDisplay > 0) || this._pin !== null) {
                this._pendingReflow = true;
            } else {
                const min = Math.max(0, this._scrollPosition - this._overhang);
                const max = Math.min(
                    this._scrollSize,
                    this._scrollPosition + this._viewportSize.height + this._overhang
                );
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
    }

    unpin() {
        if (this._pin !== null) {
            // this._sendUnpinnedMessage();
            this._pin = null;
        }
    }

    _triggerReflow() {
        this._pendingLayoutUpdate = true;
        this._pendingReflow = true;
  
        Promise.resolve().then(() => {
            if (this._pendingReflow) {
                this._pendingReflow = false;
                this._reflow();
            }
        });
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
            if (Math.round(pos.top +  itemHeight ) <= Math.round(this._scrollPosition))
                break;
            firstVisible++;
        }
        console.log('_updateVisibleIndices - deb2');
        

        let lastVisible = this._last;
        while (lastVisible > this._first) {
            const pos = this._getItemPositionY(lastVisible);
            if (Math.round(pos.top) >= Math.round(this._scrollPosition + this._viewportSize.height))
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


    /**
     * @param {number} idx 
     * @returns {import('./layout.js').FlowLayoutT.ItemBounds | undefined}
     */
    _getPhysicalItem(idx) {
        return this._newPhysicalItems.get(idx) ?? this._physicalItems.get(idx);
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
        
        if (upper < 0 || lower > this._scrollSize) {
            console.log('upper < 0 || lower > this._scrollSize -> CLEAR ITEMS, return');
            this._clearItems();
            return;
        }

        this._first = this._last = this._anchorIdx;
        this._physicalMin = this._anchorPos - anchorLeadingMargin;
        this._physicalMax = this._anchorPos + anchorSize + anchorTrailingMargin;
        
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

        while (this._physicalMax < upper && this._last < this._items.length - 1) {
            console.log('WHILE: UPPER: _getItems: this._physicalMax: ', this._physicalMax, ', upper: ', upper, ', this._last', this._last, ', max len: this._items.length - 1: ', this._items.length - 1);
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
        } else if (this._last === this._items.length - 1) {
            extentErr = this._physicalMax - this._scrollSize;
        } else if (this._physicalMax >= this._scrollSize) {
            extentErr = ( this._physicalMax - this._scrollSize + (this._items.length - 1 - this._last) * delta );
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
    // /**
    //  * Returns the top and left positioning of the item at idx.
    //  * @param {number} idx
    //  * @returns {import('./layout.js').LayoutT.Positions}
    //  */
    // _getItemPositionY(idx) {
    //     let posTop = 0;
    //     const item = this._getPhysicalItem(idx);
    //     if (idx === 0) posTop = this.margins.map.get(0) ?? this.margins.avg;
    //     if (item) posTop = item.pos;

    //     if (this._first === -1 || this._last === -1)
    //         posTop = ( this.margins.avg + idx * (this.margins.avg + this.avgSize()) );
        
    //     if (idx < this._first) {
    //         const delta = this._first - idx;
    //         const refItem = this._getPhysicalItem(this._first);
    //         if (refItem == undefined) throw new Error("!")
    //         posTop = (
    //             refItem.pos - (this.margins.map.get(this._first - 1) || this.margins.avg) -
    //             (delta * this.heights.avg + (delta - 1) * this.margins.avg)
    //         );
    //     }
    //     const delta = idx - this._last;
    //     const refItem = this._getPhysicalItem(this._last);
    //     if (refItem == undefined) throw new Error("!")
    //     posTop = (
    //         refItem.pos + (this.heights.map.get(this._last)
    //             || this.heights.avg) + (this.margins.map.get(this._last)
    //             || this.margins.avg) + delta * (this.heights.avg + this.margins.avg)
    //     );

    //     return {
    //         top: posTop,
    //         left: 0,
    //         yOffset: -( this.cache.get(idx)?.marginTop ?? this.margins.avg ),
    //     };
    //     // return {
    //     //     top: posTop,
    //     //     left: 0,
    //     //     yOffset: -( this.cache.get(idx)?.marginTop ?? this.margins.avg ),
    //     // };
    // }
}
