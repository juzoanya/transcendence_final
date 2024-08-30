import { htmlPos, templExpressions } from './Template'; // Stellen Sie sicher, dass Sie den korrekten Pfad zur Datei angeben

import { html } from './TemplateAsLiteral';

export const htmlStringCheckPos = html`
    <!doctype html>
    <html lang="de">
        <head>
            <!-- Meta-Daten für die Website -->
            <!-- Meta-Daten für die Website -->
            <meta charset="UTF-8" />
            <!-- Festlegen der Zeichencodierung auf UTF-8 -->
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            />
            <!-- Responsives Design für mobile Geräte -->
            <title>Komplexe HTML-Seite mit vielen Kommentaren</title>
            <!-- Einbinden von CSS-Stilen für die gesamte Seite -->
            <link rel="stylesheet" href="styles.css" />
        </head>
        <body>
            <!-- 
        Header-Bereich der Seite
        Header-Bereich der Seite
        Header-Bereich der Seite
    -->
            <!-- Einbinden von CSS-Stilen für die gesamte Seite -->
            <!-- 
        Header-Bereich der Seite
        Header-Bereich der Seite
        Header-Bereich der Seite
    -->
            <header>
                <h1>${htmlPos.outer}</h1>
                <!-- Navigationselement -->
                <nav>
                    <ul>
                        <li>
                            <a href="#home">${htmlPos.outer}</a>
                        </li>
                        <!-- Link zum Home-Bereich -->
                        <li>
                            <a href="#about">${htmlPos.outer}</a>
                        </li>
                        <!-- Link zum Über uns-Bereich -->
                        <li>
                            <a href="#services">${htmlPos.outer}</a>
                        </li>
                        <!-- Link zu den Dienstleistungen -->
                        <li>
                            <a href="#contact">${htmlPos.outer}</a>
                        </li>
                        <!-- Link zum Kontakt-Bereich -->
                    </ul>
                </nav>
            </header>

            <!-- Hauptinhalt der Seite -->
            <!-- Hauptinhalt der Seite -->
            <main>
                <!-- Abschnitt über das Unternehmen -->
                <section id="${htmlPos.inner}">
                    <h2>${htmlPos.outer}</h2>
                    <p>${htmlPos.outer}</p>
                    <!-- Bild des Unternehmens -->
                    <img src="${htmlPos.inner}" alt="${htmlPos.inner}" />
                </section>

                <!-- Dienstleistungen -->
                <section id="${htmlPos.inner}">
                    <h2>Unsere Dienstleistungen</h2>
                    <!-- Artikel 1: Webdesign -->
                    <article>
                        <h3>Webdesign</h3>
                        <p>${htmlPos.outer}</p>
                    </article>
                    <!-- Artikel 2: SEO -->
                    <article>
                        <h3>${htmlPos.outer}</h3>
                        <p>
                            Unsere SEO-Experten helfen Ihnen, in den
                            Suchmaschinen besser gefunden zu werden.
                        </p>
                    </article>
                    <!-- Artikel 3: Marketing -->
                    <article>
                        <h3>Marketing</h3>
                        <p>
                            Wir entwickeln maßgeschneiderte Marketingstrategien
                            für Ihr Unternehmen.
                        </p>
                    </article>
                </section>
            </main>

            <!-- Kontaktformular -->
            <section id="${htmlPos.inner}">
                <h2>Kontakt</h2>
                <!-- Formular zur Übermittlung von Kontaktanfragen -->
                <form action="submit_form.php" method="post">
                    <!-- Eingabefeld für den Namen des Benutzers -->
                    <label for="${htmlPos.inner}">Name:</label>
                    <input
                        type="${htmlPos.inner}"
                        id="${htmlPos.inner}"
                        name="${htmlPos.inner}"
                        required
                    />
                    <!-- Eingabefeld für die E-Mail-Adresse des Benutzers -->
                    <label for="${htmlPos.inner}">E-Mail:</label>
                    <input
                        type="${htmlPos.inner}"
                        id="${htmlPos.inner}"
                        name="${htmlPos.inner}"
                        ?required=${htmlPos.inner}
                    />
                    <!-- Textbereich für die Nachricht des Benutzers -->
                    <label for="message">Nachricht:</label>
                    <textarea
                        id="message"
                        name="message"
                        rows="4"
                        required
                    ></textarea>
                    <!-- Absenden-Button -->
                    <button type="${htmlPos.inner}">Absenden</button>
                </form>
            </section>

            <!-- Footer-Bereich -->
            <footer>
                <!-- Urheberrechtshinweis -->
                <p>&copy; 2024 Mein Unternehmen. Alle Rechte vorbehalten.</p>
                <!-- Jahr und Unternehmensname -->
            </footer>

            <!-- Einbinden von JavaScript-Dateien -->
            <script src="scripts.js"></script>
            <!-- Stellt sicher, dass die JavaScript-Funktionalität korrekt eingebunden ist -->
        </body>
    </html>
`;

export const htmlStringCheckAttr = html`
    <!doctype html>
    <html lang="de">
        <head>
            <!-- Meta-Daten für die Website -->
            <!-- Meta-Daten für die Website -->
            <meta charset="UTF-8" />
            <!-- Festlegen der Zeichencodierung auf UTF-8 -->
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            />
            <!-- Responsives Design für mobile Geräte -->
            <title>Komplexe HTML-Seite mit vielen Kommentaren</title>
            <!-- Einbinden von CSS-Stilen für die gesamte Seite -->
            <link rel="stylesheet" href="styles.css" />
        </head>
        <body>
            <!-- 
        Header-Bereich der Seite
        Header-Bereich der Seite
        Header-Bereich der Seite
    -->
            <!-- Einbinden von CSS-Stilen für die gesamte Seite -->
            <!-- 
        Header-Bereich der Seite
        Header-Bereich der Seite
        Header-Bereich der Seite
    -->
            <header>
                <h1>${templExpressions.htmlNode}</h1>
                <!-- Navigationselement -->
                <nav>
                    <ul>
                        <li>
                            <a href="#home">${templExpressions.htmlNode}</a>
                        </li>
                        <!-- Link zum Home-Bereich -->
                        <li>
                            <a href="#about">${templExpressions.htmlNode}</a>
                        </li>
                        <!-- Link zum Über uns-Bereich -->
                        <li>
                            <a href="#services">${templExpressions.htmlNode}</a>
                        </li>
                        <!-- Link zu den Dienstleistungen -->
                        <li>
                            <a href="#contact">${templExpressions.htmlNode}</a>
                        </li>
                        <!-- Link zum Kontakt-Bereich -->
                    </ul>
                </nav>
            </header>

            <!-- Hauptinhalt der Seite -->
            <!-- Hauptinhalt der Seite -->
            <main>
                <!-- Abschnitt über das Unternehmen -->
                <section
                    ${templExpressions.selfAttribute}
                    id="${templExpressions.htmlAttribute}"
                >
                    <h2>${templExpressions.htmlNode}</h2>
                    <p>${templExpressions.htmlNode}</p>
                    <!-- Bild des Unternehmens -->
                    <img
                        ${templExpressions.selfAttribute}
                        src="${templExpressions.htmlAttributeMulti}/${templExpressions.htmlAttribute}"
                        alt="${templExpressions.htmlAttribute}"
                    />
                </section>

                <div class="container-fluid bg-dark-subtle">
                    <div class="row">
                        <nav
                            class="navbar ${templExpressions.htmlAttribute}  col-12 col-sm-2 col-md-1 col-xl-1 d-flex bg-light-subtle p-0"
                            style="height: ${templExpressions.htmlAttribute}"
                        >
                            <ul
                                class="navbar-nav w-100 ${templExpressions.htmlAttribute}  flex-row flex-sm-column justify-content-around m-0 p-0"
                            >
                                <button
                                    @click=${templExpressions.htmlAttribute}
                                    class="btn btn-dark m-3"
                                >
                                    <i
                                        class="fa-solid fa-circle-half-stroke"
                                    ></i>
                                </button>
                                <button
                                    class="btn btn-primary"
                                    @click=${templExpressions.htmlAttribute}
                                >
                                    notify!
                                </button>
                            </ul>
                        </nav>

                        <div
                            class="col p-0 d-flex flex-column overflow-scroll"
                            style="height: ${templExpressions.htmlAttribute}"
                        >
                            <main
                                id="root-outlet"
                                style="height: ${templExpressions.htmlAttribute}"
                            ></main>
                        </div>
                    </div>
                </div>

                <!-- Dienstleistungen -->
                <section id="${templExpressions.htmlAttribute}">
                    <h2 ${templExpressions.selfAttribute}>
                        Unsere Dienstleistungen
                    </h2>
                    <!-- Artikel 1: Webdesign -->
                    <article>
                        <h3>Webdesign</h3>
                        <p>${templExpressions.htmlNode}</p>
                    </article>
                    <!-- Artikel 2: SEO -->
                    <article>
                        <h3>${templExpressions.htmlNode}</h3>
                        <p>
                            Unsere SEO-Experten helfen Ihnen, in den
                            Suchmaschinen besser gefunden zu werden.
                        </p>
                    </article>
                    <!-- Artikel 3: Marketing -->
                    <article>
                        <h3>Marketing</h3>
                        <p ${templExpressions.selfAttribute}>
                            Wir entwickeln maßgeschneiderte Marketingstrategien
                            für Ihr Unternehmen.
                        </p>
                    </article>
                </section>
            </main>

            <!-- Kontaktformular -->
            <section id="${templExpressions.htmlAttribute}">
                <h2 ${templExpressions.selfAttribute}>Kontakt</h2>
                <!-- Formular zur Übermittlung von Kontaktanfragen -->
                <form action="submit_form.php" method="post">
                    <!-- Eingabefeld für den Namen des Benutzers -->
                    <label for="${templExpressions.htmlAttribute}">Name:</label>
                    <input
                        type="${templExpressions.htmlAttribute}"
                        id="${templExpressions.htmlAttribute}"
                        name="${templExpressions.htmlAttribute}"
                        required
                    />
                    <!-- Eingabefeld für die E-Mail-Adresse des Benutzers -->
                    <label for="${templExpressions.htmlAttribute}"
                        >E-Mail:</label
                    >
                    <input
                        ${templExpressions.selfAttribute}
                        type="${templExpressions.htmlAttribute}"
                        id="${templExpressions.htmlAttribute}"
                        name="${templExpressions.htmlAttribute}"
                        ?required=${templExpressions.htmlAttribute}
                        ${templExpressions.selfAttribute}
                    />
                    <!-- Textbereich für die Nachricht des Benutzers -->
                    <label
                        ${templExpressions.selfAttribute}
                        for="message"
                        ${templExpressions.selfAttribute}
                        >Nachricht:</label
                    >
                    <textarea
                        id="message"
                        name="message"
                        rows="4"
                        required
                    ></textarea>
                    <!-- Absenden-Button -->
                    <button
                        type="${templExpressions.htmlAttributeMulti}/${templExpressions.htmlAttributeMulti}/${templExpressions.htmlAttribute}"
                    >
                        Absenden
                    </button>
                </form>
            </section>

            <!-- Footer-Bereich -->
            <footer>
                <!-- Urheberrechtshinweis -->
                <p>&copy; 2024 Mein Unternehmen. Alle Rechte vorbehalten.</p>
                <!-- Jahr und Unternehmensname -->
            </footer>

            <!-- Einbinden von JavaScript-Dateien -->
            <script src="scripts.js"></script>
            <!-- Stellt sicher, dass die JavaScript-Funktionalität korrekt eingebunden ist -->
        </body>
    </html>
`;
