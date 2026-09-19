# KI — deine eigene KI-App fürs Handy

Eine Chat-App für iPhone und Android mit **zwei Betriebsarten**, zwischen denen du
jederzeit umschaltest:

* **Auf dem Gerät** — ein Sprachmodell läuft direkt auf dem Handy. Kostenlos, ohne
  Internet, nichts verlässt das Telefon. Dafür deutlich einfacher gestrickt.
* **Über die Cloud** — **Claude Opus 5**, dasselbe Modell wie hinter Claude, mit
  Websuche, Bildern und PDFs. Kostet pro Anfrage, mit deinem eigenen Schlüssel.

Kein Account, keine Anmeldung, kein Server von mir dazwischen.

## Was die App kann

| | Auf dem Gerät | Cloud |
|---|---|---|
| Chat mit Streaming | ✅ | ✅ |
| Kosten | **keine** | ca. 1–5 ct pro Frage |
| Funktioniert ohne Internet | ✅ | ❌ |
| Daten verlassen das Handy | **nie** | an Anthropic |
| Websuche & Seiten lesen | ❌ | ✅ |
| Code ausführen | ❌ | ✅ |
| Bilder & PDFs verstehen | ❌ | ✅ |
| Gedächtnis über Gespräche hinweg | ✅ (von Hand pflegbar) | ✅ (füllt sich selbst) |
| Eigene Anweisungen, Vorlesen, Verlauf | ✅ | ✅ |
| Stärke | etwa wie ein guter Assistent von 2023 | Spitzenklasse |

Gespräche, Gedächtnis, Modelle und Einstellungen liegen alle auf deinem Gerät.

## Ehrlich vorweg: der Haken

Du wolltest eine eigene KI, **kostenlos und ohne Cloud**, die trotzdem so schlau ist
wie ChatGPT oder Claude. Diese drei Dinge gleichzeitig gibt es nicht — und zwar aus
einem harten physikalischen Grund:

Ein Spitzenmodell hat hunderte Milliarden Parameter und braucht Rechenzentren. Auf
ein Handy passen realistisch 3–4 Milliarden. Das ist etwa das Hundertstel. Das
lokale Modell schreibt gute Texte, fasst zusammen, übersetzt und beantwortet
Alltagsfragen. Bei kniffligem Denken, beim Programmieren oder bei allem, was
aktuelles Wissen braucht, bricht es ein — und es hat kein Internet, weiß also nichts
über die Gegenwart.

Deshalb kann diese App beides und du entscheidest pro Gespräch: das Private und
Alltägliche lokal, das Schwierige über die Cloud.

Zur Einordnung der Cloud-Betriebsart: Anthropic trainiert **nicht** mit dem, was über
die API läuft. Die Daten landen also in keinem Firmenmodell. Sie verlassen aber das
Handy — deshalb gibt es den lokalen Modus.

## Schnellstart (Cloud-Betriebsart)

Das geht sofort, ohne Xcode und ohne Apple-Konto.

1. [Node.js](https://nodejs.org) (Version 20+) installieren
2. **Expo Go** aus dem App Store aufs iPhone laden
3. Einen Schlüssel auf [console.anthropic.com](https://console.anthropic.com) erzeugen
   (*Billing* → Guthaben aufladen, 5 $ reichen lange; *API Keys* → neuer Schlüssel, beginnt mit `sk-ant-`)
4. Im Projektordner:

```bash
npm install
npx expo start
```

5. QR-Code mit der Kamera scannen → die App startet in Expo Go
6. In der App oben rechts aufs Zahnrad, Schlüssel einfügen, **Speichern**

Der Rechner muss dabei laufen. Die lokale Betriebsart funktioniert in Expo Go
**nicht** — dazu braucht es eine richtig installierte App.

## Aufs iPhone bekommen (für die lokale Betriebsart)

Hier kommt die unangenehme Wahrheit, und sie liegt nicht an der App, sondern an
Apple: **Eine eigene App dauerhaft und kostenlos aufs iPhone zu bekommen, geht
nicht.** Du hast drei Wege:

| Weg | Kosten | Voraussetzung | Haken |
|---|---|---|---|
| **Xcode, kostenloses Apple-ID** | 0 € | ein Mac | Die App läuft **7 Tage**, danach musst du sie neu aufspielen |
| **Apple Developer Program** | 99 $/Jahr | Mac oder EAS-Build | Läuft ein Jahr, funktioniert einfach |
| **Android-Gerät** | 0 € | ein Android-Handy | `.apk` bauen und installieren, fertig |

### Weg 1 — Mac mit Xcode, ohne Kosten

```bash
npm install
npx expo prebuild --platform ios
npx pod-install
open ios/*.xcworkspace
```

In Xcode oben links dein iPhone auswählen, unter *Signing & Capabilities* dein
kostenloses Apple-ID als Team eintragen, dann auf ▶︎. Nach sieben Tagen dasselbe
noch einmal.

> **Wenn das Signieren fehlschlägt:** Ein kostenloses Apple-ID darf nicht alle
> Berechtigungen vergeben. Lösch in `app.json` den Block `ios.entitlements` und nimm
> ein kleineres Modell (Qwen3 1.7B, ca. 1,1 GB) — das bleibt unter der Speichergrenze,
> die iOS ohne diese Berechtigung setzt.

### Weg 2 — Apple Developer Program

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```

Der Build läuft auf Expos Servern, du bekommst einen Installationslink. Kein Mac nötig.

### Weg 3 — Android

```bash
eas build --platform android --profile preview   # ergibt eine .apk
```

Die `.apk` aufs Handy laden, antippen, installieren. Keine Kosten, keine Fristen.

## Ein lokales Modell installieren

Wenn die App nativ installiert ist:

1. **Einstellungen → Lokale Modelle**
2. Einen Vorschlag antippen oder auf Hugging Face suchen
3. Eine Datei wählen — **Q4_K_M** ist fast immer die richtige Wahl
4. Herunterladen (2–3 GB, am besten im WLAN)

Danach ist das Modell aktiv, und du kannst das Handy in den Flugmodus schalten.

**Welches Modell?**

| Modell | Größe | Braucht |
|---|---|---|
| Qwen3 4B | ~2,4 GB | 8 GB RAM (iPhone 15 Pro und neuer) |
| Gemma 3 4B | ~2,5 GB | 8 GB RAM |
| Llama 3.2 3B | ~2,0 GB | 6 GB RAM |
| Qwen3 1.7B | ~1,1 GB | 4 GB RAM, läuft fast überall |

Die App sucht die Dateien live auf Hugging Face — feste Links wären nach ein paar
Monaten tot, weil Repos umbenannt und Quantisierungen neu erzeugt werden.

## Schon heute kostenlos loslegen

Falls du nur eine **lokale KI auf dem iPhone** willst und dir der Aufwand oben zu
groß ist: Es gibt fertige, kostenlose Apps im App Store, die genau das tun (etwa
*PocketPal AI*, quelloffen und auf derselben Technik gebaut wie der lokale Modus
hier). Kein Mac, kein Entwicklerkonto, sofort einsatzbereit. Dieses Projekt lohnt
sich, wenn du beide Betriebsarten in einer App willst und alles selbst anpassen
möchtest.

## Was das kostet

**Lokale Betriebsart: nichts.** Einmal das Modell herunterladen, danach ist jede
Anfrage kostenlos — auch im Flugmodus.

**Cloud-Betriebsart:** abgerechnet wird pro verarbeitetem Text, nicht pro Monat.

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

In der lokalen Betriebsart geht überhaupt nichts raus: kein Schlüssel, keine
Anfrage, kein Protokoll. Das Modell rechnet auf dem Gerät.

In der Cloud-Betriebsart liegt der API-Schlüssel in der verschlüsselten Keychain (iOS) bzw. im Android
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
  models.tsx             Lokale Modelle suchen, laden, aktivieren
src/lib/
  claude.ts              Cloud: Agenten-Schleife mit Streaming, Werkzeugen, Fehlern
  localAgent.ts          Übersetzt den Verlauf für ein lokales Modell
  local/engine.ts        Laden und Ausführen des Modells auf dem Gerät (llama.rn)
  local/hub.ts           Modellsuche auf Hugging Face, zur Laufzeit
  local/files.ts         Download, Speicherplatz, installierte Modelle
  local/curated.ts       Vorschläge als Startpunkt für die Suche
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

Beide Betriebsarten teilen sich denselben Verlauf: Du kannst ein Gespräch lokal
anfangen und mitten drin auf die Cloud umschalten, wenn es schwierig wird.

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
* **Lokale Werkzeuge**: `llama.rn` beherrscht auch Werkzeugaufrufe, wenn das Modell
  eine passende Chat-Vorlage mitbringt. Bewusst noch nicht eingebaut, weil kleine
  Modelle dabei oft danebenliegen.
* **Gespräche exportieren**: Der Verlauf ist reines JSON, ein Teilen-Button ist
  schnell gebaut.
* **Widget oder Kurzbefehl**, um direkt aus dem Sperrbildschirm zu fragen.
