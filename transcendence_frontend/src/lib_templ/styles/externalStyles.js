/**
 * @param {string} relPath
 * @param {boolean} applyGlobal
 * @param {string} [baseUrl]
 * @returns {(host: import('../BaseBase').default) => void}
 */
export default function useExternalStyles(relPath, applyGlobal, baseUrl) {
    /** @type {CSSStyleSheet}  */
    let arrivedStyles;
    const toApplyTo = new Set();

    /**
     * @param {import('../BaseBase').default} host
     * @param {CSSStyleSheet} sheet
     * @param {boolean} beforeArrived
     */
    const applyStyles = (host, sheet, beforeArrived) => {
        if (!host.shadowRoot) return;
        host.shadowRoot.adoptedStyleSheets.push(sheet);
        if (beforeArrived) host.requestUpdate();
    };

    // console.log('start loading...');
    fetch(relPath)
        .then((res) => res.text())
        .then((data) =>
            new CSSStyleSheet(
                baseUrl ? { baseURL: baseUrl } : undefined,
            ).replace(data),
        )
        .then((sheet) => {
            if (applyGlobal) document.adoptedStyleSheets.push(sheet);
            toApplyTo.forEach((root) => {
                applyStyles(root, sheet, true);
            });
            toApplyTo.clear();
            arrivedStyles = sheet;
        });

    return (host) => {
        if (arrivedStyles) applyStyles(host, arrivedStyles, false);
        else toApplyTo.add(host);
    };
}
