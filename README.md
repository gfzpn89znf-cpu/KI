# KI — deine eigene KI-App fürs Handy

Eine Chat-App für iPhone und Android mit **zwei Betriebsarten**, zwischen denen du
jederzeit umschaltest. Sie läuft als native App **und** als Web-App zum
Hinzufügen auf den Homescreen — letzteres ist auf dem iPhone der einzige
kostenlose Weg zu einem eigenen Icon.

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

## Kostenlos aufs iPhone — der Weg, der wirklich funktioniert

Es gibt genau einen Weg, ohne Mac, ohne Apple-Entwicklerkonto und ohne 7-Tage-Frist
ein Icon auf deinen Homescreen zu bekommen: als **Web-App**. Safari installiert sie
dann wie eine normale App — mit eigenem Icon, ohne Browserleiste, offline startbar.

Und der lokale Modus läuft dort auch: moderne iPhones können über **WebGPU** ein
Sprachmodell direkt im Browser rechnen. Kostenlos, ohne dass etwas das Gerät verlässt.

### Schritt 1 — Veröffentlichung einschalten (einmalig, 30 Sekunden)

Im GitHub-Repository: **Settings → Pages → Source: GitHub Actions** auswählen.

Das genügt. Der Workflow `.github/workflows/pwa.yml` baut die App bei jedem Push und
stellt sie bereit. Du brauchst dafür keinen eigenen Rechner.

### Schritt 2 — Warten und Adresse öffnen

Unter **Actions** siehst du den Lauf „Web-App veröffentlichen". Nach ein paar Minuten
ist die App erreichbar unter:

```
https://gfzpn89znf-cpu.github.io/KI/
```

### Schritt 3 — Auf den Homescreen legen

Adresse in **Safari** öffnen (nicht Chrome — nur Safari darf auf dem iPhone
installieren), unten auf **Teilen** → **Zum Home-Bildschirm hinzufügen**.

Fertig. Ab jetzt hast du ein Icon namens „KI" wie jede andere App.

### Schritt 4 — Modus wählen

* **Lokal und kostenlos:** Einstellungen → *Auf dem Gerät* → *Lokale Modelle* →
  ein Modell antippen. Es lädt einmalig herunter (am besten im WLAN) und bleibt
  danach im Speicher. Ab dann läuft alles offline.
* **Cloud:** Einstellungen → API-Schlüssel eintragen.

### Was dabei zu beachten ist

* **WebGPU braucht iOS 18 oder neuer.** Ältere iPhones können nur die Cloud-Betriebsart.
  Die App sagt dir das im Modell-Bildschirm.
* **Im Browser ist das lokale Modell langsamer** als in der nativen App und die
  Auswahl kleiner (WebLLM bringt eine feste Liste mit).
* **Safari kann den Modellspeicher irgendwann leeren**, wenn das Gerät knapp wird.
  Dann lädt das Modell beim nächsten Start erneut.
* Der Gesprächsverlauf liegt im Browser-Speicher der App und ist auf wenige Megabyte
  begrenzt — Bild-Anhänge werden deshalb früher aus dem Verlauf entfernt.

## Alternative: Expo Go (nur Cloud, mit laufendem Rechner)

Zum Entwickeln oder wenn du kein GitHub-Pages willst:

```bash
npm install
npx expo start
```

QR-Code mit der iPhone-Kamera scannen, App **Expo Go** aus dem App Store. Der
Rechner muss dabei laufen, und die lokale Betriebsart funktioniert hier **nicht** —
dafür fehlt der native Teil.

## Native App (schneller, aber nicht kostenlos auf iOS)

Die native Fassung nutzt llama.cpp direkt und ist spürbar schneller als die
Web-Variante. Nur bekommt Apple sie nicht kostenlos dauerhaft aufs iPhone:

| Weg | Kosten | Voraussetzung | Haken |
|---|---|---|---|
| **Xcode, kostenloses Apple-ID** | 0 € | ein Mac | Läuft **7 Tage**, dann neu aufspielen |
| **Apple Developer Program** | 99 $/Jahr | — | Läuft ein Jahr, funktioniert einfach |
| **Android** | 0 € | ein Android-Handy | Keine, `.apk` installieren und fertig |

```bash
# Mit Mac, kostenlos (7 Tage):
npx expo prebuild --platform ios && npx pod-install && open ios/*.xcworkspace

# Mit Entwicklerkonto, ohne Mac:
npm install -g eas-cli && eas login
eas build --platform ios --profile preview

# Android, kostenlos und dauerhaft:
eas build --platform android --profile preview
```

> **Wenn das Signieren mit kostenlosem Apple-ID fehlschlägt:** Lösch in `app.json`
> den Block `ios.entitlements` und nimm ein kleineres Modell (Qwen3 1.7B) — das
> bleibt unter der Speichergrenze, die iOS ohne diese Berechtigung setzt.

## Ein lokales Modell installieren

**In der Web-App:** Einstellungen → Lokale Modelle → antippen. WebLLM bringt eine
feste Auswahl mit und lädt die Gewichte beim ersten Start selbst.

**In der nativen App:**

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

## Falls die Web-App auf deinem Gerät nicht reicht

Wenn dein iPhone kein WebGPU kann oder das Modell im Browser zu langsam ist, gibt es
fertige, kostenlose Apps im App Store, die lokale Modelle nativ ausführen (etwa
*PocketPal AI*, quelloffen und auf derselben Technik gebaut wie der native Modus
hier). Kein Mac, kein Entwicklerkonto. Dafür ohne die Cloud-Betriebsart, das
Gedächtnis und die eigenen Anweisungen aus diesem Projekt.

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
public/                  PWA: Manifest, Icon, Service Worker
.github/workflows/       Baut und veröffentlicht die Web-App automatisch
src/lib/
  claude.ts              Cloud: Agenten-Schleife mit Streaming, Werkzeugen, Fehlern
  localAgent.ts          Übersetzt den Verlauf für ein lokales Modell
  local/engine.ts        Modell auf dem Gerät ausführen (llama.cpp)
  local/engine.web.ts    Dasselbe im Browser über WebGPU (WebLLM)
  local/hub.ts           Modellsuche auf Hugging Face, zur Laufzeit
  local/files.ts         Download, Speicherplatz, installierte Modelle
  local/curated.ts       Vorschläge als Startpunkt für die Suche
  dialog.ts / .web.ts    Rückfragen – im Browser gibt es kein React-Native-Alert
  storage.ts / .web.ts   Persistenz: Datei auf dem Gerät, localStorage im Browser
  models.ts              Modellkatalog inkl. Denk- und Preis-Eigenheiten
  prompt.ts              Systemprompt inkl. Gedächtnis und eigenen Anweisungen
  attachments.ts         Kamera, Galerie, PDFs → Inhaltsblöcke für die API
  render.ts              Leitet die Oberfläche aus dem API-Verlauf ab
  markdown.ts            Markdown-Parser (rein, ohne UI)
  readFile.ts / .web.ts  Datei als Base64 lesen
  secure.ts              Schlüssel in Keychain bzw. localStorage
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
npm test           # Logik: Markdown, Verlauf, Systemprompt, lokale Übersetzung
npm run typecheck
npm run build:web  # Web-App bauen (landet in dist/)
```

Dateien mit `.web.ts` ersetzen im Web-Build automatisch ihr Gegenstück — so teilen
sich native App und Web-App denselben Code, ohne dass irgendwo `if (Platform...)`
steht.

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
