import AttributeBoolNode from './nodes/AttributeBoolNode';
import AttributeEventNode from './nodes/AttributeEventNode';
import AttributeMultiNode from './nodes/AttributeNode';
import AttributePropNode from './nodes/AttributePropNode';
import FuncNode from './nodes/FuncNode';
// eslint-disable-next-line import/no-cycle
import OuterNode from './nodes/OuterNode';

/**
 * @typedef {OuterNode | FuncNode | AttributePropNode | AttributeBoolNode | AttributeEventNode | AttributeMultiNode | null} TemplNode
 */

/**
 * @typedef {object} StaleNode
 * @property {number} t
 * @property {number} i
 * @property {string} [n]
 * @property {Array<string>} [s]
 */

const wTypes = {
    outer: 0,
    func: 1,
    prop: 2,
    bool: 3,
    event: 4,
    multiAttr: 7,
    none: 8,
};

const walker = document.createTreeWalker(
    document,
    // eslint-disable-next-line no-bitwise
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
);

const templStr = 'templ';
export const attributeMarker = `$${templStr}$`;
export const valueMarker = `$${templStr}$${Math.random().toString().slice(2, 4)}$`;
export const commentMarker = `<?${valueMarker}>`;
const commentMarkerCheck = `?${valueMarker}`;

/**
 * @param {Array<StaleNode | null>} parts
 * @param {Node} node
 * @param {number} nodeCount
 */
function handleDynamicAttribute(parts, node, nodeCount) {
    if (!(node instanceof Element)) throw new Error('no element node');
    if (!node.hasAttributes()) return;

    const attrsToRemove = [];

    node.getAttributeNames().forEach((name) => {
        // console.log('yoyoyo, schau mal, check attr noodes');
        if (name.endsWith(attributeMarker)) {
            // console.log("attr element to add: ", node);
            if (
                name.charCodeAt(0) >= '0'.charCodeAt(0) &&
                name.charCodeAt(0) <= '9'.charCodeAt(0)
            ) {
                // console.log("is a Func Node!: ", name, " | node: ", node);
                parts.push({ t: wTypes.func, i: nodeCount });
                attrsToRemove.push(name);
            } else {
                const realName = name.slice(
                    0,
                    name.length - attributeMarker.length,
                );
                // console.log("real name: ", realName)
                attrsToRemove.push(name);
                if (realName !== undefined) {
                    if (name[0] === '.') {
                        parts.push({
                            t: wTypes.prop,
                            i: nodeCount,
                            n: realName.slice(1, realName.length),
                        });
                    } else if (name[0] === '?') {
                        parts.push({
                            t: wTypes.bool,
                            i: nodeCount,
                            n: realName.slice(1, realName.length),
                        });
                    } else if (name[0] === '@') {
                        // console.log("is a event Node!: ", name, " | node: ", node);
                        parts.push({
                            t: wTypes.event,
                            i: nodeCount,
                            n: realName.slice(1, realName.length),
                        });
                    } else {
                        const valueArr = node
                            .getAttribute(name)
                            ?.split(valueMarker);
                        for (
                            let i = 0;
                            valueArr && i !== valueArr.length - 1;
                            i++
                        )
                            parts.push({
                                t: wTypes.multiAttr,
                                i: nodeCount,
                                n: realName,
                                s: valueArr,
                            });
                    }
                }
            }
        }
    });
    attrsToRemove.forEach((name) => node.removeAttribute(name));
}

/**
 * @param {Array<StaleNode | null>} parts
 * @param {string} text
 */
function handleUnwanted(parts, text) {
    let i = 0;
    let j = 0;
    while (j !== -1) {
        // console.log('FIND!!!');
        j = text.indexOf(valueMarker, i);
        if (j === -1) break;
        parts.push(null);
        i = j + valueMarker.length;
    }
}

/**
 * @param {Array<StaleNode | null>} parts
 * @param {Node} node
 * @param {number} nodeCount
 */
function handleDynamicText(parts, node, nodeCount) {
    if (!(node instanceof Comment)) throw new Error('no comment node');
    // // console.log("handle Comment")

    if (node.data === commentMarkerCheck) {
        // // console.log("is my marker");
        parts.push({ t: wTypes.outer, i: nodeCount });
    } else {
        // // // console.log("is unwanted: ", node);
        handleUnwanted(parts, node.data);
    }
}

/**
 * @param {number} maxNodes
 * @param {Array<StaleNode | null>} staleNodes
 */
function walkingTheTemplate(maxNodes, staleNodes) {
    let nodeCount = 1;
    let node = walker.nextNode();
    while (node !== null) {
        // console.log('get stale: index: ', nodeCount, ' | node: ', node);
        if (node.nodeType === Node.ELEMENT_NODE && node instanceof Element) {
            // if ( /^(?:script|style|textarea|title)$/i.test(node.tagName) && node.textContent ) {
            if ( /^(?:script|style|title)$/i.test(node.tagName) && node.textContent ) {
                handleUnwanted(staleNodes, node.textContent);
            } else {
                handleDynamicAttribute(staleNodes, node, nodeCount);
            }
        } else if (node.nodeType === Node.COMMENT_NODE) {
            handleDynamicText(staleNodes, node, nodeCount);
        }
        nodeCount++;
        node = walker.nextNode();
    }
    // console.log('maxNodes: ', maxNodes);
    // console.log('stale nodes: ', staleNodes);
    // console.log('staleNodes.length: ', staleNodes.length);

    if (staleNodes.length !== maxNodes) throw new Error('Not same number :o');
}

/**
 * @param {Array<StaleNode | null>} staleNodes
 * @returns {TemplNode[]}
 */
function resolveTemplate(staleNodes) {
    let nodeCount = 0;
    let i = 0;
    const liveNodes = [];
    while (i < staleNodes.length) {
        // console.log('fuuuu: ', staleNodes.length);
        const st = staleNodes[i];
        if (st === null) {
            i++;
        } else if ( st !== null && st.i === nodeCount) {
            const node = walker.currentNode;

            
            if (st.t === wTypes.outer) {
                // @ts-ignore
                liveNodes.push(new OuterNode(node, i));
            } else if (st.t === wTypes.func) {
                // @ts-ignore
                liveNodes.push(new FuncNode(node, i));
            } else if (st.n && st.t === wTypes.prop) {
                // @ts-ignore
                liveNodes.push(new AttributePropNode(node, st.n, i));
            } else if (st.n && st.t === wTypes.bool) {
                // @ts-ignore
                liveNodes.push(new AttributeBoolNode(node, st.n, i));
            } else if (st.n && st.t === wTypes.event) {
                // @ts-ignore
                liveNodes.push(new AttributeEventNode(node, st.n, i));
            } else if (st.s && st.n && st.t === wTypes.multiAttr) {
                const len = st.s.length;
                if (!len) throw new Error('!!!!');
                const e = new AttributeMultiNode(node, st.n, st?.s, i);
                for (let k = 0; k !== len - 1; k++, i++) {
                    liveNodes.push(e);
                    if (staleNodes[i]?.t !== wTypes.multiAttr)
                        throw new Error('INVALID MULT NODE COUNT');
                }
                i--;
            } else if (st.t === wTypes.none) {
                liveNodes.push(null);
            }

            i++;
        } else {
            nodeCount++;
            walker.nextNode();
        }
    }
    return liveNodes;
}

/**
 * @returns {(parentNode: Node, maxNodes: number) => (parentNode2: Node) => TemplNode[]}
 */
export default function useTemplateTreeWalker() {
    /**
     * @param {Node} parentNode
     * @param {number} maxNodes
     * @returns {(parentNode2: Node) => TemplNode[]}
     */
    const getStale = (parentNode, maxNodes) => {
        const staleNodes = [];
        walker.currentNode = parentNode;
        walkingTheTemplate(maxNodes, staleNodes);
        /**
         * @param {Node} parentNode2
         * @returns {TemplNode[]}
         */
        const getLive = (parentNode2) => {
            walker.currentNode = parentNode2;
            return resolveTemplate(staleNodes);
        };
        return getLive;
    };
    return getStale;
}
