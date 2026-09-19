/**
 * Reine Auswertung der Browserkennung – ohne Zugriff auf `navigator`, damit
 * sich die Entscheidungstabelle testen lässt. Die Schwellen hier waren schon
 * einmal falsch gesetzt; deshalb steht das Wissen an genau einer Stelle.
 *
 * Stand der Dinge auf iOS:
 *   < 18   WebGPU gibt es nicht
 *   18–25  vorhanden, aber ab Werk abgeschaltet (Funktionsmerkmal)
 *   >= 26  ab Werk eingeschaltet
 */
export const IOS_WEBGPU_FIRST = 18;
export const IOS_WEBGPU_DEFAULT_ON = 26;

export function iosMajor(ua: string): number | null {
  if (!/iPad|iPhone|iPod/.test(ua)) return null;
  const match = ua.match(/OS (\d+)[_.]/);
  return match ? Number(match[1]) : null;
}

/** Auf iOS nutzt jeder Browser WebKit, meldet sich aber unterschiedlich. */
export function isOtherBrowserOnIOS(ua: string): boolean {
  return /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/.test(ua);
}

export interface AdviceInput {
  hasGpu: boolean;
  ua: string;
  standalone: boolean;
}

/** Die eine Stelle, an der entschieden wird, was der Person gesagt wird. */
export function webgpuAdvice({ hasGpu, ua, standalone }: AdviceInput): string {
  if (hasGpu) {
    return 'WebGPU ist vorhanden. Tipp unten auf „Genauer prüfen“, um den Grafikadapter zu testen.';
  }

  const major = iosMajor(ua);

  if (major === null) {
    return 'Dieser Browser bietet kein WebGPU an. Es braucht einen aktuellen Chrome, Edge oder Safari auf einem Gerät mit unterstützter Grafik.';
  }

  if (isOtherBrowserOnIOS(ua)) {
    return 'Du bist auf dem iPhone in einem anderen Browser als Safari. Nur Safari bietet dort WebGPU an. Öffne die Adresse in Safari und lege sie über Teilen → Zum Home-Bildschirm hinzufügen ab.';
  }

  if (major < IOS_WEBGPU_FIRST) {
    return `Dein iPhone läuft auf iOS ${major}. WebGPU gibt es dort noch gar nicht – es kam mit iOS ${IOS_WEBGPU_FIRST} und ist ab iOS ${IOS_WEBGPU_DEFAULT_ON} von Haus aus eingeschaltet.`;
  }

  if (major < IOS_WEBGPU_DEFAULT_ON) {
    return `Auf iOS ${major} ist WebGPU vorhanden, aber ab Werk abgeschaltet. Einschalten unter: Einstellungen → Apps → Safari → Erweitert → Funktionsmerkmale (bzw. Feature Flags) → „WebGPU“. Danach Safari schließen und die Seite neu laden. Ab iOS ${IOS_WEBGPU_DEFAULT_ON} entfällt dieser Schritt.`;
  }

  if (standalone) {
    return `Auf iOS ${major} sollte WebGPU eingeschaltet sein. Du hast die App aber vom Homescreen gestartet, und dort stellt iOS nicht immer dieselben Funktionen bereit wie in Safari. Öffne die Adresse einmal direkt in Safari und schau, ob es dort geht.`;
  }

  return `Auf iOS ${major} sollte WebGPU eingeschaltet sein, Safari meldet es hier aber nicht. Prüf unter Einstellungen → Apps → Safari → Erweitert → Funktionsmerkmale, ob „WebGPU“ versehentlich aus ist.`;
}
