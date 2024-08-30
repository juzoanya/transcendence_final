

const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;



const ENABLE_EXTRA_SECURITY_HOOKS = true;
const ENABLE_SHADYDOM_NOPATCH = true;
const NODE_MODE = false;

const d =
    NODE_MODE && global.document === undefined
        ? ({
            createTreeWalker() {
                return {};
            },
        } as unknown as Document)
        : document;

const createMarker = () => d.createComment('');

const wrap =
    ENABLE_SHADYDOM_NOPATCH &&
        global.ShadyDOM?.inUse &&
        global.ShadyDOM?.noPatch === true
        ? (global.ShadyDOM!.wrap as <T extends Node>(node: T) => T)
        : <T extends Node>(node: T) => node;

export type SanitizerFactory = (
    node: Node,
    name: string,
    type: 'property' | 'attribute',
) => ValueSanitizer;
const noopSanitizer: SanitizerFactory = (
    _node: Node,
    _name: string,
    _type: 'property' | 'attribute',
) => identityFunction;

export type ValueSanitizer = (value: unknown) => unknown;

const identityFunction: ValueSanitizer = (value: unknown) => value;

let sanitizerFactoryInternal: SanitizerFactory = noopSanitizer;


const createSanitizer: SanitizerFactory = (node, name, type) => {
    return sanitizerFactoryInternal(node, name, type);
};

export interface Disconnectable {
    _$parent?: Disconnectable;
    _$disconnectableChildren?: Set<Disconnectable>;
    // Rather than hold connection state on instances, Disconnectables recursively
    // fetch the connection state from the RootPart they are connected in via
    // getters up the Disconnectable tree via _$parent references. This pushes the
    // cost of tracking the isConnected state to `AsyncDirectives`, and avoids
    // needing to pass all Disconnectables (parts, template instances, and
    // directives) their connection state each time it changes, which would be
    // costly for trees that have no AsyncDirectives.
    _$isConnected: boolean;
}


export const nothing = Symbol.for('lit-nothing');
export const noChange = Symbol.for('lit-noChange');

type Primitive = null | undefined | boolean | number | string | symbol | bigint;
const isPrimitive = (value: unknown): value is Primitive =>
    value === null || (typeof value != 'object' && typeof value != 'function');

const isArray = Array.isArray;
const isIterable = (value: unknown): value is Iterable<unknown> =>
    isArray(value) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (value as any)?.[Symbol.iterator] === 'function';

// Type for classes that have a `_directive` or `_directives[]` field, used by
// `resolveDirective`
export interface DirectiveParent {
    _$parent?: DirectiveParent;
    _$isConnected: boolean;
    __directive?: Directive;
    __directives?: Array<Directive | undefined>;
}

function resolveDirective(
    part: ChildPart | AttributePart | ElementPart,
    value: unknown,
    parent: DirectiveParent = part,
    attributeIndex?: number,
): unknown {
    // Bail early if the value is explicitly noChange. Note, this means any
    // nested directive is still attached and is not run.
    if (value === noChange) {
        return value;
    }
    let currentDirective =
        attributeIndex !== undefined
            ? (parent as AttributePart).__directives?.[attributeIndex]
            : (parent as ChildPart | ElementPart | Directive).__directive;
    const nextDirectiveConstructor = isPrimitive(value)
        ? undefined
        : // This property needs to remain unminified.
        (value as DirectiveResult)['_$litDirective$'];
    if (currentDirective?.constructor !== nextDirectiveConstructor) {
        // This property needs to remain unminified.
        currentDirective?.['_$notifyDirectiveConnectionChanged']?.(false);
        if (nextDirectiveConstructor === undefined) {
            currentDirective = undefined;
        } else {
            currentDirective = new nextDirectiveConstructor(part as PartInfo);
            currentDirective._$initialize(part, parent, attributeIndex);
        }
        if (attributeIndex !== undefined) {
            ((parent as AttributePart).__directives ??= [])[attributeIndex] =
                currentDirective;
        } else {
            (parent as ChildPart | Directive).__directive = currentDirective;
        }
    }
    if (currentDirective !== undefined) {
        value = resolveDirective(
            part,
            currentDirective._$resolve(part, (value as DirectiveResult).values),
            currentDirective,
            attributeIndex,
        );
    }
    return value;
}




/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
export interface RenderOptions {
    /**
     * An object to use as the `this` value for event listeners. It's often
     * useful to set this to the host component rendering a template.
     */
    host?: object;
    /**
     * A DOM node before which to render content in the container.
     */
    renderBefore?: ChildNode | null;
    /**
     * Node used for cloning the template (`importNode` will be called on this
     * node). This controls the `ownerDocument` of the rendered DOM, along with
     * any inherited context. Defaults to the global `document`.
     */
    creationScope?: { importNode(node: Node, deep?: boolean): Node; };
    /**
     * The initial connected state for the top-level part being rendered. If no
     * `isConnected` option is set, `AsyncDirective`s will be connected by
     * default. Set to `false` if the initial render occurs in a disconnected tree
     * and `AsyncDirective`s should see `isConnected === false` for their initial
     * render. The `part.setConnected()` method must be used subsequent to initial
     * render to change the connected state of the part.
     */
    isConnected?: boolean;
}


export class ChildPart implements Disconnectable {
    readonly type = CHILD_PART;
    readonly options: RenderOptions | undefined;
    _$committedValue: unknown = nothing;
    /** @internal */
    __directive?: Directive;
    /** @internal */
    _$startNode: ChildNode;
    /** @internal */
    _$endNode: ChildNode | null;
    private _textSanitizer: ValueSanitizer | undefined;
    /** @internal */
    _$parent: Disconnectable | undefined;
    /**
     * Connection state for RootParts only (i.e. ChildPart without _$parent
     * returned from top-level `render`). This field is unused otherwise. The
     * intention would be clearer if we made `RootPart` a subclass of `ChildPart`
     * with this field (and a different _$isConnected getter), but the subclass
     * caused a perf regression, possibly due to making call sites polymorphic.
     * @internal
     */
    __isConnected: boolean;

    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        // ChildParts that are not at the root should always be created with a
        // parent; only RootChildNode's won't, so they return the local isConnected
        // state
        return this._$parent?._$isConnected ?? this.__isConnected;
    }

    // The following fields will be patched onto ChildParts when required by
    // AsyncDirective
    /** @internal */
    _$disconnectableChildren?: Set<Disconnectable> = undefined;
    /** @internal */
    _$notifyConnectionChanged?(
        isConnected: boolean,
        removeFromParent?: boolean,
        from?: number,
    ): void;
    /** @internal */
    _$reparentDisconnectables?(parent: Disconnectable): void;

    constructor(
        startNode: ChildNode,
        endNode: ChildNode | null,
        parent: TemplateInstance | ChildPart | undefined,
        options: RenderOptions | undefined,
    ) {
        this._$startNode = startNode;
        this._$endNode = endNode;
        this._$parent = parent;
        this.options = options;
        // Note __isConnected is only ever accessed on RootParts (i.e. when there is
        // no _$parent); the value on a non-root-part is "don't care", but checking
        // for parent would be more code
        this.__isConnected = options?.isConnected ?? true;
        if (ENABLE_EXTRA_SECURITY_HOOKS) {
            // Explicitly initialize for consistent class shape.
            this._textSanitizer = undefined;
        }
    }

    /**
     * The parent node into which the part renders its content.
     *
     * A ChildPart's content consists of a range of adjacent child nodes of
     * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
     * `.endNode`).
     *
     * - If both `.startNode` and `.endNode` are non-null, then the part's content
     * consists of all siblings between `.startNode` and `.endNode`, exclusively.
     *
     * - If `.startNode` is non-null but `.endNode` is null, then the part's
     * content consists of all siblings following `.startNode`, up to and
     * including the last child of `.parentNode`. If `.endNode` is non-null, then
     * `.startNode` will always be non-null.
     *
     * - If both `.endNode` and `.startNode` are null, then the part's content
     * consists of all child nodes of `.parentNode`.
     */
    get parentNode(): Node {
        let parentNode: Node = wrap(this._$startNode).parentNode!;
        const parent = this._$parent;
        if (
            parent !== undefined &&
            parentNode?.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */
        ) {
            // If the parentNode is a DocumentFragment, it may be because the DOM is
            // still in the cloned fragment during initial render; if so, get the real
            // parentNode the part will be committed into by asking the parent.
            parentNode = (parent as ChildPart | TemplateInstance).parentNode;
        }
        return parentNode;
    }

    /**
     * The part's leading marker node, if any. See `.parentNode` for more
     * information.
     */
    get startNode(): Node | null {
        return this._$startNode;
    }

    /**
     * The part's trailing marker node, if any. See `.parentNode` for more
     * information.
     */
    get endNode(): Node | null {
        return this._$endNode;
    }

    _$setValue(value: unknown, directiveParent: DirectiveParent = this): void {

        value = resolveDirective(this, value, directiveParent);
        if (isPrimitive(value)) {
            // Non-rendering child values. It's important that these do not render
            // empty text nodes to avoid issues with preventing default <slot>
            // fallback content.
            if (value === nothing || value == null || value === '') {
                if (this._$committedValue !== nothing) {

                    this._$clear();
                }
                this._$committedValue = nothing;
            } else if (value !== this._$committedValue && value !== noChange) {
                this._commitText(value);
            }
            // This property needs to remain unminified.
        } else if ((value as TemplateResult)['_$litType$'] !== undefined) {
            this._commitTemplateResult(value as TemplateResult);
        } else if ((value as Node).nodeType !== undefined) {

            this._commitNode(value as Node);
        } else if (isIterable(value)) {
            this._commitIterable(value);
        } else {
            // Fallback, will render the string representation
            this._commitText(value);
        }
    }

    private _insert<T extends Node>(node: T) {
        return wrap(wrap(this._$startNode).parentNode!).insertBefore(
            node,
            this._$endNode,
        );
    }

    private _commitNode(value: Node): void {
        if (this._$committedValue !== value) {
            this._$clear();
            if (
                ENABLE_EXTRA_SECURITY_HOOKS &&
                sanitizerFactoryInternal !== noopSanitizer
            ) {
                const parentNodeName = this._$startNode.parentNode?.nodeName;
                if (parentNodeName === 'STYLE' || parentNodeName === 'SCRIPT') {
                    let message = 'Forbidden';

                    throw new Error(message);
                }
            }

            this._$committedValue = this._insert(value);
        }
    }

    private _commitText(value: unknown): void {
        // If the committed value is a primitive it means we called _commitText on
        // the previous render, and we know that this._$startNode.nextSibling is a
        // Text node. We can now just replace the text content (.data) of the node.
        if (
            this._$committedValue !== nothing &&
            isPrimitive(this._$committedValue)
        ) {
            const node = wrap(this._$startNode).nextSibling as Text;
            if (ENABLE_EXTRA_SECURITY_HOOKS) {
                if (this._textSanitizer === undefined) {
                    this._textSanitizer = createSanitizer(node, 'data', 'property');
                }
                value = this._textSanitizer(value);
            }

            (node as Text).data = value as string;
        } else {
            if (ENABLE_EXTRA_SECURITY_HOOKS) {
                const textNode = d.createTextNode('');
                this._commitNode(textNode);
                if (this._textSanitizer === undefined) {
                    this._textSanitizer = createSanitizer(textNode, 'data', 'property');
                }
                value = this._textSanitizer(value);

                textNode.data = value as string;
            } else {
                this._commitNode(d.createTextNode(value as string));

            }
        }
        this._$committedValue = value;
    }

    private _commitTemplateResult(
        result: TemplateResult | CompiledTemplateResult,
    ): void {
        // This property needs to remain unminified.
        const { values, ['_$litType$']: type } = result;
        // If $litType$ is a number, result is a plain TemplateResult and we get
        // the template from the template cache. If not, result is a
        // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
        // to create the <template> element the first time we see it.
        const template: Template | CompiledTemplate =
            typeof type === 'number'
                ? this._$getTemplate(result as UncompiledTemplateResult)
                : (type.el === undefined &&
                    (type.el = Template.createElement(
                        trustFromTemplateString(type.h, type.h[0]),
                        this.options,
                    )),
                    type);

        if ((this._$committedValue as TemplateInstance)?._$template === template) {

            (this._$committedValue as TemplateInstance)._update(values);
        } else {
            const instance = new TemplateInstance(template as Template, this);
            const fragment = instance._clone(this.options);

            instance._update(values);
            this._commitNode(fragment);
            this._$committedValue = instance;
        }
    }

    // Overridden via `litHtmlPolyfillSupport` to provide platform support.
    /** @internal */
    _$getTemplate(result: UncompiledTemplateResult) {
        let template = templateCache.get(result.strings);
        if (template === undefined) {
            templateCache.set(result.strings, (template = new Template(result)));
        }
        return template;
    }

    private _commitIterable(value: Iterable<unknown>): void {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.

        // If value is an array, then the previous render was of an
        // iterable and value will contain the ChildParts from the previous
        // render. If value is not an array, clear this part and make a new
        // array for ChildParts.
        if (!isArray(this._$committedValue)) {
            this._$committedValue = [];
            this._$clear();
        }

        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this._$committedValue as ChildPart[];
        let partIndex = 0;
        let itemPart: ChildPart | undefined;

        for (const item of value) {
            if (partIndex === itemParts.length) {
                // If no existing part, create a new one
                // TODO (justinfagnani): test perf impact of always creating two parts
                // instead of sharing parts between nodes
                // https://github.com/lit/lit/issues/1266
                itemParts.push(
                    (itemPart = new ChildPart(
                        this._insert(createMarker()),
                        this._insert(createMarker()),
                        this,
                        this.options,
                    )),
                );
            } else {
                // Reuse an existing part
                itemPart = itemParts[partIndex];
            }
            itemPart._$setValue(item);
            partIndex++;
        }

        if (partIndex < itemParts.length) {
            // itemParts always have end nodes
            this._$clear(
                itemPart && wrap(itemPart._$endNode!).nextSibling,
                partIndex,
            );
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
        }
    }

    /**
     * Removes the nodes contained within this Part from the DOM.
     *
     * @param start Start node to clear from, for clearing a subset of the part's
     *     DOM (used when truncating iterables)
     * @param from  When `start` is specified, the index within the iterable from
     *     which ChildParts are being removed, used for disconnecting directives in
     *     those Parts.
     *
     * @internal
     */
    _$clear(
        start: ChildNode | null = wrap(this._$startNode).nextSibling,
        from?: number,
    ) {
        this._$notifyConnectionChanged?.(false, true, from);
        while (start && start !== this._$endNode) {
            const n = wrap(start!).nextSibling;
            (wrap(start!) as Element).remove();
            start = n;
        }
    }
    /**
     * Implementation of RootPart's `isConnected`. Note that this method
     * should only be called on `RootPart`s (the `ChildPart` returned from a
     * top-level `render()` call). It has no effect on non-root ChildParts.
     * @param isConnected Whether to set
     * @internal
     */
    setConnected(isConnected: boolean) {
        if (this._$parent === undefined) {
            this.__isConnected = isConnected;
            this._$notifyConnectionChanged?.(isConnected);
        }
    }
}



export type { AttributePart };
class AttributePart implements Disconnectable {
    readonly type:
        | typeof ATTRIBUTE_PART
        | typeof PROPERTY_PART
        | typeof BOOLEAN_ATTRIBUTE_PART
        | typeof EVENT_PART = ATTRIBUTE_PART;
    readonly element: HTMLElement;
    readonly name: string;
    readonly options: RenderOptions | undefined;

    /**
     * If this attribute part represents an interpolation, this contains the
     * static strings of the interpolation. For single-value, complete bindings,
     * this is undefined.
     */
    readonly strings?: ReadonlyArray<string>;
    /** @internal */
    _$committedValue: unknown | Array<unknown> = nothing;
    /** @internal */
    __directives?: Array<Directive | undefined>;
    /** @internal */
    _$parent: Disconnectable;
    /** @internal */
    _$disconnectableChildren?: Set<Disconnectable> = undefined;

    protected _sanitizer: ValueSanitizer | undefined;

    get tagName() {
        return this.element.tagName;
    }

    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }

    constructor(
        element: HTMLElement,
        name: string,
        strings: ReadonlyArray<string>,
        parent: Disconnectable,
        options: RenderOptions | undefined,
    ) {
        this.element = element;
        this.name = name;
        this._$parent = parent;
        this.options = options;
        if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
            this._$committedValue = new Array(strings.length - 1).fill(new String());
            this.strings = strings;
        } else {
            this._$committedValue = nothing;
        }
        if (ENABLE_EXTRA_SECURITY_HOOKS) {
            this._sanitizer = undefined;
        }
    }

    /**
     * Sets the value of this part by resolving the value from possibly multiple
     * values and static strings and committing it to the DOM.
     * If this part is single-valued, `this._strings` will be undefined, and the
     * method will be called with a single value argument. If this part is
     * multi-value, `this._strings` will be defined, and the method is called
     * with the value array of the part's owning TemplateInstance, and an offset
     * into the value array from which the values should be read.
     * This method is overloaded this way to eliminate short-lived array slices
     * of the template instance values, and allow a fast-path for single-valued
     * parts.
     *
     * @param value The part value, or an array of values for multi-valued parts
     * @param valueIndex the index to start reading values from. `undefined` for
     *   single-valued parts
     * @param noCommit causes the part to not commit its value to the DOM. Used
     *   in hydration to prime attribute parts with their first-rendered value,
     *   but not set the attribute, and in SSR to no-op the DOM operation and
     *   capture the value for serialization.
     *
     * @internal
     */
    _$setValue(
        value: unknown | Array<unknown>,
        directiveParent: DirectiveParent = this,
        valueIndex?: number,
        noCommit?: boolean,
    ) {
        const strings = this.strings;

        // Whether any of the values has changed, for dirty-checking
        let change = false;

        if (strings === undefined) {
            // Single-value binding case
            value = resolveDirective(this, value, directiveParent, 0);
            change =
                !isPrimitive(value) ||
                (value !== this._$committedValue && value !== noChange);
            if (change) {
                this._$committedValue = value;
            }
        } else {
            // Interpolation case
            const values = value as Array<unknown>;
            value = strings[0];

            let i, v;
            for (i = 0; i < strings.length - 1; i++) {
                v = resolveDirective(this, values[valueIndex! + i], directiveParent, i);

                if (v === noChange) {
                    // If the user-provided value is `noChange`, use the previous value
                    v = (this._$committedValue as Array<unknown>)[i];
                }
                change ||=
                    !isPrimitive(v) || v !== (this._$committedValue as Array<unknown>)[i];
                if (v === nothing) {
                    value = nothing;
                } else if (value !== nothing) {
                    value += (v ?? '') + strings[i + 1];
                }
                // We always record each value, even if one is `nothing`, for future
                // change detection.
                (this._$committedValue as Array<unknown>)[i] = v;
            }
        }
        if (change && !noCommit) {
            this._commitValue(value);
        }
    }

    /** @internal */
    _commitValue(value: unknown) {
        if (value === nothing) {
            (wrap(this.element) as Element).removeAttribute(this.name);
        } else {
            if (ENABLE_EXTRA_SECURITY_HOOKS) {
                if (this._sanitizer === undefined) {
                    this._sanitizer = sanitizerFactoryInternal(
                        this.element,
                        this.name,
                        'attribute',
                    );
                }
                value = this._sanitizer(value ?? '');
            }

            (wrap(this.element) as Element).setAttribute(
                this.name,
                (value ?? '') as string,
            );
        }
    }
}

export type { PropertyPart };
class PropertyPart extends AttributePart {
    override readonly type = PROPERTY_PART;

    /** @internal */
    override _commitValue(value: unknown) {
        if (ENABLE_EXTRA_SECURITY_HOOKS) {
            if (this._sanitizer === undefined) {
                this._sanitizer = sanitizerFactoryInternal(
                    this.element,
                    this.name,
                    'property',
                );
            }
            value = this._sanitizer(value);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.element as any)[this.name] = value === nothing ? undefined : value;
    }
}

export type { BooleanAttributePart };
class BooleanAttributePart extends AttributePart {
    override readonly type = BOOLEAN_ATTRIBUTE_PART;

    /** @internal */
    override _commitValue(value: unknown) {

        (wrap(this.element) as Element).toggleAttribute(
            this.name,
            !!value && value !== nothing,
        );
    }
}

type EventListenerWithOptions = EventListenerOrEventListenerObject &
    Partial<AddEventListenerOptions>;

/**
 * An AttributePart that manages an event listener via add/removeEventListener.
 *
 * This part works by adding itself as the event listener on an element, then
 * delegating to the value passed to it. This reduces the number of calls to
 * add/removeEventListener if the listener changes frequently, such as when an
 * inline function is used as a listener.
 *
 * Because event options are passed when adding listeners, we must take case
 * to add and remove the part as a listener when the event options change.
 */
export type { EventPart };
class EventPart extends AttributePart {
    override readonly type = EVENT_PART;

    constructor(
        element: HTMLElement,
        name: string,
        strings: ReadonlyArray<string>,
        parent: Disconnectable,
        options: RenderOptions | undefined,
    ) {
        super(element, name, strings, parent, options);


    }

    // EventPart does not use the base _$setValue/_resolveValue implementation
    // since the dirty checking is more complex
    /** @internal */
    override _$setValue(
        newListener: unknown,
        directiveParent: DirectiveParent = this,
    ) {
        newListener =
            resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
        if (newListener === noChange) {
            return;
        }
        const oldListener = this._$committedValue;

        // If the new value is nothing or any options change we have to remove the
        // part as a listener.
        const shouldRemoveListener =
            (newListener === nothing && oldListener !== nothing) ||
            (newListener as EventListenerWithOptions).capture !==
            (oldListener as EventListenerWithOptions).capture ||
            (newListener as EventListenerWithOptions).once !==
            (oldListener as EventListenerWithOptions).once ||
            (newListener as EventListenerWithOptions).passive !==
            (oldListener as EventListenerWithOptions).passive;

        // If the new value is not nothing and we removed the listener, we have
        // to add the part as a listener.
        const shouldAddListener =
            newListener !== nothing &&
            (oldListener === nothing || shouldRemoveListener);


        if (shouldRemoveListener) {
            this.element.removeEventListener(
                this.name,
                this,
                oldListener as EventListenerWithOptions,
            );
        }
        if (shouldAddListener) {
            // Beware: IE11 and Chrome 41 don't like using the listener as the
            // options object. Figure out how to deal w/ this in IE11 - maybe
            // patch addEventListener?
            this.element.addEventListener(
                this.name,
                this,
                newListener as EventListenerWithOptions,
            );
        }
        this._$committedValue = newListener;
    }

    handleEvent(event: Event) {
        if (typeof this._$committedValue === 'function') {
            this._$committedValue.call(this.options?.host ?? this.element, event);
        } else {
            (this._$committedValue as EventListenerObject).handleEvent(event);
        }
    }
}

export type { ElementPart };
class ElementPart implements Disconnectable {
    readonly type = ELEMENT_PART;

    /** @internal */
    __directive?: Directive;

    // This is to ensure that every Part has a _$committedValue
    _$committedValue: undefined;

    /** @internal */
    _$parent!: Disconnectable;

    /** @internal */
    _$disconnectableChildren?: Set<Disconnectable> = undefined;

    options: RenderOptions | undefined;

    constructor(
        public element: Element,
        parent: Disconnectable,
        options: RenderOptions | undefined,
    ) {
        this._$parent = parent;
        this.options = options;
    }

    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }

    _$setValue(value: unknown): void {

        resolveDirective(this, value);
    }
}


