/**
 * Im Browser gibt es kein Dateisystem. Der Datei-Auswähler liefert stattdessen
 * eine blob:- oder data:-Adresse, die sich ganz normal abrufen lässt.
 */
export async function readBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Die Datei konnte nicht gelesen werden.'));
    reader.onload = () => {
      const result = String(reader.result);
      // FileReader liefert "data:<typ>;base64,<daten>" – nur die Daten zählen.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
