# KI — deine eigene KI-App fürs Handy

Eine vollständige Chat-App für iPhone und Android, die direkt mit **Claude Opus 5**
spricht — also mit demselben Modell, das auch hinter Claude steckt. Keine
Zwischenfirma, kein fremder Server: die App auf deinem Handy redet direkt mit der
Anthropic-API, mit deinem eigenen Schlüssel.

## Was die App kann

| | |
|---|---|
| **Chat mit Streaming** | Antworten erscheinen Wort für Wort, jederzeit abbrechbar |
| **Websuche** | Schlägt selbstständig im Netz nach und liest Seiten — kein veraltetes Wissen |
| **Code-Ausführung** | Rechnet, wertet Daten aus und prüft sich selbst in einer Sandbox |
| **Bilder & PDFs** | Foto aufnehmen, aus der Galerie wählen oder ein PDF anhängen und Fragen dazu stellen |
| **Gedächtnis** | Merkt sich gesprächsübergreifend, wer du bist und was dir wichtig ist |
| **Gedankengang** | Zeigt auf Wunsch, wie das Modell zu seiner Antwort kommt |
| **Eigene Anweisungen** | Ton, Sprache und Verhalten dauerhaft festlegen |
| **Vorlesen** | Antworten per Sprachausgabe anhören |
| **Modellwahl** | Opus 5 (stärkstes), Sonnet 5 (guter Alltag), Haiku 4.5 (schnell & billig) |
| **Denktiefe** | Von „schnell" bis „maximal" — du entscheidest zwischen Tempo und Gründlichkeit |
| **Kostenanzeige** | Pro Gespräch siehst du, was es ungefähr gekostet hat |

Alles — Gespräche, Gedächtnis, Einstellungen — bleibt auf deinem Gerät. Es gibt
keinen Account, keine Anmeldung und keinen Server von mir dazwischen.

## Ehrlich vorweg

Du wolltest „eine eigene KI, so schlau wie ChatGPT oder Claude". Genau das ist es —
mit einer wichtigen Einschränkung, die du kennen solltest:

Ein Modell dieser Stärke **selbst zu trainieren** ist nichts, was auf einem Handy
läuft. Dahinter stecken Rechenzentren im dreistelligen Millionenbereich. Was aber
geht — und was diese App macht — ist, das fertige Modell über die offizielle API
zu nutzen. Die Intelligenz ist damit buchstäblich dieselbe wie bei Claude; nur
Oberfläche, Gedächtnis, Persönlichkeit und Daten gehören dir allein.

Der Unterschied zur Claude- oder ChatGPT-App: kein Abo, sondern Abrechnung nach
tatsächlicher Nutzung, dein eigenes Gedächtnis, deine eigenen Regeln, und du kannst
jede Zeile davon ändern.

## In Betrieb nehmen

### 1. Voraussetzungen

* [Node.js](https://nodejs.org) (Version 20 oder neuer)
* Die App **Expo Go** aus dem App Store bzw. Play Store auf deinem Handy
* Ein Anthropic-API-Schlüssel

### 2. API-Schlüssel holen

1. Auf [console.anthropic.com](https://console.anthropic.com) registrieren
2. Unter *Billing* ein Guthaben aufladen (5 $ reichen für sehr viele Gespräche)
3. Unter *API Keys* einen neuen Schlüssel erzeugen und kopieren — er beginnt mit `sk-ant-`

### 3. App starten

```bash
npm install
npx expo start
```

Im Terminal erscheint ein QR-Code. Den scannst du mit der Kamera (iPhone) bzw.
in Expo Go (Android) — die App startet auf deinem Handy.

### 4. Schlüssel eintragen

In der App oben rechts auf das Zahnrad, den Schlüssel einfügen, **Speichern**. Fertig.

## Als richtige App aufs Handy

Expo Go ist für den Anfang gedacht: Du brauchst dafür jedes Mal den laufenden
Rechner. Für eine echte, eigenständige App auf dem Homescreen:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # ergibt eine .apk zum Installieren
eas build --platform ios --profile preview       # benötigt einen Apple-Developer-Account
```

Der Build läuft auf Expos Servern; du bekommst am Ende einen Download-Link.
Für Android kannst du die `.apk` einfach installieren. Für iOS brauchst du ein
Apple-Developer-Konto (99 $/Jahr) — oder du bleibst bei Expo Go.

## Was das kostet

Abgerechnet wird pro verarbeitetem Text, nicht pro Monat.

| Modell | Eingabe | Ausgabe |
|---|---|---|
| Opus 5 | 5 $ / 1 Mio. Token | 25 $ / 1 Mio. Token |
| Sonnet 5 | 2 $ / 1 Mio. Token | 10 $ / 1 Mio. Token |
| Haiku 4.5 | 1 $ / 1 Mio. Token | 5 $ / 1 Mio. Token |

Eine normale Frage mit Antwort kostet auf Opus 5 grob 1–5 Cent. Die App zeigt dir
über jedem Gespräch eine laufende Schätzung. Drei Stellschrauben, wenn es günstiger
werden soll: Modell auf Sonnet 5 umstellen, Denktiefe reduzieren, oder für lange
Gespräche ab und zu ein neues starten.

Die App nutzt automatisch Prompt-Caching — wiederholte Teile eines langen Gesprächs
kosten dadurch nur noch rund ein Zehntel.

## Zur Sicherheit

Der API-Schlüssel liegt in der verschlüsselten Keychain (iOS) bzw. im Android
Keystore, nicht im normalen App-Speicher, und wird ausschließlich an
`api.anthropic.com` geschickt.

Er liegt damit aber **auf dem Gerät**. Das ist für eine private App genau richtig.
Würdest du die App weitergeben, müsste jede Person einen eigenen Schlüssel
eintragen — verteile niemals einen Build mit deinem eigenen Schlüssel darin. Falls
ein Schlüssel doch mal abhandenkommt: in der Console widerrufen, neuen erzeugen.

## Spracheingabe

Statt zu tippen kannst du das Mikrofon deiner Handytastatur benutzen (iOS: Mikro
unten rechts, Android: Mikro in der Gboard-Leiste). Das ist zuverlässiger als alles,
was die App selbst mitbringen könnte, und funktioniert sofort.

## Aufbau des Codes

```
app/                     Bildschirme (Dateisystem-Routing via expo-router)
  _layout.tsx            Rahmen, Navigation, Laden des Schlüssels
  index.tsx              Liste der Gespräche
  chat/[id].tsx          Der Chat selbst
  settings.tsx           Einstellungen
  memory.tsx             Gespeichertes Wissen verwalten
src/lib/
  claude.ts              Die Agenten-Schleife: Streaming, Werkzeuge, Fehler
  models.ts              Modellkatalog inkl. Denk- und Preis-Eigenheiten
  prompt.ts              Systemprompt inkl. Gedächtnis und eigenen Anweisungen
  attachments.ts         Kamera, Galerie, PDFs → Inhaltsblöcke für die API
  render.ts              Leitet die Oberfläche aus dem API-Verlauf ab
  markdown.ts            Markdown-Parser (rein, ohne UI)
  storage.ts             Persistenz als JSON-Datei
  secure.ts              Schlüssel in der Keychain
src/state/               Zustand: Gespräche, Gedächtnis, laufende Antworten
src/components/          Chat-Blase, Eingabezeile, Markdown-Darstellung, UI-Bausteine
tests/                   Tests der reinen Logik (npm test)
```

Der gespeicherte Gesprächsverlauf ist bewusst exakt das Format der API. Dadurch geht
beim Fortsetzen eines Gesprächs nichts verloren — Gedankengänge, Suchergebnisse und
Anhänge bleiben erhalten. Die Oberfläche wird daraus abgeleitet, nicht getrennt
mitgeführt.

## Tests

```bash
npm test         # Logik: Markdown, Verlaufsdarstellung, Systemprompt
npm run typecheck
```

## Erweitern

Ein paar naheliegende nächste Schritte, falls du weitermachen willst:

* **Eigene Werkzeuge**: In `src/lib/claude.ts` neben `remember`/`forget` eigene
  Funktionen ergänzen — Kalender, Notizen, Smart Home. Das Muster steht dort schon.
* **Gespräche exportieren**: Der Verlauf ist reines JSON, ein Teilen-Button ist
  schnell gebaut.
* **Widget oder Kurzbefehl**, um direkt aus dem Sperrbildschirm zu fragen.
