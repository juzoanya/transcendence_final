
/** @param {import('./layout').LayoutT.ScrollDirection} direction @returns {import('./layout').LayoutT.dimension} */
export function dim1(direction) {
    return direction === 'horizontal' ? 'width' : 'height';
}

// /** @param {import('./layout').LayoutT.ScrollDirection} direction @returns {import('./layout').LayoutT.dimension} */
// export function dim2(direction) {
//     return direction === 'horizontal' ? 'height' : 'width';
// }

// /** @param {import('./layout').LayoutT.ScrollDirection} direction @returns {import('./layout').LayoutT.position} */
// export function pos1(direction) {
//     return direction === 'horizontal' ? 'left' : 'top';
// }

// /** @param {import('./layout').LayoutT.ScrollDirection} direction @returns {import('./layout').LayoutT.position} */
// export function pos2(direction) {
//     return direction === 'horizontal' ? 'top' : 'left';
// }

/**
 * @template {import('./layout').LayoutT.BaseLayoutConfig} C
 * @type {import('./layout').LayoutT.Layout}
 */
export class BaseLayout {
/**
     * The last set viewport scroll position.
     * @type {import('./layout.js').LayoutT.Positions}
     */
    _latestCoords = { left: 0, top: 0 };

    /**
     * Scrolling direction.
     * @type {import('./layout.js').LayoutT.ScrollDirection}
     */
    _direction = 'vertical';

    /**
     * Dimensions of the viewport.
     * @type {import('./layout.js').LayoutT.Size}
     */
    _viewportSize = { width: 0, height: 0 };

    /** @type {import('./layout.js').LayoutT.Size} */
    totalScrollSize= { width: 0, height: 0 };

    /** @type {import('./layout.js').LayoutT.Positions} */
    offsetWithinScroller = { left: 0, top: 0 };

    /**
     * Flag for debouncing asynchronous reflow requests.
     */
    _pendingReflow = false;

    _pendingLayoutUpdate = false;

    /** @type {import('./layout.js').LayoutT.PinOptions | null} */
    _pin = null;

    /**
     * The index of the first item intersecting the viewport.
     */
    _firstVisible = 0;

    /**
     * The index of the last item intersecting the viewport.
     */
    _lastVisible = 0;

    /**
     * Pixel offset in the scroll direction of the first child.
     */
    _physicalMin = 0;

    /**
     * Pixel offset in the scroll direction of the last child.
     */
    _physicalMax = 0;

    /**
     * Index of the first child.
     */
    _first = -1;

    /**
     * Index of the last child.
     */
    _last = -1;

    /**
     * Length in the scrolling direction.
     * @type {import('./layout.js').LayoutT.dimension}
     */
    _sizeDim = 'height';

    /**
     * Length in the non-scrolling direction.
     * @type {import('./layout.js').LayoutT.dimension}
     */
    _secondarySizeDim = 'width';

    /**
     * Position in the scrolling direction.
     * @type {import('./layout.js').LayoutT.position}
     */
    _positionDim = 'top';

    /**
     * Position in the non-scrolling direction.
     * @type {import('./layout.js').LayoutT.position}
     */
    _secondaryPositionDim = 'left';

    /**
     * Current scroll offset in pixels.
     */
    _scrollPosition = 0;

    /**
     * Difference between current scroll offset and scroll offset calculated due
     * to a reflow.
     */
    _scrollError = 0;

    /**
     * Total number of items that could possibly be displayed. Used to help
     * calculate the scroll size.
     * @type {unknown[]}
     */
    _items = [];

    /**
     * The total (estimated) length of all items in the scrolling direction.
     */
    _scrollSize = 1;

    /**
     * Number of pixels beyond the viewport to still include
     * in the active range of items.
     */
    // TODO (graynorton): Probably want to make this something we calculate based
    // on viewport size, item size, other factors, possibly still with a dial of some kind
    _overhang = 1000;

    /**
     * Call this to deliver messages (e.g. stateChanged, unpinned) to host
     * @type {import('./layout.js').LayoutT.LayoutHostSink}
     */
    _hostSink;

    /** @returns {C} */
    _getDefaultConfig() {
        // @ts-ignore
        return {
            direction: 'vertical',
        };
    }

    /**
     * 
     * @param {import('./layout').LayoutT.LayoutHostSink} hostSink 
     * @param {C} [config] 
     */
    constructor(hostSink, config) {
        this._hostSink = hostSink;
        // Delay setting config so that subclasses do setup work first
        Promise.resolve().then(
            () => (this.config = config || this._getDefaultConfig())
        );
    }

    /** @param {C} config  */
    set config(config) {
        Object.assign(this, Object.assign({}, this._getDefaultConfig(), config));
    }

     /** @returns {C}  */
    get config() {
        // @ts-ignore
        return {
            direction: this.direction,
        };
    }

    /**
     * Maximum index of children + 1, to help estimate total height of the scroll
     * space.
     * @returns {unknown[]}
     */
    get items() {
        return this._items;
    }

    /** @param {unknown[]} items */
    set items(items) {
        this._setItems(items);
    }

    /** @param {unknown[]} items */
    _setItems(items) {
        if (items !== this._items) {
            this._items = items;
            this._scheduleReflow();
        }
    }

    /**
     * Primary scrolling direction.
     * @returns {import('./layout').LayoutT.ScrollDirection}
     */
    get direction() {
        if (!this._direction) throw Error("!!")
        return this._direction;
    }
    set direction(dir) {
        // Force it to be either horizontal or vertical.
        dir = dir === 'horizontal' ? dir : 'vertical';
        if (dir !== this._direction) {
            this._direction = dir;
            this._sizeDim = dir === 'horizontal' ? 'width' : 'height';
            this._secondarySizeDim = dir === 'horizontal' ? 'height' : 'width';
            this._positionDim = dir === 'horizontal' ? 'left' : 'top';
            this._secondaryPositionDim = dir === 'horizontal' ? 'top' : 'left';
            this._triggerReflow();
        }
    }

    /**
     * Height and width of the viewport.
     * @returns {import('./layout').LayoutT.Size}
     */
    get viewportSize() {
        return this._viewportSize;
    }
    set viewportSize(dims) {
        const { _viewDim1, _viewDim2 } = this;
        Object.assign(this._viewportSize, dims);
        if (_viewDim2 !== this._viewDim2) {
            // this._viewDim2Changed();
            this._scheduleLayoutUpdate();
        } else if (_viewDim1 !== this._viewDim1) {
            this._checkThresholds();
        }
    }

    /**
     * Scroll offset of the viewport.
     * @returns {import('./layout').LayoutT.Positions}
     */
    get viewportScroll() {
        return this._latestCoords;
    }
    set viewportScroll(coords) {
        Object.assign(this._latestCoords, coords);
        const oldPos = this._scrollPosition;
        this._scrollPosition = this._latestCoords[this._positionDim];
        const change = Math.abs(oldPos - this._scrollPosition);
        if (change >= 1) {
            this._checkThresholds();
        }
    }

    /**
     * Perform a reflow if one has been scheduled.
     */
    reflowIfNeeded(force = false) {
        if (force || this._pendingReflow) {
            this._pendingReflow = false;
            this._reflow();
        }
    }

    /** @param {import('./layout').LayoutT.PinOptions | null} options */
    set pin(options) {
        this._pin = options;
        this._triggerReflow();
    }

    get pin() {
        if (this._pin !== null) {
            const { index, block } = this._pin;
            return {
                index: Math.max(0, Math.min(index, this.items.length - 1)),
                block,
            };
        }
        return null;
    }

    /** @param {number} val  */
    _clampScrollPosition(val) {
        const min = -this.offsetWithinScroller[this._positionDim];
        const max = this.totalScrollSize['height'] - this._viewDim1
        return Math.max(min, Math.min(val, max));
    }

    unpin() {
        if (this._pin !== null) {
            this._sendUnpinnedMessage();
            this._pin = null;
        }
    }

    /**
     * Get the top and left positioning of the item at idx.
     * @param {number} idx
     * @abstract
     * @returns {import('./layout').LayoutT.Positions}
     */
    _getItemPosition(idx) {{throw new Error("!")}}

    /**
     * Update _first and _last based on items that should be in the current
     * range.
     * @abstract
     * @returns {void}
     */
    _getActiveItems() {throw new Error("!")}

    /**
     * @param {number} _idx
     * @abstract
     * @returns {import('./layout').LayoutT.Size}
     */
    _getItemSize(_idx)  { throw new Error("!") }

    /**
     * Calculates (precisely or by estimating, if needed) the total length of all items in
     * the scrolling direction, including spacing, caching the value in the `_scrollSize` field.
     *
     * Should return a minimum value of 1 to ensure at least one item is rendered.
     * TODO (graynorton): Possibly no longer required, but leaving here until it can be verified.
     */
    /** @returns {void} */
    _updateScrollSize() { /** Override */ }

    /** @returns {void} */
    _updateLayout() { /** Override */ }


    /**
     * The height or width of the viewport, whichever corresponds to the scrolling direction.
     * @returns {number}
     */
    get _viewDim1() {
        return this._viewportSize[this._sizeDim];
    }

    /**
     * The height or width of the viewport, whichever does NOT correspond to the scrolling direction.
     * @returns {number}
     */
    get _viewDim2() {
        return this._viewportSize[this._secondarySizeDim];
    }

    _scheduleReflow() {
        this._pendingReflow = true;
    }

    _scheduleLayoutUpdate() {
        this._pendingLayoutUpdate = true;
        this._scheduleReflow();
    }

    // For triggering a reflow based on incoming changes to
    // the layout config.
    _triggerReflow() {
        this._scheduleLayoutUpdate();
        // TODO graynorton@: reflowIfNeeded() isn't really supposed
        // to be called internally. Address in larger cleanup
        // of virtualizer / layout interaction pattern.
        // this.reflowIfNeeded(true);
        Promise.resolve().then(() => this.reflowIfNeeded());
    }

    _reflow() {
        if (this._pendingLayoutUpdate) {
            this._updateLayout();
            this._pendingLayoutUpdate = false;
        }
        this._updateScrollSize();
        this._setPositionFromPin();
        this._getActiveItems();
        this._updateVisibleIndices();
        this._sendStateChangedMessage();
    }

    /**
     * If we are supposed to be pinned to a particular
     * item or set of coordinates, we set `_scrollPosition`
     * accordingly and adjust `_scrollError` as needed
     * so that the virtualizer can keep the scroll
     * position in the DOM in sync
     */
    _setPositionFromPin() {
        if (this.pin !== null) {
            const lastScrollPosition = this._scrollPosition;
            const { index, block } = this.pin;
            this._scrollPosition =
                this._calculateScrollIntoViewPosition({
                    index,
                    block: block || 'start',
                }) - this.offsetWithinScroller[this._positionDim];
            this._scrollError = lastScrollPosition - this._scrollPosition;
        }
    }
    /**
     * Calculate the coordinates to scroll to, given
     * a request to scroll to the element at a specific
     * index.
     *
     * Supports the same positioning options (`start`,
     * `center`, `end`, `nearest`) as the standard
     * `Element.scrollIntoView()` method, but currently
     * only considers the provided value in the `block`
     * dimension, since we don't yet have any layouts
     * that support virtualization in two dimensions.
     * @param {import('./layout').LayoutT.PinOptions} options 
     */
    _calculateScrollIntoViewPosition(options) {
        const { block } = options;
        const index = Math.min(this.items.length, Math.max(0, options.index));
        const itemStartPosition = this._getItemPosition(index)[this._positionDim];
        let scrollPosition = itemStartPosition;
        if (block !== 'start') {
            const itemSize = this._getItemSize(index)[this._sizeDim];
            if (block === 'center') {
                scrollPosition =
                    itemStartPosition - 0.5 * this._viewDim1 + 0.5 * itemSize;
            } else {
                const itemEndPosition = itemStartPosition - this._viewDim1 + itemSize;
                if (block === 'end') {
                    scrollPosition = itemEndPosition;
                } else {
                    // block === 'nearest'
                    const currentScrollPosition = this._scrollPosition;
                    scrollPosition =
                        Math.abs(currentScrollPosition - itemStartPosition) <
                            Math.abs(currentScrollPosition - itemEndPosition)
                            ? itemStartPosition
                            : itemEndPosition;
                }
            }
        }
        scrollPosition += this.offsetWithinScroller[this._positionDim];
        return this._clampScrollPosition(scrollPosition);
    }

    /**
     * @param {import('./layout').LayoutT.PinOptions} options 
     * @returns {import('./layout').LayoutT.ScrollToCoordinates}
     */
    getScrollIntoViewCoordinates(options) {
        return {
            [this._positionDim]: this._calculateScrollIntoViewPosition(options),
        };
    }

    _sendUnpinnedMessage() {
        this._hostSink({
            type: 'unpinned',
        });
    }

    _sendVisibilityChangedMessage() {
        this._hostSink({
            type: 'visibilityChanged',
            firstVisible: this._firstVisible,
            lastVisible: this._lastVisible,
        });
    }

    _sendStateChangedMessage() {
        /** @type {import('./layout').LayoutT.ChildPositions} */
        const childPositions = new Map();
        if (this._first !== -1 && this._last !== -1) {
            for (let idx = this._first; idx <= this._last; idx++) {
                childPositions.set(idx, this._getItemPosition(idx));
            }
        }
        /** @type {import('./layout').LayoutT.StateChangedMessage} */
        const message = {
            type: 'stateChanged',
            scrollSize: {
                [this._sizeDim]: this._scrollSize,
                [this._secondarySizeDim]: null,
                height: 0,
                width: 0
            },
            range: {
                first: this._first,
                last: this._last,
                firstVisible: this._firstVisible,
                lastVisible: this._lastVisible,
            },
            childPositions,
        };
        if (this._scrollError) {
            message.scrollError = {
                [this._positionDim]: this._scrollError,
                [this._secondaryPositionDim]: 0,
                left: 0,
                top: 0,
            };
            this._scrollError = 0;
        }
        this._hostSink(message);
    }

    /**
     * Number of items to display.
     * @returns {number}
     */
    get _num() {
        if (this._first === -1 || this._last === -1) {
            return 0;
        }
        return this._last - this._first + 1;
    }

    _checkThresholds() {
        if ((this._viewDim1 === 0 && this._num > 0) || this._pin !== null) {
            this._scheduleReflow();
        } else {
            const min = Math.max(0, this._scrollPosition - this._overhang);
            const max = Math.min(
                this._scrollSize,
                this._scrollPosition + this._viewDim1 + this._overhang
            );
            if (this._physicalMin > min || this._physicalMax < max) {
                this._scheduleReflow();
            } else {
                this._updateVisibleIndices({ emit: true });
            }
        }
    }

    /**
     * Find the indices of the first and last items to intersect the viewport.
     * Emit a visibleindiceschange event when either index changes.
     * @param {import('./layout').BaseLayoutT.UpdateVisibleIndicesOptions} [options] 
     */
    _updateVisibleIndices(options) {
        if (this._first === -1 || this._last === -1) return;

        let firstVisible = this._first;
        while (
            firstVisible < this._last &&
            Math.round(
                this._getItemPosition(firstVisible)[this._positionDim] +
                this._getItemSize(firstVisible)[this._sizeDim]
            ) <= Math.round(this._scrollPosition)
        ) {
            firstVisible++;
        }

        let lastVisible = this._last;
        while (
            lastVisible > this._first &&
            Math.round(this._getItemPosition(lastVisible)[this._positionDim]) >=
            Math.round(this._scrollPosition + this._viewDim1)
        ) {
            lastVisible--;
        }

        if (
            firstVisible !== this._firstVisible ||
            lastVisible !== this._lastVisible
        ) {
            this._firstVisible = firstVisible;
            this._lastVisible = lastVisible;
            if (options && options.emit) {
                this._sendVisibilityChangedMessage();
            }
        }
    }
}