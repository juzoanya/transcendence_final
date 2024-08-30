
import { BaseElement, createRef, html, ref, TemplateAsLiteral } from '../lib_templ/BaseElement.js';



// /**
//  * @template T
//  * @typedef {object} ListGroupData
//  * @property {(item: T, i: number) => TemplateAsLiteral} [rendercb]
//  * @property {T[]} [items]
//  * @typedef {ListGroupData<T> & import('../lib_templ/BaseBase.js').BaseBaseProps} ListGroupProps
//  */

// /**
//  * @template T
//  * @typedef {ListGroupProps<T> & import('../lib_templ/BaseBase.js').BaseBaseProps} LIPROPS
//  */

// /**
//  * @template T
//  * @typedef {keyof LIPROPS<T>} LIKEYS
//  */


/**
 * @template T
 * @typedef {import('../lib_templ/BaseBase.js').BaseBaseProps & {
*      rendercb?: (item: T, i: number) => TemplateAsLiteral,
*      items?:T[]
* }} ListGroupProps
*/


// /**
//  * @prop items
//  * @prop rendercb
//  * @attr flush
//  * @attr animatelist
//  * 
//  * @template K
//  * @template {ListGroupProps<K>} T
//  * @extends { BaseElement< T > }
//  */

/**
 * @prop items
 * @prop rendercb
 * @attr flush
 * @attr animatelist
 * @attr scrollheight
 * @attr unstyled
 * @attr light
 * 
 * @template K
 * @template {ListGroupProps<K>} T
 * @extends { BaseElement<T> }
 */
export class ListGroup extends BaseElement {
    static observedAttributes = ['margin', 'flush', 'animatelist', 'scrollheight', 'unstyled', 'light']
    constructor() {
        super(false, false);

        this.props.items = [];
        this.props.rendercb = (item, i) => html`${item}`
        /** @type {{no: number}[]} */
        this.itemdata = [];
        this.itemsLength = 0;
        this.itemspos = new Set();
        this.itemno = 0;
        this.margin = '0px';
        this.duration = 200;
        this.flush = false;
        this.animatelist = false;
        this.scrollheight = '';
        this.unstyled = false;
        this.light = false;
    }

    
    internalItems = [];

    async initElements() {
        this.willInitialize = true;
        await this.updateComplete;
        this.listRef.value?.children
        for (let i = 0; this.listRef.value && i < this.listRef.value.children.length; ++i) {
            this.assignHeight(this.listRef.value.children[i]);
        }
    }
   
    async animateAppendBottom(foundIndex) {
        await this.updateComplete;
       
        console.log('foundindex appen bottom: ', foundIndex);
        
        if (foundIndex !== -1 && this.listRef.value) {
            const child = this.listRef.value.children[foundIndex];
            console.log('child at: ', child);
            
            if (child && child instanceof HTMLElement && child.firstElementChild && child.firstElementChild instanceof HTMLElement) {
                const h = child.firstElementChild.getBoundingClientRect().height;
                child.animate([
                    {
                        height: `${0}px`,
                        opacity: '0',
                        easing: 'ease-out'
                    },
                    {
                        height: `${h}px`,
                        opacity: '1',
                        easing: 'ease-out'
                    }
                ], { duration: this.duration });
                this.assignHeight(child);
            }
        }
    }

    // /**
    //  * @param {Element | undefined} elem 
    //  * @param {number} duration 
    //  */
    // animateSetHeight(elem, duration) {
    //     if (elem instanceof HTMLElement) {
    //         const realHeight = elem.firstElementChild?.getBoundingClientRect().height;
    //         if (realHeight != undefined) {
    //             const height = window.getComputedStyle(elem).height;
    //             console.log('computed: ', height, ' - real - ', realHeight);
                
    //             // elem.animate([{height}, {height:`${realHeight}px`}], {duration}).finished.then(() => {
    //             // });
    //             this.assignHeight(elem);
    //         }
    //     }
    // }

    /** @param {Element} elem  */
    assignHeight(elem) {
        if (elem instanceof HTMLElement && elem.firstElementChild instanceof HTMLElement && this._props.items) {
            const h = elem.firstElementChild.getBoundingClientRect().height;
            elem.style.height = `${h}px`;
            elem.style.opacity = `1`;
            if (elem instanceof HTMLElement && this.listRef.value && elem !==  this.listRef.value.children[0]) {
                elem.style.marginTop = this.margin;
            }
            if (elem instanceof HTMLElement && this.listRef.value && elem ===  this.listRef.value.children[this._props.items.length - 1]) {
                elem.style.marginBottom = this.margin;
            }
        }
    }

    reapplyHeights() {
        for (let i = 0; this.listRef.value && i < this.listRef.value.children.length; ++i) {
            const child = this.listRef.value.children[i];
            if (child && child instanceof HTMLElement) {
                this.assignHeight(child);
                // this.animateSetHeight(child, 2000);
            }
        }
    }


    async animateAppendTop() {
        const ref = this.listRef.value;
        if (!this._props.items || ref == undefined) return;
        const f = ref.children[0];
        if (f && f instanceof HTMLElement) {
            f.style.opacity = `0`;
            // f.style.height = '0px';
        }
        await this.updateComplete;
        let childTop = ref.children[0];
        
        if (!childTop || !childTop.firstElementChild || !(childTop instanceof HTMLElement)) return;
        const upperHeight = childTop.firstElementChild.getBoundingClientRect().height;
        
        childTop.animate([
            {
                height: `${0}px`,
                opacity: '0',
                easing: 'ease-out'
            },
            {
                height: `${upperHeight}px`,
                opacity: '1',
                easing: 'ease-out'
            }
        ], { duration: this.duration})

        this.reapplyHeights();
    }

    /** @param {'first' | 'last' | number} [index] @returns {HTMLElement | undefined} */
    getChild(index) {
        let c;
        if (index != undefined && this.listRef.value != undefined && this._props.items != undefined) {
            if (index === 'first') {
                c = this.listRef.value.children[0];
            } else if (index === 'last') {
                c = this.listRef.value.children[this._props.items.length];
            } else {
                c = this.listRef.value.children[index];
            }
        }
        if (c instanceof HTMLElement) {
            return c;
        }
    }

    /** @param {'first' | 'last' | number} [index]  */
    async animateRemove(index) {
        // await this.updateComplete;
        // const ref = this.listRef.value;
        // if (!this._props.items || ref == undefined) return;
        // if (index === this._props.items.length - 1) {
        //     const c = ref.children[this._props.items.length - 1];
        // }
        let promiseResolve;
        this.awaitRender = new Promise((resolve, reject) => {
            promiseResolve = resolve;
        });
        const child = this.getChild(index);
        console.log('remove child: ', child, ' at: ', index);
        
        if (child) {
            const h = window.getComputedStyle(child).height;
            console.log('ANIMATE REMOVE: ', child);
            
            child.animate([
                {
                    height: `${child.clientHeight}px`,
                    opacity: '1',
                    easing: 'ease-out'
                },
                {
                    height: '0px',
                    opacity: '0',
                    easing: 'ease-out'
                }
            ], { duration: this.duration}).finished.then(async ()=> {
                // this.awaitRender.
                console.log('animation done: ', child);
                promiseResolve();
                await this.updateComplete;
                this.reapplyHeights();
                // child.remove();
            });
        }
        
    }


    reorderItemsAndAnimate() {
        for (let i = 0; this._props.items && i < this.internalItems.length; ++i) {
            if (this.internalItems[i] !== this._props.items[i]){
                return i;
            }
        }
    }


    getUnmatchingItemIndex() {
        for (let i = 0; this._props.items && i < this.internalItems.length; ++i) {
            if (this.internalItems[i] !== this._props.items[i]){
                return i;
            }
        }
    }

    onPropChange(k,v) {
        console.log('propchange: ', ' k: ', k, ' v: ', v);
        
        if (k === 'items' && Array.isArray(v) && !this.initialized && this.animatelist) {
            const items = this._props.items;
            let i = 0;
            while (items && i < items.length) {
                this.internalItems.push(items[i]);
                ++i;
            }
            this.initElements();
            this.initialized = true;
        }
        return true;
    }

   

    checkItems() {
        const items = this._props.items;
        if (!items) return;
        let i = 0;
        console.log('');
        console.log('CHECK');
        let foundIndex = -1;

        

        if (this.internalItems.length === 0 && !this.willInitialize) {
            while (i < items.length) {
                this.internalItems.push(items[i]);
                ++i;
            }
            this.animateAppendBottom(0);
          
            
        } else if (items.length > this.internalItems.length) {
            if (this.internalItems[0] !== items[0]) {
                console.log('item added at the from');
                this.internalItems.unshift(items[0]);
                foundIndex = 0;
                this.animateAppendTop();
            } else if (this.internalItems.at(-1) !== items.at(-1)) {
                console.log('item added at the back');
                this.internalItems.push(items.at(-1));
                this.animateAppendBottom(items.length - 1);
            }
        } else if (items.length < this.internalItems.length) {
            if (this.internalItems[0] !== items[0]) {
                console.log('item removed at the from');
                this.internalItems.shift();
                this.animateRemove('first');
            } else if (this.internalItems.at(-1) !== items.at(-1) && this.internalItems.at(-2) != items.at(-1)) {
                console.log('item removed at the back');
                console.log('this: ', this.internalItems.at(-1));
                console.log('item: ', items.at(-1));
                
                this.internalItems.pop();
                this.animateRemove('last');
            } else {
                const i = this.getUnmatchingItemIndex();
                if (i) {
                    this.internalItems.splice(i, 1);
                    this.animateRemove(i);
                }
            }
        } else if (items.length === this.internalItems.length) {
            const i = this.getUnmatchingItemIndex();
            console.log('shifted at: ',i);
            if (i) {
                console.log('shifted at: ',i);
                
            }
        }
        console.log('result: ', this.internalItems);
        console.log('items: ', items);

        

        // new : l m n o -> first items are the same -> last is different -> added at the back
        // curr: l m n

        // new : k l m n -> the first item is different -> added at the front
        // curr: l m n

        // while (i < items.length || i < this.internalItems.length) {

        //     if (this.internalItems[i] === undefined) {
        //         this.internalItems[i] = items[i];
        //         console.log('array item added at pos: ', i);
        //         this.internalItems.splice(i, 1, items[i]);
        //     } else if (this.internalItems[i] === items[i]) {
        //         console.log('array items are same at pos: ', i, ' internal: ', this.internalItems[i], ' new: ', items[i]);
        //         this.internalItems[i] = items[i];
        //     } else if (this.internalItems[i] !== items[i]) {
        //         console.log('array items are not same at pos: ', i, ' internal: ', this.internalItems[i], ' new: ', items[i]);
        //         this.internalItems[i] = items[i];
        //     } else if (items[i] === undefined) {
        //         console.log('array item removed at pos: ', i);
        //         this.internalItems.splice(i, 1);
        //     }

        //     ++i;
        // }
    }

    firstUpdated() {
        console.log('first update: animatelist: ', this.animatelist);
        console.log('first update: props: ', this._props.items);
    }
    

    listRef = createRef();
    render() {
        // console.log('this.props.items: ', this.props.items);
        console.log('render: animatelist: ', this.animatelist);
        console.log('render: props: ', this._props.items);
        
        if (this.animatelist) {
            this.checkItems();
        }
        // this.scrollheight.length > 0 ? 'this.scrollheight' : 
        return !this.unstyled ? html`
            <ul ${ref(this.listRef)} class="list-group ${ this.flush ? 'list-group-flush' : ''}">
                    ${this._props.items?.map((data, i) => html`
                        <li class="${this.animatelist ? 'list-container' : ''}  list-group-item ${this.light ? 'bg-light-subtle' : ''} p-0">
                            ${this.animatelist ? html`
                                <div class="list-item">
                                    ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
                                </div>
                            ` : html`
                                ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
                            `}
                        </li>
                    `)}
            </ul>
        ` : html`
            <div ${ref(this.listRef)} >
                    ${this._props.items?.map((data, i) => html`
                        <div class="${this.animatelist ? 'list-container' : ''} ${this.light ? 'bg-light-subtle' : ''} p-0">
                            ${this.animatelist ? html`
                                <div class="list-item">
                                    ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
                                </div>
                            ` : html`
                                ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
                            `}
                        </div>
                    `)}
            </div>
        
        `

        return html`
            ${this.animatelist ? html`
                <ul ${ref(this.listRef)} class="list-group ${this.flush ? 'list-group-flush' : ''} ">
                    ${this._props.items?.map((data, i) => html`
                        <li class="list-container bg-light-subtle list-group-item flex-grow-1">
                            <div class="list-item">
                                ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
                            </div>
                        </li>
                    `)}
                </ul>
            ` : html`
                <ul class="list-group ${this.flush ? 'list-group-flush' : ''} ">
                    ${this._props.items?.map((data, i) => html`
                        <li class="list-container bg-light-subtle list-group-item flex-grow-1">
                            ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
                        </li>
                    `)}
                </ul>
            
            `}
        `
        // return html`
        //     <ul ${ref(this.listRef)} class="list">
        //         ${this._props.items?.map((data, i) => html`
        //             <li class="list-container">
        //                 <div class="list-item">
        //                     ${this.props.rendercb ? this.props.rendercb(data, i) : ''}
        //                 </div>
        //             </li>
        //         `)}
        //     </ul>
        // `
    }
}
customElements.define("list-group", ListGroup)



/**
 * @template {import('../lib_templ/BaseBase.js').BaseBaseProps} K
 * @extends BaseElement<K>
 */
export class ShapeAnimator extends BaseElement {

    constructor() {
        super();
    }

  /**
     * @template {keyof K} T
     * @param {T} key
     * @param {K[T]} value
     */
    onPropChange(key, value) {
        // if (key === 'p')
        //     return true;
        // return false;
        return true;
    }

    willUpdate() {
        console.log('willUpdate');
        this.elem = this.firstElementChild;
        console.log('elem: ', this.elem);
        if (this.elem == null) {
            this.prevWidth = 0;
            this.prevHeight = 0;
        } else {
            const rect = this.elem.getBoundingClientRect();
            this.prevWidth = rect.width;
            this.prevHeight = rect.height;
        }
    }


    updated() {
        console.log('updated');
        let newHeight, newWidth;
        const elemBeforeMount = this.elem;
        console.log('elemBeforeMount: ', elemBeforeMount);
        this.elem = this.firstElementChild;
        console.log('elem: ', this.elem);
        if (!(this.elem instanceof HTMLElement)) return;
        const rect = this.elem.getBoundingClientRect();
            // this.elem.style.position = 'fixed';
            // this.elem.style.top = `${rect.top}px`;
            // this.elem.style.left = `${rect.left}px`;
            // this.elem.style.display = 'block';
            // this.elem.style.width = '0px';
            // this.elem.style.transition = 'width 1s ease-out;'
            const style = window.getComputedStyle(this.elem);
            console.log('rect: ', rect);
            
            console.log('height: ', style.height);
            console.log('rect height: ', rect.height);
            console.log('width: ', style.width);
            console.log('rect width: ', rect.width);
            newWidth = rect.width;
        
        // this.elem.style.width = `${this.prevWidth}px`
        // this.elem.style.opacity = '0';
        // this.elem.style.position = 'fixed';
        // this.elem.style.top = `${rect.top}px`;
        // this.elem.style.left = `${rect.left}px`;

        console.log(`animate width from ${this.prevWidth} to ${newWidth}`);
        
        
        // this.elem.animate([
        //     {
        //         // from
        //         width: `${this.prevWidth}px`,
        //         opacity: '0',
        //         easing: 'ease-out',
        //     },
        //     {
        //         // to
        //         width: `${newWidth}px`,
        //         opacity: '1',
        //         easing: 'ease-out',
        //     }
        // ], {  duration: 200, }).finished.then(()=> {
        //     this.elem.style.width = null;
        //     this.elem.style.opacity = null;
        //     this.elem.style.position = null;
        //     this.elem.style.top = null;
        //     this.elem.style.left = null;
        // })
        
        // this.elem.style.opacity = '1';
        // this.elem.style.width = `${newWidth}px`;
    }

    render() {
        return html`
            ${this.props.children}
        `
    }
}
customElements.define("shape-animator", ShapeAnimator);