/**
 * @typedef {"auto" | "light" | "dark"} ThemeColors
 */

/** @returns {ThemeColors | null} */
export const getStoredTheme = () => {
    // return JSON.parse(localStorage.getItem('theme') || 'null')
    const theme = localStorage.getItem('theme');
    // console.log('theme: ', theme);
    if (theme === "light" || theme === "dark" ||theme === "auto")
        return theme;
    return null;
};

/** @param {ThemeColors} theme */
export const setStoredTheme = theme => localStorage.setItem('theme', theme


);

/** @returns {ThemeColors} */
export const getPreferredTheme = () => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
        return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** @param {ThemeColors} theme */
export const setTheme = theme => {
    if (theme === 'auto') {
        document.documentElement.setAttribute('data-bs-theme', (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    } else {
        document.documentElement.setAttribute('data-bs-theme', theme);
    }
};

setTheme(getPreferredTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme();
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
        setTheme(getPreferredTheme());
    }
});



// const showActiveTheme = (theme, focus = false) => {
//     const themeSwitcher = document.querySelector('#bd-theme');

//     if (!themeSwitcher) {
//         return;
//     }

//     const themeSwitcherText = document.querySelector('#bd-theme-text');
//     const activeThemeIcon = document.querySelector('.theme-icon-active use');
//     const btnToActive = document.querySelector(`[data-bs-theme-value="${theme}"]`);
//     const svgOfActiveBtn = btnToActive.querySelector('svg use').getAttribute('href');

//     document.querySelectorAll('[data-bs-theme-value]').forEach(element => {
//         element.classList.remove('active');
//         element.setAttribute('aria-pressed', 'false');
//     });

//     btnToActive.classList.add('active');
//     btnToActive.setAttribute('aria-pressed', 'true');
//     activeThemeIcon.setAttribute('href', svgOfActiveBtn);
//     const themeSwitcherLabel = `${themeSwitcherText.textContent} (${btnToActive.dataset.bsThemeValue})`;
//     themeSwitcher.setAttribute('aria-label', themeSwitcherLabel);

//     if (focus) {
//         themeSwitcher.focus();
//     }
// };
