
import { SizeCache } from './sizecache.js';
import { BaseLayout, dim1 } from './baselayout.js'

/** @type {import('./layout.js').FlowLayoutT.FlowLayoutSpecifierFactory} */
export const flow = (config) =>  Object.assign( { type: FlowLayout, }, config );


/** @param {import('./layout.js').LayoutT.ScrollDirection} direction @returns {import('./layout.js').LayoutT.margin} */
function leadingMargin(direction) {
    return direction === 'horizontal' ? 'marginLeft' : 'marginTop';
}

/** @param {import('./layout.js').LayoutT.ScrollDirection} direction @returns {import('./layout.js').LayoutT.margin} */
function trailingMargin(direction) {
    return direction === 'horizontal' ? 'marginRight' : 'marginBottom';
}

/** @param {import('./layout.js').LayoutT.ScrollDirection} direction @returns {import('./layout.js').LayoutT.offsetAxis} */
function offset(direction) {
    return direction === 'horizontal' ? 'xOffset' : 'yOffset';
}

/**
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
function collapseMargins(a, b) {
    const m = [a, b].sort();
    return m[1] <= 0 ? Math.min(...m) : m[0] >= 0 ? Math.max(...m) : m[0] + m[1];
}

class MetricsCache {
    _childSizeCache = new SizeCache();
    _marginSizeCache = new SizeCache();
    /** @type {Map<number, import('./layout.js').LayoutT.Size & import('./layout.js').LayoutT.Margins>} */
    // _metricsCache = new Map();

    /**
     * @param {{ [key: number]: import('./layout.js').LayoutT.Size & import('./layout.js').LayoutT.Margins}} metrics
     * @param {import('./layout.js').LayoutT.ScrollDirection} direction
     */
    update(metrics, direction) {
        /** @type {Set<number>} */
        const marginsToUpdate = new Set();
        Object.keys(metrics).forEach((key) => {
            const k = Number(key);
            this._metricsCache.set(k, metrics[k]);
            this._childSizeCache.set(k, metrics[k][dim1(direction)]);
            marginsToUpdate.add(k);
            marginsToUpdate.add(k + 1);
        });
        for (const k of marginsToUpdate) {
            const a = this._metricsCache.get(k)?.[leadingMargin(direction)] || 0;
            const b = this._metricsCache.get(k - 1)?.[trailingMargin(direction)] || 0;
            this._marginSizeCache.set(k, collapseMargins(a, b));
        }
    }

    get averageChildSize() {
        return this._childSizeCache.averageSize;
    }
    
    get totalChildSize() {
        return this._childSizeCache.totalSize;
    }

    get averageMarginSize() {
        return this._marginSizeCache.averageSize;
    }

    get totalMarginSize() {
        return this._marginSizeCache.totalSize;
    }

    /**
     * 
     * @param {number} index 
     * @param {import('./layout.js').LayoutT.ScrollDirection} direction 
     * @returns 
     */
    getLeadingMarginValue(index, direction) {
        return this._metricsCache.get(index)?.[leadingMargin(direction)] || 0;
    }

    /** @param {number} index  */
    getChildSize(index) {
        return this._childSizeCache.getSize(index);
    }

    /** @param {number} index  */
    getMarginSize(index) {
        return this._marginSizeCache.getSize(index);
    }

    clear() {
        this._childSizeCache.clear();
        this._marginSizeCache.clear();
        this._metricsCache.clear();
    }
}

// BaseLayout<BaseLayoutConfig>
export class FlowLayout extends BaseLayout {
    /**
     * Initial estimate of item size
     * @type {import('./layout.js').LayoutT.Size}
     */
    _itemSize = { width: 100, height: 100 };

    /**
     * Indices of children mapped to their (position and length) in the scrolling
     * direction. Used to keep track of children that are in range.
     * @type {Map < number, import('./layout.js').FlowLayoutT.ItemBounds>}
     */
    _physicalItems = new Map();

    /**
     * Used in tandem with _physicalItems to track children in range across
     * reflows.
     * @type {Map < number, import('./layout.js').FlowLayoutT.ItemBounds>}
     */
    _newPhysicalItems = new Map();

    /**
     * Width and height of children by their index.
     */
    _metricsCache = new MetricsCache();

    /**
     * anchorIdx is the anchor around which we reflow. It is designed to allow
     * jumping to any point of the scroll size. We choose it once and stick with
     * it until stable. _first and _last are deduced around it.
     * @type {number | null}
     */
    _anchorIdx = null;

    /**
     * Position in the scrolling direction of the anchor child.
     * @type {number | null}
     */
    _anchorPos = null;

    /**
     * Whether all children in range were in range during the previous reflow.
     */
    _stable = true;

    _measureChildren = true;

    _estimate = true;

    get measureChildren() {
        return this._measureChildren;
    }

    /**
     * Determine the average size of all children represented in the sizes
     * argument.
     * @param {import('./layout.js').LayoutT.ChildMeasurements} sizes 
     */
    updateItemSizes(sizes) {
        // @ts-ignore
        this._metricsCache.update(sizes, this.direction);
        // if (this._nMeasured) {
        // this._updateItemSize();
        this._scheduleReflow();
        // }
    }

    /**
     * Set the average item size based on the total length and number of children
     * in range.
     */
    // _updateItemSize() {
    //   // Keep integer values.
    //   this._itemSize[this._sizeDim] = this._metricsCache.averageChildSize;
    // }

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
        return item && this._metricsCache.getChildSize(idx);
    }

    /** @returns {number} */
    _getAverageSize() {
        return this._metricsCache.averageChildSize || this._itemSize[this._sizeDim];
    }

    /**
     * @param {number} idx 
     * @returns {number}
     */
    _estimatePosition(idx) {
        const c = this._metricsCache;
        if (this._first === -1 || this._last === -1) {
            return (
                c.averageMarginSize +
                idx * (c.averageMarginSize + this._getAverageSize())
            );
        } else {
            if (idx < this._first) {
                const delta = this._first - idx;
                const refItem = this._getPhysicalItem(this._first);
                if (refItem == undefined) throw new Error("!")
                return (
                    refItem.pos -
                    (c.getMarginSize(this._first - 1) || c.averageMarginSize) -
                    (delta * c.averageChildSize + (delta - 1) * c.averageMarginSize)
                );
            } else {
                const delta = idx - this._last;
                const refItem = this._getPhysicalItem(this._last);
                if (refItem == undefined) throw new Error("!")
                return (
                    refItem.pos +
                    (c.getChildSize(this._last) || c.averageChildSize) +
                    (c.getMarginSize(this._last) || c.averageMarginSize) +
                    delta * (c.averageChildSize + c.averageMarginSize)
                );
            }
        }
    }

    /**
     * Returns the position in the scrolling direction of the item at idx.
     * Estimates it if the item at idx is not in the DOM.
     * @param {number} idx 
     * @returns {number}
     */
    _getPosition(idx) {
        const item = this._getPhysicalItem(idx);
        const { averageMarginSize } = this._metricsCache;
        return idx === 0
            ? this._metricsCache.getMarginSize(0) ?? averageMarginSize
            : item
                ? item.pos
                : this._estimatePosition(idx);
    }

    /**
     * @param {number} lower 
     * @param {number} upper 
     * @returns {number}
     */
    _calculateAnchor(lower, upper) {
        if (lower <= 0) {
            return 0;
        }
        if (upper > this._scrollSize - this._viewDim1) {
            return this.items.length - 1;
        }
        return Math.max(
            0,
            Math.min(
                this.items.length - 1,
                Math.floor((lower + upper) / 2 / this._delta)
            )
        );
    }

    /**
     * @param {number} lower 
     * @param {number} upper 
     * @returns {number}
     */
    _getAnchor(lower, upper) {
        if (this._physicalItems.size === 0) {
            return this._calculateAnchor(lower, upper);
        }
        if (this._first < 0) {
            return this._calculateAnchor(lower, upper);
        }
        if (this._last < 0) {
            return this._calculateAnchor(lower, upper);
        }

        let firstItem, lastItem, firstMin, lastMin, lastMax;
        firstItem = this._getPhysicalItem(this._first)
        lastItem = this._getPhysicalItem(this._last)
        if (firstItem) firstMin = firstItem.pos
        if (lastItem) lastMin = lastItem.pos
        const lastcachedchildsize = this._metricsCache.getChildSize(this._last);
        if (lastMin && lastcachedchildsize) lastMax = lastMin + lastcachedchildsize;

        if (lastMax &&lastMax < lower) {
            // Window is entirely past physical items, calculate new anchor
            return this._calculateAnchor(lower, upper);
        }
        if (firstMin && firstMin > upper) {
            // Window is entirely before physical items, calculate new anchor
            return this._calculateAnchor(lower, upper);
        }
        // Window contains a physical item
        // Find one, starting with the one that was previously first visible
        let candidateIdx = this._firstVisible - 1;
        let cMax = -Infinity;
        while (cMax < lower) {
            const candidate = this._getPhysicalItem(++candidateIdx);
            const lastcachedsize = this._metricsCache.getChildSize(candidateIdx);
            if (candidate && lastcachedsize )
            cMax = candidate.pos + lastcachedsize;
        }
        return candidateIdx;
    }

    /**
     * Updates _first and _last based on items that should be in the current
     * viewed range.
     */
    _getActiveItems() {
        if (this._viewDim1 === 0 || this.items.length === 0) {
            this._clearItems();
        } else {
            this._getItems();
        }
    }

    /**
     * Sets the range to empty.
     */
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
        this._stable = true;
        let lower, upper;

        // The anchorIdx is the anchor around which we reflow. It is designed to
        // allow jumping to any point of the scroll size. We choose it once and
        // stick with it until stable. first and last are deduced around it.

        // If we have a pinned item, we anchor on it
        if (this.pin !== null) {
            const { index } = this.pin;
            this._anchorIdx = index;
            this._anchorPos = this._getPosition(index);
        }

        // Determine the lower and upper bounds of the region to be
        // rendered, relative to the viewport
        lower = this._scrollPosition - this._overhang; //leadingOverhang;
        upper = this._scrollPosition + this._viewDim1 + this._overhang; // trailingOverhang;

        if (upper < 0 || lower > this._scrollSize) {
            this._clearItems();
            return;
        }

        // If we are scrolling to a specific index or if we are doing another
        // pass to stabilize a previously started reflow, we will already
        // have an anchor. If not, establish an anchor now.
        if (this._anchorIdx === null || this._anchorPos === null) {
            this._anchorIdx = this._getAnchor(lower, upper);
            this._anchorPos = this._getPosition(this._anchorIdx);
        }

        let anchorSize = this._getSize(this._anchorIdx);
        if (anchorSize === undefined) {
            this._stable = false;
            anchorSize = this._getAverageSize();
        }

        const anchorLeadingMargin =
            this._metricsCache.getMarginSize(this._anchorIdx) ??
            this._metricsCache.averageMarginSize;
        const anchorTrailingMargin =
            this._metricsCache.getMarginSize(this._anchorIdx + 1) ??
            this._metricsCache.averageMarginSize;

        if (this._anchorIdx === 0) {
            this._anchorPos = anchorLeadingMargin;
        }

        if (this._anchorIdx === this.items.length - 1) {
            this._anchorPos = this._scrollSize - anchorTrailingMargin - anchorSize;
        }

        // Anchor might be outside bounds, so prefer correcting the error and keep
        // that anchorIdx.
        let anchorErr = 0;

        if (this._anchorPos + anchorSize + anchorTrailingMargin < lower) {
            anchorErr = lower - (this._anchorPos + anchorSize + anchorTrailingMargin);
        }

        if (this._anchorPos - anchorLeadingMargin > upper) {
            anchorErr = upper - (this._anchorPos - anchorLeadingMargin);
        }

        if (anchorErr) {
            this._scrollPosition -= anchorErr;
            lower -= anchorErr;
            upper -= anchorErr;
            this._scrollError += anchorErr;
        }

        items.set(this._anchorIdx, { pos: this._anchorPos, size: anchorSize });

        this._first = this._last = this._anchorIdx;
        this._physicalMin = this._anchorPos - anchorLeadingMargin;
        this._physicalMax = this._anchorPos + anchorSize + anchorTrailingMargin;

        while (this._physicalMin > lower && this._first > 0) {
            let size = this._getSize(--this._first);
            if (size === undefined) {
                this._stable = false;
                size = this._getAverageSize();
            }
            let margin = this._metricsCache.getMarginSize(this._first);
            if (margin === undefined) {
                this._stable = false;
                margin = this._metricsCache.averageMarginSize;
            }
            this._physicalMin -= size;
            const pos = this._physicalMin;
            items.set(this._first, { pos, size });
            this._physicalMin -= margin;
            if (this._stable === false && this._estimate === false) {
                break;
            }
        }

        while (this._physicalMax < upper && this._last < this.items.length - 1) {
            let size = this._getSize(++this._last);
            if (size === undefined) {
                this._stable = false;
                size = this._getAverageSize();
            }
            let margin = this._metricsCache.getMarginSize(this._last);
            if (margin === undefined) {
                this._stable = false;
                margin = this._metricsCache.averageMarginSize;
            }
            const pos = this._physicalMax;
            items.set(this._last, { pos, size });
            this._physicalMax += size + margin;
            if (!this._stable && !this._estimate) {
                break;
            }
        }

        // This handles the cases where we were relying on estimated sizes.
        const extentErr = this._calculateError();
        if (extentErr) {
            this._physicalMin -= extentErr;
            this._physicalMax -= extentErr;
            this._anchorPos -= extentErr;
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

    /** @returns {number} */
    _calculateError() {
        if (this._first === 0) {
            return this._physicalMin;
        } else if (this._physicalMin <= 0) {
            return this._physicalMin - this._first * this._delta;
        } else if (this._last === this.items.length - 1) {
            return this._physicalMax - this._scrollSize;
        } else if (this._physicalMax >= this._scrollSize) {
            return (
                this._physicalMax -
                this._scrollSize +
                (this.items.length - 1 - this._last) * this._delta
            );
        }
        return 0;
    }

    _reflow() {
        const { _first, _last } = this;
        super._reflow();
        if (
            (this._first === -1 && this._last == -1) ||
            (this._first === _first && this._last === _last)
        ) {
            this._resetReflowState();
        }
    }

    _resetReflowState() {
        this._anchorIdx = null;
        this._anchorPos = null;
        this._stable = true;
    }

    _updateScrollSize() {
        const { averageMarginSize } = this._metricsCache;
        this._scrollSize = Math.max(
            1,
            this.items.length * (averageMarginSize + this._getAverageSize()) +
            averageMarginSize
        );
    }

    /**
     * Returns the average size (precise or estimated) of an item in the scrolling direction,
     * including any surrounding space.
     * @returns {number}
     */
    get _delta() {
        const { averageMarginSize } = this._metricsCache;
        return this._getAverageSize() + averageMarginSize;
    }

    /**
     * Returns the top and left positioning of the item at idx.
     * @param {number} idx
     * @returns {import('./layout.js').LayoutT.Positions}
     */
    _getItemPosition(idx) {
        // @ts-ignore
        return {
            [this._positionDim]: this._getPosition(idx),
            [this._secondaryPositionDim]: 0,
            [offset(this.direction)]: -(
                this._metricsCache.getLeadingMarginValue(idx, this.direction) ??
                this._metricsCache.averageMarginSize
            ),
        };
    }

    /**
     * Returns the height and width of the item at idx.
     * @param {number} idx
     * @returns {import('./layout.js').LayoutT.Size} 
     */
    _getItemSize(idx) {
        // @ts-ignore
        return {
            [this._sizeDim]: this._getSize(idx) || this._getAverageSize(),
            [this._secondarySizeDim]: this._itemSize[this._secondarySizeDim],
        };
    }

    _viewDim2Changed() {
        this._metricsCache.clear();
        this._scheduleReflow();
    }
}




function getParentElement(el) {
    if (el.assignedSlot !== null) {
      return el.assignedSlot;
    }
    if (el.parentElement !== null) {
      return el.parentElement;
    }
    const parentNode = el.parentNode;
    if (parentNode && parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return parentNode.host || null;
    }
    return null;
  }
  
  
  
  const getClipping = (el) => {
    let foundFixed = false;

    const ancestors = [];
    let parent = getParentElement(el);
    while (parent !== null) {
        ancestors.push(parent);
        parent = getParentElement(parent);
    }
    
    return ancestors.filter((a) => {
      if (foundFixed) {
        return false;
      }
      const style = window.getComputedStyle(a);
      foundFixed = style.position === 'fixed';
      return style.overflow !== 'visible';
    });
  }


//   function getClippingAncestors(el, includeSelf = false) {
//     let foundFixed = false;
//     return getElementAncestors(el, includeSelf).filter((a) => {
//       if (foundFixed) {
//         return false;
//       }
//       const style = getComputedStyle(a);
//       foundFixed = style.position === 'fixed';
//       return style.overflow !== 'visible';
//     });
//   }