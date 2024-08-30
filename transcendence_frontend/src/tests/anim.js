import { ListGroup } from '../components/AnimL.js';
import { BaseElement, html } from '../lib_templ/BaseElement.js';

function generateRandomString() {
    // Definieren der möglichen Zeichen für den String
    const characters = 'ABCDEFGHIJKLMNOP QRSTUVWXYZabcdefgh ijklmnopqrstuvwxyz0123456789 ';
    // Festlegen einer zufälligen Länge zwischen 1 und 100
    const length = Math.floor(Math.random() * 100) + 1;
    
    // Initialisieren des Ergebnis-Strings
    let result = '';
    
    // Generieren des Strings mit zufälliger Länge
    for (let i = 0; i < length; i++) {
        // Zufällige Auswahl eines Zeichens aus der characters-String
        const randomChar = characters.charAt(Math.floor(Math.random() * characters.length));
        result += randomChar;
    }
    
    // Rückgabe des generierten Strings
    return result;
}

class MaList extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();
        this.data = [];
        this.no = 0;
    }
    
    render() {
        return html`
            <div class="cont">
                <div class="container">
                    <list-group
                        .items=${this.data},
                        .rendercb=${/** @param {{title: string, no: number}} item */( item, i) =>
                            html`
                                <p style="${"text-wrap: wrap; margin: 0;"}">
                                    ${item.title}
                                </p>
                            `}
                    ></list-group>
                </div>
                <div class="btn-container">
                    <button @click=${() => {
                        this.data.unshift({title: generateRandomString(), no: this.no++});
                        super.requestUpdate();
                    }} >Inhalt hinzufügen oben</button>
                    <button @click=${() => {
                        this.data.push({title: generateRandomString(), no: this.no++});
                        super.requestUpdate();
                    }} >Inhalt hinzufügen unten</button>
                    <button class="rem" @click=${() => {
                        this.data.shift();
                        super.requestUpdate();
                    }} >Inhalt entfernen oben</button>
                    <button class="rem"  @click=${() => {
                        this.data.pop();
                        super.requestUpdate();
                    }} >Inhalt entfernen unten</button>
                    <button class="rem"  @click=${() => {
                        const i = Math.trunc(Math.random() * this.data.length);
                        const temp = this.data[i];
                        if (temp) {
                            this.data[i] = this.data[0];
                            this.data[0] = temp;
                        }
                        super.requestUpdate();
                    }} >shuffle</button>
                </div>
            </div>
        `
    }
}
customElements.define("ma-list", MaList);