import { File } from 'expo-file-system';

/** Liest eine Datei vom Gerät als Base64 – so, wie die API sie erwartet. */
export async function readBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}
