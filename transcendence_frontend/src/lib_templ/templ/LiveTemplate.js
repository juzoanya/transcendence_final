import AttributeEventNode from './nodes/AttributeEventNode.js';

/**
 * @typedef {object} Anim
 * @property {number} delay
 * @property {string} animType
 * @property {boolean} animate
 * @property {string} [dir]
 * @property {Array<Element>} [elem]
 * @property {(delay?: number)=>undefined|Anim} [unmount]
 */

export default class LiveTemplate {
    /** @param {import('./Template.js').default} template */
    constructor(template) {
        this.#template = template;
    }

    get template() {
        return this.#template;
    }

    /** @type {import('./Template.js').default} */
    #template;
    /** @type {Array<ChildNode> | undefined} */
    #nodes;
    /** @type {import('./nodes/BaseNode.js').default[] | undefined} */
    #parts;
    #mounted = false;

    /**
     * @param {HTMLElement} elementToAppend
     * @param {Node | null} commentMarkerNode
     * @param {any[]} templateValues
     * @param {Anim} [anim]
     */
    mountMe(elementToAppend, commentMarkerNode, templateValues, anim) {
        // if (!(elementToAppend instanceof HTMLElement) || (commentMarkerNode instanceof Comment) || !(templateValues instanceof Array)) {
        //     throw new Error("LiveTemplate: INVALID ARGUMENTS TO MOUNT")
        // }
        const { frag, liveNodes } = this.#template.getLiveNodes();
        this.#nodes = Array.from(frag.childNodes);
        this.#parts = liveNodes;
        elementToAppend.insertBefore(frag, commentMarkerNode);
        if (templateValues) this.update(templateValues);
        this.#mounted = true;
    }

    /** @param {any[]} values  */
    update(values) {
        if (!(values instanceof Array)) {
            throw new Error('LiveTemplate: update: invalid value, needs to be an Array');
        }
        if (values.length !== this.#template.valueArrLen) {
            throw new Error('length not fitting');
        }
        let i = 0, len = values.length;
        while (i < len) {
            if (this.#parts && this.#parts[i])
                this.#parts[i].setValue(values[i], i);
            ++i;
        }
    }

    unMountNode(n) {
        if (n.nodeType === Node.ELEMENT_NODE) {
            n.remove();
        }
        if (n.nodeType === Node.TEXT_NODE) n.remove();
        if (n.nodeType === Node.COMMENT_NODE) {
            const callable = this.#parts?.find((liven) => liven.element === n);
            callable?.destroy();
            n.remove();
        }
    }

    /**
     * @param {Anim} [anim]
     * @returns {Anim | undefined}
     */
    unMountMe(anim) {
        if (!this.#mounted || this.#nodes == undefined || !this.#parts) {
            throw new Error("LiveTemplate: unMountMe: Try to unmount, before initialized")
        }
        let i = 0, len = this.#parts.length;
        while (i < len) {
            this.#parts[i].destroy();
            ++i;
        }
        i = 0, len = this.#nodes.length;
        while (i < len) {
            this.#nodes[i].remove();
            ++i;
        }
        this.#mounted = false;
        return undefined;
    }

    // unMountNode(n) {
    //     if (n.nodeType === Node.ELEMENT_NODE) {
    //         n.remove();
    //     }
    //     if (n.nodeType === Node.TEXT_NODE) n.remove();
    //     if (n.nodeType === Node.COMMENT_NODE) {
    //         const callable = this.#parts?.find((liven) => liven.element === n);
    //         callable?.destroy();
    //         n.remove();
    //     }
    // }

    // /**
    //  * @param {Anim} [anim]
    //  * @returns {Anim | undefined}
    //  */
    // unMountMe(anim) {
    //     // console.log("UNMOUNT ME")
    //     if (!this.#mounted) return undefined;
    //     // console.log("my Node Len: ", this.#nodes)
    //     // console.log("anim: ", anim)
    //     if (anim && anim.animate) {
    //         const doAnimate = anim.animate ?? false;
    //         anim.animate = false;
    //         return {
    //             delay: anim.delay ?? 200,
    //             // @ts-ignore
    //             __elem: this.#nodes.filter(
    //                 (n) => n.nodeType === Node.ELEMENT_NODE,
    //             ),
    //             __unmount: this.unMountMe.bind(this),
    //             animType: anim.animType ?? 'fade',
    //             animate: doAnimate,
    //             dir: anim.dir,
    //         };
    //     }
    //     // console.log("unmount: ", this.#nodes);

    //     this.#parts?.forEach((part) => {
    //         if (part instanceof AttributeEventNode) part.destroy();
    //     });
    //     this.#nodes?.forEach((n) => {
    //         this.unMountNode(n);
    //     });
    //     this.#mounted = false;
    //     return undefined;
    // }
}

// /**
//  * @typedef {object} Anim
//  * @property {number} delay
//  * @property {string} animType
//  * @property {boolean} animate
//  * @property {string} [dir]
//  * @property {Array<Element>} [elem]
//  * @property {(delay?: number)=>undefined|Anim} [unmount]
//  */

// export default class LiveTemplate {
//     /** @param {import('./Template.js').default} template */
//     constructor(template) {
//         this.#template = template;
//     }

//     /**
//      *
//      * @param {Node | null} node
//      * @param {ChildNode | null} childNode
//      * @param {any[]} values
//      * @param {Anim} [anim]
//      */
//     mountMe(node, childNode, values, anim) {
//         if (this.#mounted || node === null) return;
//         this.#ret = this.#template.getLiveNodes();
//         this.#parts = this.#ret.liveNodes;
//         const fragment = this.#ret.frag;
//         if (!(fragment instanceof DocumentFragment)) return;

//         this.#mounted = true;
//         this.#nodes = Array.from(this.#ret.frag.childNodes);

//         if (
//             anim &&
//             this.#nodes instanceof Array &&
//             this.#ret.frag instanceof DocumentFragment &&
//             node instanceof HTMLElement
//         ) {
//             // const moveNodes = (nodes, parent, before) => {};
//             // console.log("BEFORE ANIM, nodes: ", this.#nodes);

//             if (values) this.update(values);

//             /** @type {HTMLElement} */
//             const myNode = document.createElement('div');
//             // myNode.append(this.#nodes);
//             this.#nodes.forEach((n) => {
//                 // console.log("move nodes!: ", n);
//                 // console.dir(n);
//                 // console.log("move nodes target?: ", n.___animtarget);
//                 // if(n.___animtarget === true) {
//                 //     console.log("anim target!: ", n);
//                 //     myNode.insertBefore(n, null);
//                 // }
//                 myNode.insertBefore(n, null);
//             });

//             node.appendChild(myNode);

//             const parentRect = node.getBoundingClientRect();
//             const myRect = myNode.getBoundingClientRect();
//             // console.log("parent rect: ", parentRect)
//             // console.log("my rect: ", myRect)
//             // console.log("dir: ", anim.dir)
//             // console.log("myNode: ", myNode)
//             const transY = parentRect.y - myRect.y;
//             const transX =
//                 anim.dir === 'left' ? -parentRect.width : parentRect.width;
//             myNode.style.translate = `${transX}px ${transY}px`;

//             node.animate([{ translate: `${-transX}px 0px` }], {
//                 duration: anim.delay,
//                 easing: 'ease-in-out',
//             }).finished.then(() => {
//                 if (anim.unmount) anim.unmount();
//                 // console.log("ANIM DONE, nodes: ", this.#nodes);
//                 this.#nodes?.forEach((n) => {
//                     node.insertBefore(n, null);
//                 });
//                 if (values) this.update(values);
//                 myNode.remove();
//                 // console.log("now prev rect: ", node.getBoundingClientRect())
//                 // console.log("now my rect: ", node.firstElementChild.getBoundingClientRect())
//             });
//         } else {
//             // console.log("no animate!")
//             // console.log("mount this!: ", this.#ret.frag);
//             // console.log("vals: ", values);
//             node.insertBefore(this.#ret.frag, childNode);
//             if (values) this.update(values);
//         }
//     }

//     get template() {
//         return this.#template;
//     }

//     #mounted = false;

//     unMountNode(n) {
//         if (n.nodeType === Node.ELEMENT_NODE) {
//             n.remove();
//         }
//         if (n.nodeType === Node.TEXT_NODE) n.remove();
//         if (n.nodeType === Node.COMMENT_NODE) {
//             const callable = this.#parts?.find((liven) => liven.element === n);
//             callable?.destroy();
//             n.remove();
//         }
//     }

//     /**
//      * @param {Anim} [anim]
//      * @returns {Anim | undefined}
//      */
//     unMountMe(anim) {
//         // console.log("UNMOUNT ME")
//         if (!this.#mounted) return undefined;
//         // console.log("my Node Len: ", this.#nodes)
//         // console.log("anim: ", anim)
//         if (anim && anim.animate) {
//             const doAnimate = anim.animate ?? false;
//             anim.animate = false;
//             return {
//                 delay: anim.delay ?? 200,
//                 // @ts-ignore
//                 __elem: this.#nodes.filter(
//                     (n) => n.nodeType === Node.ELEMENT_NODE,
//                 ),
//                 __unmount: this.unMountMe.bind(this),
//                 animType: anim.animType ?? 'fade',
//                 animate: doAnimate,
//                 dir: anim.dir,
//             };
//         }
//         // console.log("unmount: ", this.#nodes);

//         this.#parts?.forEach((part) => {
//             if (part instanceof AttributeEventNode) part.destroy();
//         });
//         this.#nodes?.forEach((n) => {
//             this.unMountNode(n);
//         });
//         this.#mounted = false;
//         return undefined;
//     }

//     /** @param {any[]} values  */
//     update(values) {
//         // console.log("update!: ", values);
//         if (values.length !== this.#template.valueArrLen) {
//             // console.log("error value length: ");
//             // console.log("value: ", values);
//             // console.log("this.#template.valueArrLen: ", this.#template.valueArrLen);
//             throw new Error('length not fitting');
//         }
//         for (let i = 0; i !== values.length; i++) {
//             if (this.#parts && this.#parts[i])
//                 this.#parts[i].setValue(values[i], i);
//         }
//     }

//     /** @type {import('./Template.js').default} */
//     #template;

//     /** @type {Array<Text | Comment | Element | ChildNode> | undefined} */
//     #nodes;

//     /** @type {import('./nodes/BaseNode.js').default[] | undefined} */
//     #parts;

//     #ret;
// }
