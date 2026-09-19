import { isLocalAvailable } from '@/lib/local/engine';

export interface LocalDiagnostics {
  available: boolean;
  detail: string;
}

/**
 * Sagt möglichst genau, woran es liegt. Ein blankes „WebGPU fehlt" hilft
 * niemandem weiter – die häufigste Ursache ist ein anderer Browser als Safari
 * oder eine zu alte iOS-Version, und das lässt sich hier unterscheiden.
 */
export function localDiagnostics(): LocalDiagnostics {
  const available = isLocalAvailable();
  if (available) return { available, detail: 'WebGPU vorhanden – lokale Modelle einsatzbereit.' };

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  // Auf iOS benutzt jeder Browser WebKit, meldet sich aber unterschiedlich.
  // Chrome (CriOS), Firefox (FxiOS) und Edge (EdgiOS) haben dort kein WebGPU.
  const otherBrowserOnIOS = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/.test(ua);

  const version = ua.match(/OS (\d+)[_.](\d+)/);
  const major = version ? Number(version[1]) : null;

  if (isIOS && otherBrowserOnIOS) {
    return {
      available,
      detail:
        'Du bist auf dem iPhone in einem anderen Browser als Safari. Nur Safari bietet dort WebGPU an. Öffne die Seite in Safari und lege sie über Teilen → Zum Home-Bildschirm hinzufügen ab.',
    };
  }

  if (isIOS && major !== null && major < 18) {
    return {
      available,
      detail: `Dein iPhone läuft auf iOS ${major}. WebGPU gibt es erst ab iOS 18. Ein Systemupdate würde den lokalen Modus freischalten.`,
    };
  }

  if (isIOS) {
    return {
      available,
      detail:
        'Safari meldet kein WebGPU. Prüf unter Einstellungen → Apps → Safari → Erweitert → Funktionsmerkmale, ob „WebGPU" eingeschaltet ist, und ob ein iOS-Update ansteht.',
    };
  }

  return {
    available,
    detail:
      'Dieser Browser bietet kein WebGPU an. Es braucht einen aktuellen Chrome, Edge oder Safari auf einem Gerät mit unterstützter Grafik.',
  };
}
