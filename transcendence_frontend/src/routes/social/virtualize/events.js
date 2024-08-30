
/**
 * @typedef {object} Range
 * @property {number} first
 * @property {number} last
 */

export class RangeChangedEvent extends Event {
    static eventName = 'rangeChanged';

    /** @type {number} */
    first;
    /** @type {number} */
    last;

    /** @param {Range} range  */
    constructor(range) {
        super(RangeChangedEvent.eventName, { bubbles: false });
        this.first = range.first;
        this.last = range.last;
    }
}

export class VisibilityChangedEvent extends Event {
    static eventName = 'visibilityChanged';

    /** @type {number} */
    first;
    /** @type {number} */
    last;

    /** @param {Range} range  */
    constructor(range) {
        super(VisibilityChangedEvent.eventName, { bubbles: false });
        this.first = range.first;
        this.last = range.last;
    }
}

export class UnpinnedEvent extends Event {
    static eventName = 'unpinned';

    constructor() {
        super(UnpinnedEvent.eventName, { bubbles: false });
    }
}
