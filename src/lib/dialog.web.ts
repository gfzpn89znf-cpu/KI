/**
 * Im Browser gibt es kein React-Native-Alert. `window.confirm` ist schlicht,
 * aber es funktioniert überall – auch in einer zum Homescreen hinzugefügten App.
 * Für Auswahllisten nutzt die App stattdessen ein eigenes Blatt (Chooser).
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const text = options.message ? `${options.title}\n\n${options.message}` : options.title;
  try {
    return Promise.resolve(globalThis.confirm(text));
  } catch {
    return Promise.resolve(false);
  }
}

export function notify(title: string, message?: string): void {
  const text = message ? `${title}\n\n${message}` : title;
  try {
    globalThis.alert(text);
  } catch {
    console.warn(text);
  }
}
