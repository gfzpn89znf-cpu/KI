import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

/**
 * Das HTML-Gerüst der Web-Fassung. Hier hängen die Angaben, die aus der Seite
 * eine zum Homescreen hinzufügbare App machen – auf dem iPhone der einzige
 * Weg, ohne Mac und ohne Entwicklerkonto ein Icon zu bekommen.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        <link rel="manifest" href="manifest.json" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0B0D10" />
        <meta name="description" content="Deine eigene KI – lokal auf dem Gerät oder über die Cloud." />

        {/* Verhindert, dass das Layout bei ScrollViews auf dem Web verrutscht. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: BASE_STYLE }} />
        <script dangerouslySetInnerHTML={{ __html: REGISTER_SERVICE_WORKER }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BASE_STYLE = `
  html, body { background-color: #0B0D10; }
  @media (prefers-color-scheme: light) {
    html, body { background-color: #FAF9F7; }
  }
  body { overscroll-behavior-y: none; }
`;

// Registriert den Service Worker erst nach dem Laden, damit er den Start nicht bremst.
const REGISTER_SERVICE_WORKER = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
`;
