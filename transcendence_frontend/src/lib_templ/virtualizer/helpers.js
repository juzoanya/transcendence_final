
/**
 * 
 * @param {number} numberOfItems 
 * @param {number} predictedMargin 
 * @param {number} predictedSize 
 * @returns {number}
 */
export function getScrollHeight(numberOfItems, predictedMargin, predictedSize) {
    return Math.max(1, ( numberOfItems * ( predictedMargin + predictedSize ) ) + predictedMargin );
}

/**
 * 
 * @param {string} value 
 * @returns {number}
 */
export function getMarginAsNumber(value) {
    const float = value ? parseFloat(value) : NaN;
    return Number.isNaN(float) ? 0 : float;
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

export function clamp(min, curr, max) {
    return Math.min(max, Math.max(min, curr));
}

/**
 * @param {{pos: number, size: number}[]} arr
 * @param {number} low
 * @param {number} high
 * @param {number} x
 * @param {'top' | 'bottom'} type
 */
function binarySearch(arr, low, high, x, type)
{
    if (high >= low) {
        let mid = low + Math.floor((high - low) / 2);

        // If the element is present at the middle
        // itself
        if ((type === 'top' && arr[mid].pos == x) || (type === 'bottom' && arr[mid].pos + arr[mid].size == x))
            return mid;

        // If element is smaller than mid, then
        // it can only be present in left subarray
        if ((type === 'top' && arr[mid].pos > x) || (type === 'bottom' && arr[mid].pos + arr[mid].size > x))
            return binarySearch(arr, low, mid - 1, x, type);

        // Else the element can only be present
        // in right subarray
        return binarySearch(arr, mid + 1, high, x, type);
    }

    // We reach here when element is not
    // present in array
    return -1;
}

/**
 * @param {{pos: number, size: number}[]} arr
 * @param {number} left
 * @param {number} right
 * @param {number} target
 * @param {'top' | 'bottom'} type
 * @returns {{pos: number, size: number}}
 */
function findClosestRecursive(arr, left, right, target, type) {
    // base case: when there is only one element in the array
    if (left == right) {
        return arr[left];
    }

    // calculate the middle index
    let mid = Math.floor((left + right) / 2);

    // recursively search the left half of the array
    let leftClosest = findClosestRecursive(arr, left, mid, target, type);

    // recursively search the right half of the array
    let rightClosest = findClosestRecursive(arr, mid + 1, right, target, type);

    // compare the absolute differences of the closest elements in the 
    // left and right halves
    const resLeft = type === 'top' ? leftClosest.pos : leftClosest.pos + leftClosest.size;
    const resRight = type === 'top' ? rightClosest.pos : rightClosest.pos + rightClosest.size;
    if (Math.abs(resLeft - target) <= Math.abs(resRight - target)) {
        return leftClosest;
    } else {
        return rightClosest;
    }
}



/**
 * @param {{pos: number, size: number}[]} array
 * @param {number} scrollTop
 * @param {number} viewPortHeight
*/
export function findFirstAndLast(array, scrollTop, viewPortHeight) {
    const n = array.length;
    // const first = binarySearch(array, 0, n - 1, scrollTop, 'top');
    // const last = binarySearch(array, 0, n - 1, scrollTop, 'top');
    const first = findClosestRecursive(array, 0, n - 1, scrollTop, 'top');
    const last = findClosestRecursive(array, 0, n - 1, scrollTop + viewPortHeight, 'bottom');
    console.log('first: ', first);
    console.log('last: ', last);
    
}
