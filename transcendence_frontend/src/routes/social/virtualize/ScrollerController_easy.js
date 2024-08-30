
export class ScrollerShim {
    /** @type {Node} */
    _node;
    _element;

    /** @param {HTMLElement} element  */
    constructor(element) {
        this._node = element;
        this._element = element;
    }

    get element() {
        return this._element;
    }

    get scrollTop() {
        return this.element.scrollTop;
    }

    get scrollLeft() {
        return this.element?.scrollLeft
    }

    get scrollHeight() {
        return this.element.scrollHeight;
    }

    get scrollWidth() {
        return this.element.scrollWidth;
    }

    get viewportHeight() {
        return this._element.getBoundingClientRect().height;
    }

    get viewportWidth() {
        return this._element.getBoundingClientRect().width;
    }

    get maxScrollTop() {
        return this.scrollHeight - this.viewportHeight;
    }

    get maxScrollLeft() {
        return this.scrollWidth - this.viewportWidth;
    }
}

export class ScrollerController extends ScrollerShim {
    _originalScrollTo;
    _originalScrollBy;
    _originalScroll;
    /** @type {import('./virt').ScrollerControllerT.retargetScrollCallback | null} */
    _retarget = null;
    /** @type {import('./virt').ScrollerControllerT.endScrollCallback | null} */
    _end = null;
    /** @type {ScrollToOptions | null} */
    __destination = null;

    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        super(element);

        this._checkForArrival = this._checkForArrival.bind(this);
        this._updateManagedScrollTo = this._updateManagedScrollTo.bind(this);
        this.scrollTo = this.scrollTo.bind(this);
        this.scrollBy = this.scrollBy.bind(this);

        this._originalScrollTo = this._element.scrollTo;
        this._originalScrollBy = this._element.scrollBy;
        this._originalScroll = this._element.scroll;
        this._node['scrollTo'] = this.scrollTo;
        this._node['scrollBy'] = this.scrollBy;
        this._node['scroll'] = this.scrollTo;
        this._node.addEventListener('scroll', this._checkForArrival);
    }
    detach() {
        this._node['scrollTo'] = this._originalScrollTo;
        this._node['scrollBy'] = this._originalScrollBy;
        this._node['scroll'] = this._originalScroll;
        this._node.removeEventListener('scroll', this._checkForArrival);
        return null;
    }

    correctingScrollError = false;

    get _destination() {
        return this.__destination;
    }

    get scrolling() {
        return this._destination !== null;
    }

    
    /** @param {ScrollToOptions | number} p1 @param {number} [p2] @returns {void}  */
    scrollTo(p1, p2) {
        if (typeof p1 === 'number' && typeof p2 === 'number')
            this._scrollTo({ left: p1, top: p2 });
        else if (typeof p1 !== 'number') this._scrollTo(p1)
    }

    /**
     * @param {ScrollToOptions | number} p1 
     * @param {number} [p2] 
     */
    scrollBy(p1, p2) {
        const options = typeof p1 === 'number' && typeof p2 === 'number' ? { left: p1, top: p2 } : p1;
        if (typeof options === 'object') {
            if ( options.top !== undefined) {
                options.top += this.scrollTop;
            }
            if (options.left !== undefined) {
                options.left += this.scrollLeft;
            }
            this._scrollTo(options);
        }
    }

    /** @param {ScrollToOptions} options  */
    _nativeScrollTo(options) {
        this._originalScrollTo.bind(this._element || window)(options);
    }

    /**
     * @param {ScrollToOptions} options 
     * @param {import('./virt').ScrollerControllerT.retargetScrollCallback | null} retarget 
     * @param {import('./virt').ScrollerControllerT.endScrollCallback | null} end 
     * @returns 
     */
    _scrollTo( options, retarget = null, end = null ) {
        if (this._end !== null) {
            this._end();
        }
        if (options.behavior === 'smooth') {
            this._setDestination(options);
            this._retarget = retarget;
            this._end = end;
        } else {
            this._resetScrollState();
        }
        this._nativeScrollTo(options);
    }

    /** @param {ScrollToOptions} options  */
    _setDestination(options) {
        let { top, left } = options;
        top =
            top === undefined
                ? undefined
                : Math.max(0, Math.min(top, this.maxScrollTop));
        left =
            left === undefined
                ? undefined
                : Math.max(0, Math.min(left, this.maxScrollLeft));
        if (
            this._destination !== null &&
            left === this._destination.left &&
            top === this._destination.top
        ) {
            return false;
        }
        this.__destination = { top, left, behavior: 'smooth' };
        return true;
    }

    _resetScrollState() {
        this.__destination = null;
        this._retarget = null;
        this._end = null;
    }

    /** @param {import('./layout/layout').LayoutT.ScrollToCoordinates} coordinates  */
    _updateManagedScrollTo(coordinates) {
        if (this._destination) {
            if (this._setDestination(coordinates)) {
                this._nativeScrollTo(this._destination);
            }
        }
    }

    /**
     * @param {ScrollToOptions} options 
     * @param {import('./virt').ScrollerControllerT.retargetScrollCallback} retarget 
     * @param {import('./virt').ScrollerControllerT.endScrollCallback} end 
     * @returns 
     */
    managedScrollTo( options, retarget, end) {
        this._scrollTo(options, retarget, end);
        return this._updateManagedScrollTo;
    }

    /**
     * @param {import('./layout/layout').LayoutT.ScrollToCoordinates} coordinates 
     */
    correctScrollError(coordinates) {
        this.correctingScrollError = true;
        requestAnimationFrame(() =>
            requestAnimationFrame(() => (this.correctingScrollError = false))
        );
        // Correct the error
        this._nativeScrollTo(coordinates);
        // Then, if we were headed for a specific destination, we continue scrolling:
        // First, we update our target destination, if applicable...
        if (this._retarget) {
            this._setDestination(this._retarget());
        }
        // Then we go ahead and resume scrolling
        if (this._destination) {
            this._nativeScrollTo(this._destination);
        }
    }

    _checkForArrival() {
        if (this._destination !== null) {
            const { scrollTop, scrollLeft } = this;
            let { top, left } = this._destination;
            top = Math.min(top || 0, this.maxScrollTop);
            left = Math.min(left || 0, this.maxScrollLeft);
            const topDiff = Math.abs(top - scrollTop);
            const leftDiff = Math.abs(left - scrollLeft);
            // We check to see if we've arrived at our destination.
            if (topDiff < 1 && leftDiff < 1) {
                if (this._end) {
                    this._end();
                }
                this._resetScrollState();
            }
        }
    }
}