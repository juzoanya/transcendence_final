import { BaseElement, css, html } from '../../lib_templ/BaseElement.js';

export default class PongBg extends BaseElement {
    static styles = [
        css`
            .pong-container {
                width: 100vw;
                height: 100vh;
                position: fixed;
                top: 0;
                left: 0;
                overflow: hidden;
                background-color: black;
                font-family: Arial, sans-serif;
                z-index: 21;
            }
            .pong-text {
                position: absolute;
                top: 20px; /* Adjusted position to be centered at the top */
                left: 50%;
                transform: translateX(-50%);
                min-width: 80vw;
                font-size: 50px;
                font-weight: bold;
                text-align: center;
            }
            @media (max-width: 660px) {
                .pong-text {
                    min-width: 0;
                    max-width: 280px;
                    font-size: 40px;
                }
            }
            .pong-letter {
                animation: blink 2s infinite alternate; /* Blinking animation for each span */
                margin: 0 5px; /* Adjust the space between letters */
            }
            .pong-space {
                margin: 0 20px; /* Adjust the space between words */
            }
            @keyframes blink {
                0% {
                    opacity: 0; /* Transparent text */
                }
                50% {
                    opacity: 1; /* Visible text */
                }
                100% {
                    opacity: 0; /* Transparent text */
                }
            }
            .pong-paddle {
                position: absolute;
                width: 8px; /* Increased width for better visibility */
                height: 100px; /* Increased height for better visibility */
                background-color: white;
            }
            .pong-paddle1 {
                left: 20px;
                top: 40%; /* Adjusted starting position for paddle */
                animation: movePaddle1 2s infinite alternate;
            }
            .pong-paddle2 {
                right: 20px;
                top: 60%; /* Adjusted starting position for paddle */
                animation: movePaddle2 2s infinite alternate;
            }
            @keyframes movePaddle1 {
                from {
                    transform: translateY(-70%);
                }
                to {
                    transform: Y(70%);
                }
            }
            @keyframes movePaddle2 {
                from {
                    transform: translateY(70%);
                }
                to {
                    transform: translateY(-70%);
                }
            }
            .pong-ball {
                position: absolute;
                width: 10px; /* Reduced size for the ball */
                height: 10px; /* Reduced size for the ball */
                background-color: white;
                border-radius: 50%;
                left: 50%; /* Start position in the middle */
                top: 50%; /* Start position in the middle */
                transform: translate(-50%, -50%);
                animation: moveBall 4s infinite; /* Define animation for ball */
            }
            @keyframes moveBall {
                0% {
                    left: 30px; /* Start position aligned with left paddle */
                    top: 40%; /* Start position aligned with left paddle */
                }
                50% {
                    left: calc(
                        100% - 30px
                    ); /* Middle position aligned with right paddle */
                    top: 60%; /* Middle position aligned with right paddle */
                }
                100% {
                    left: 30px; /* End position aligned with left paddle */
                    top: 40%; /* End position aligned with left paddle */
                }
            }
        `,
    ];

    constructor() {
        super(false, true);
    }

    async init() {
        await this.updateComplete;
        const letters = this.shadowRoot?.querySelectorAll('span');
        const colors = [
            '#ff0000',
            '#00ff00',
            '#0000ff',
            '#ffff00',
            '#ff00ff',
            '#00ffff',
            '#ff8000',
            '#8000ff',
            '#0080ff',
        ];

        const assignColors = (letter) => {
            const randomColor =
                colors[Math.floor(Math.random() * colors.length)];
            const l = letter;
            l.style.color = randomColor;
        };

        const changeColors = () => {
            letters?.forEach(assignColors);
        };
        changeColors();
        this.#interValId = setInterval(changeColors, 2000);
    }

    connectedCallback() {
        super.connectedCallback();
        this.init();
    }

    #interValId;

    disconnectedCallback() {
        super.disconnectedCallback();
        clearInterval(this.#interValId);
    }

    render() {
        return html`
            <div class="pong-container">
                <div class="pong-paddle pong-paddle1"></div>
                <div class="pong-paddle pong-paddle2"></div>
                <div class="pong-ball"></div>
                <div class="pong-text">
                    <span class="pong-letter">P</span>
                    <span class="pong-letter">O</span>
                    <span class="pong-letter">N</span>
                    <span class="pong-letter">G</span>
                    <span class="pong-space"> </span>
                    <span class="pong-letter">G</span>
                    <span class="pong-letter">A</span>
                    <span class="pong-letter">M</span>
                    <span class="pong-letter">E</span>
                </div>
            </div>
        `;
    }
}
window.customElements.define('pong-bg', PongBg);
