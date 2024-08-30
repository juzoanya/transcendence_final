
import {
    RangeChangedEvent,
    VisibilityChangedEvent,
    UnpinnedEvent,
} from './events.js';
import { FlowLayout } from './layout/flowlayout_easy.js';
import { ScrollerController } from './ScrollerController_easy.js';


export const virtualizerRef = Symbol('virtualizerRef');
const SIZER_ATTRIBUTE = 'virtualizer-sizer';


export class Virtualizer {
    
    /** @type {FlowLayout | null} */
    _layout = null;
    
    /** @type {HTMLElement[]} */
    _clippingAncestors = [];
    
    /** @type {import('./layout/layout.js').LayoutT.Size | null} */
    _scrollSize = null;

    /** @type {{ left: number; top: number; } | null} */
    _scrollError = null;

    /** @type {import('./layout/layout.js').LayoutT.ChildPositions | null} */
    _childrenPos = null;

    /** @type {import('./layout/layout.js').LayoutT.ChildMeasurements | null} */
    _childMeasurements = null;
    
    /** @type {Map < HTMLElement, unknown >} */
    _toBeMeasured = new Map();


    _itemsChanged = true;


    /** @type {import('./virt.js').VirtT.VirtualizerHostElement | undefined} */
    _hostElement;
    
    /** @type {ScrollerController | null} */
    _scrollerController = null;
    
    _isScroller = false;
    
    /** @type {HTMLElement | null} */
    _sizer = null;
    
    
    /** @type {ResizeObserver | null} */
    _hostElementRO = null;
    
    
    /** @type {ResizeObserver | null} */
    _childrenRO = null;
    
    /** @type {MutationObserver | null} */
    _mutationObserver = null;
    
    /** @type {(Element | Window)[]} */
    _scrollEventListeners = [];

    /** @type {AddEventListenerOptions} */
    _scrollEventListenerOptions = {
        passive: true,
    };

    // /** @type {import('./virt.js').VirtT.ScrollElementIntoViewOptions | null} */
    // _scrollIntoViewTarget = null;

    /** @type {((coordinates: import('./layout/layout.js').LayoutT.ScrollToCoordinates) => void) | null} */
    _updateScrollIntoViewCoordinates = null;

    /** @type {Array < unknown >} */
    _items =[];
    _first = -1;
    _last = -1;
    _firstVisible = -1;
    _lastVisible = -1;

    /** @type {WeakSet < Function >} */
    _scheduled = new WeakSet();

    

//   /** @type {import('./layout/layout.js').LayoutT.MeasureChildFunction | null} */
//     _measureChildOverride = null;


    /** @type {Promise < void> | null} */
    _layoutCompletePromise = null;
    /** @type {Function | null} */
    _layoutCompleteResolver = null;
    /** @type {Function | null} */
    _layoutCompleteRejecter = null;
    /** @type {number | null} */
    _pendingLayoutComplete = null;
    
    /** @type {Promise < void> | null} */
    _layoutInitialized = null;

    _connected = false;

    /**
     * @param {HTMLElement} hostElement
     * @param {unknown[]} items
     */
    constructor(hostElement, items) {
        if (!(hostElement instanceof HTMLElement))
            throw new Error('Virtualizer requires hostElement');
        this._hostElement = hostElement;

        if (this._hostElement instanceof HTMLElement) {
            this._hostElement.style.display = 'block';
            this._hostElement.style.position = 'relative';
            this._hostElement.style.contain = 'size layout';
        }
        this._hostElement[virtualizerRef] = this;

        this._layoutInitialized = this._initLayout();

        this.items = items;

        this._mutationObserver = new MutationObserver(() => this._finishDOMUpdate() );
        this._hostElementRO = new ResizeObserver(() => this._schedule(this._updateLayout) );
        this._childrenRO = new ResizeObserver(this._childrenSizeChanged.bind(this));
        
        this._clippingAncestors = getClippingAncestors( this._hostElement );
        
        console.log('clipping ancestors: ', this._clippingAncestors);
        this._scrollerController = new ScrollerController(this._clippingAncestors[0]);


        this._schedule(this._updateLayout);

        this._connected = true;
        this._mutationObserver.observe(this._hostElement, { childList: true });
        this._hostElementRO.observe(this._hostElement);
        this._scrollEventListeners.push(window);
        window.addEventListener('scroll', this, this._scrollEventListenerOptions);
        this._clippingAncestors.forEach((ancestor) => {
            if (!this._mutationObserver || ! this._hostElementRO || !this._hostElement) throw new Error("!!")
            ancestor.addEventListener(
                'scroll',
                this,
                this._scrollEventListenerOptions
            );
            this._scrollEventListeners.push(ancestor);
            this._hostElementRO.observe(ancestor);
        });
        this._hostElementRO.observe(this._scrollerController.element);
        this._children.forEach((child) => this._childrenRO?.observe(child));
        this._scrollEventListeners.forEach((target) =>
            target.addEventListener('scroll', this, this._scrollEventListenerOptions)
        );
    }

    

    async _initLayout() {
        this._layout = new FlowLayout((msg) => { this.onChildStateChange(msg); });
        this._schedule(this._updateLayout);
    }



    _updateLayout() {
        if (!(this._layout && this._connected && this._hostElement && this._scrollerController?.element && this._layout)) 
            return;

        console.log('update Laylout');
        
        if (this._layout._items !== this._items) {
            this._layout._items = this._items;
            this._pendingReflow = true;
        }
        
        let top, left, bottom, right;

        const hostElementBounds = this._hostElement.getBoundingClientRect();
        console.log('hostElement: ',this._hostElement);
        console.log('hostElementBounds: ',hostElementBounds);
        

        top = 0;
        left = 0;
        bottom = window.innerHeight;
        right = window.innerWidth;

        console.log('ancestors: ', this._clippingAncestors);
        
        const ancestorBounds = this._clippingAncestors.map((ancestor) =>
            ancestor.getBoundingClientRect()
        );
        console.log('ancestorBounds: ', ancestorBounds);
        
        ancestorBounds.unshift(hostElementBounds);

        console.log('first data');
        console.log('top: ', top);
        console.log('left: ',left );
        console.log('bottom: ',bottom );
        console.log('right: ',right );
        for (const bounds of ancestorBounds) {
            top = Math.max(top, bounds.top);
            left = Math.max(left, bounds.left);
            bottom = Math.min(bottom, bounds.bottom);
            right = Math.min(right, bounds.right);
            console.log('for bounds in bounds: new data: ');
            console.log('top: ', top);
            console.log('left: ',left );
            console.log('bottom: ',bottom );
            console.log('right: ',right );
            
        }
        console.log('\ncalc top: ', top);
        console.log('hostElementBounds.top: ', hostElementBounds.top);
        console.log('hostElem scrolltop: ', this._hostElement.scrollTop);
        console.log('\ncalc left: ', left);
        console.log('hostElementBounds.top: ', hostElementBounds.left);
        console.log('hostElem scrolltop: ', this._hostElement.scrollLeft);
        
        const scrollTop = top - hostElementBounds.top + this._hostElement.scrollTop;
        const scrollLeft = left - hostElementBounds.left + this._hostElement.scrollLeft;
        console.log('scrollTop: ', scrollTop);
        console.log('scrollLeft: ', scrollLeft);
        
        this._layout.setViewPortAndScroll({
            width: right - left,
            height: bottom - top,
            top: scrollTop,
            left: scrollLeft,
        });

        console.log('this._childMeasurements: ', this._childMeasurements);
        console.log('this._layout._pendingReflow?: ', this._layout._pendingReflow);
        

        if (this._childMeasurements !== null) {
            this._layout.updateMetricsCache(this._childMeasurements);
            this._layout._pendingReflow = true;
            this._childMeasurements = null;
        }
        if (this._layout._pendingReflow) {
            this._layout._pendingReflow = false;
            this._layout._reflow();
        }
    }

    /**
     * @param {Array < unknown > | undefined} items 
     */
    set items(items) {
        if (Array.isArray(items) && items !== this._items) {
            this._itemsChanged = true;
            this._items = items;
            this._schedule(this._updateLayout);
        }
    }


    disconnected() {
        this._scrollEventListeners.forEach((target) =>
            target.removeEventListener(
                'scroll',
                this,
                this._scrollEventListenerOptions
            )
        );
        this._scrollEventListeners = [];
        this._clippingAncestors = [];
        this._scrollerController?.detach();
        this._scrollerController = null;
        this._mutationObserver?.disconnect();
        this._mutationObserver = null;
        this._hostElementRO?.disconnect();
        this._hostElementRO = null;
        this._childrenRO?.disconnect();
        this._childrenRO = null;
        if (this._layoutCompleteRejecter !== null) {
            this._layoutCompleteRejecter('disconnected');
        }
        this._resetLayoutCompleteState();
        this._connected = false;
    }

    /**
     * @param {Function} method 
     * @returns {Promise < void>}
     */
    async _schedule(method) {
        if(!this._scheduled.has(method)) {
            this._scheduled.add(method);
            await Promise.resolve();
            this._scheduled.delete(method);
            method.call(this);
        }
    }

    /** @param {import('./layout/layout.js').LayoutT.StateChangedMessage} state  */
    async onChildStateChange(state) {
        this._scrollSize = state.scrollSize;
        this._first = state.range.first;
        this._last = state.range.last;
        console.log('onChildStateChange: ', state);
        
        this._firstVisible = state.range.firstVisible;
        this._lastVisible = state.range.lastVisible;
        this._childrenPos = state.childPositions;
        this._scrollError = state.scrollError || null;
       
        this._finishDOMUpdate();
    }

    _finishDOMUpdate() {
        if (!this._connected)
            return;
        
        this._children.forEach((child) => this._childrenRO?.observe(child));
        
        this._childrenPos?.forEach(({ top, left, width, height, xOffset, yOffset }, index) => {
            const child = this._children[index - this._first];
            if (child) {
                child.style.position = 'absolute';
                child.style.boxSizing = 'border-box';
                child.style.transform = `translate(${left}px, ${top}px)`;
                if (width !== undefined) {
                    child.style.width = width + 'px';
                }
                if (height !== undefined) {
                    child.style.height = height + 'px';
                }
                // @ts-ignore
                child.style.left = xOffset === undefined ? null : xOffset + 'px';
                // @ts-ignore
                child.style.top = yOffset === undefined ? null : yOffset + 'px';
            }
        });
    
        const max = 8200000;
        const v = this._scrollSize && this._scrollSize.height !== null ? Math.min(max, this._scrollSize.height) : 0;
        if (this._hostElement) {
            const style = this._hostElement.style;
            style.minHeight= v ? `${v}px` : '100%';
        }
        
        if (this._scrollError && this._scrollerController) {
            const { scrollTop, scrollLeft } = this._scrollerController;
            const { top, left } = this._scrollError;
            this._scrollError = null;
            this._scrollerController.correctScrollError({
                top: scrollTop - top,
                left: scrollLeft - left,
            });
        }
    }


    /** @param {CustomEvent} event  */
    handleEvent(event) {
        console.log('handle scroll event!');
        
        if (event.type === 'scroll') {
            if (event.currentTarget === window
                || (event.currentTarget instanceof HTMLElement 
                    && this._clippingAncestors.includes(event.currentTarget))) {
                
                    
                    if (this._scrollerController?.correctingScrollError === false) {
                        // This is a user-initiated scroll, so we unpin the layout
                        this._layout?.unpin();
                    }
                    this._schedule(this._updateLayout);
            }
        }
    }

    

    /** @returns {Array < HTMLElement >} */
    get _children() {
        /** @type {Array<HTMLElement>} */
        const arr = [];
        let next = this._hostElement?.firstElementChild;
        while(next) {
            if (!next.hasAttribute(SIZER_ATTRIBUTE) && next instanceof HTMLElement) {
                arr.push(next);
            }
            next = next.nextElementSibling;
        }
        return arr;
    }

    

  

   
   
    /** @returns {Promise < void>} */
    get layoutComplete() {
        // Lazily create promise
        if(!this._layoutCompletePromise) {
            this._layoutCompletePromise = new Promise((resolve, reject) => {
                this._layoutCompleteResolver = resolve;
                this._layoutCompleteRejecter = reject;
            });
        }
        return this._layoutCompletePromise;
    }

    _resolveLayoutCompletePromise() {
        if (this._layoutCompleteResolver !== null) {
            this._layoutCompleteResolver();
        }
        this._resetLayoutCompleteState();
    }

    _resetLayoutCompleteState() {
        this._layoutCompletePromise = null;
        this._layoutCompleteResolver = null;
        this._layoutCompleteRejecter = null;
        this._pendingLayoutComplete = null;
    } 

    /** @param {ResizeObserverEntry[]} changes */
    _childrenSizeChanged(changes) {

        for (const change of changes) {
            if (change.target instanceof HTMLElement) {
                this._toBeMeasured.set( change.target, change.contentRect );
            }
        }
        /** @type {import('./layout/layout.js').LayoutT.ChildMeasurements} */
        const mm = {};
        const children = this._children;
        for(let i = 0; i <children.length; i++) {
            const child = children[i];
            if (this._itemsChanged || this._toBeMeasured.has(child)) {
                const idx = this._first + i;
                const { width, height } = child.getBoundingClientRect();
                const style = window.getComputedStyle(child);
                mm[idx] = {
                    marginTop: getMarginValue(style.marginTop),
                    marginRight: getMarginValue(style.marginRight),
                    marginBottom: getMarginValue(style.marginBottom),
                    marginLeft: getMarginValue(style.marginLeft),
                    width,
                    height
                };
            }
        }
        this._childMeasurements = mm;
        this._schedule(this._updateLayout);
        this._toBeMeasured.clear();
           // Don't do anything unless we have a pending promise
        // And only request a frame if we haven't already done so
        if (this._layoutCompletePromise && this._pendingLayoutComplete === null) {
            // Wait one additional frame to be sure the layout is stable
            this._pendingLayoutComplete = requestAnimationFrame(() =>
                requestAnimationFrame(() => this._resolveLayoutCompletePromise())
            );
        }
        this._itemsChanged = false;
    }
}



function getMarginValue(value) {
    const float = value ? parseFloat(value) : NaN;
    return Number.isNaN(float) ? 0 : float;
}


// TODO (graynorton): Deal with iframes?
function getParentElement(el) {
    if (el.assignedSlot !== null) {
      return el.assignedSlot;
    }
    if (el.parentElement !== null) {
      return el.parentElement;
    }
    const parentNode = el.parentNode;
    if (parentNode && parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return (parentNode).host || null;
    }
    return null;
  }
  
  ///
  
  function getElementAncestors(el, includeSelf = false) {
    const ancestors = [];
    let parent = includeSelf ? el : (getParentElement(el));
    console.log('getElementAncestors: parent: ', parent);
    while (parent !== null) {
        console.log('loop - getElementAncestors: parent: ', parent, );
        
      ancestors.push(parent);
      parent = getParentElement(parent);
    }
    console.log('getElementAncestors, ancestors: ', ancestors);
    
    return ancestors;
  }
  
  function getClippingAncestors(el, includeSelf = false) {
    let foundFixed = false;
    return getElementAncestors(el, includeSelf).filter((a) => {
      if (foundFixed) {
        return false;
      }
      const style = getComputedStyle(a);
      foundFixed = style.position === 'fixed';
      return style.overflow !== 'visible';
    });
  }