import type Anthropic from '@anthropic-ai/sdk';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export interface PickedAttachment {
  kind: 'image' | 'pdf';
  name: string;
  mediaType: string;
  /** Rohdaten als Base64 – so wie die API sie erwartet. */
  data: string;
  /** Ungefähre Größe in Bytes, für die Speicher-Bereinigung. */
  bytes: number;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function mediaTypeFromName(name: string, fallback: string): string {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return fallback;
  }
}

function sizeOfBase64(data: string): number {
  return Math.floor((data.length * 3) / 4);
}

/** Foto aufnehmen. Gibt `null` zurück, wenn abgebrochen oder abgelehnt. */
export async function pickFromCamera(): Promise<PickedAttachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Kein Zugriff auf die Kamera erlaubt.');

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
  });
  return fromImageResult(result);
}

/** Bild aus der Galerie wählen. */
export async function pickFromLibrary(): Promise<PickedAttachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
  });
  return fromImageResult(result);
}

async function fromImageResult(
  result: ImagePicker.ImagePickerResult,
): Promise<PickedAttachment | null> {
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];

  const name = asset.fileName ?? 'Bild.jpg';
  const requested = asset.mimeType ?? mediaTypeFromName(name, 'image/jpeg');
  // Die API akzeptiert nur diese vier Bildformate.
  const mediaType = IMAGE_TYPES.has(requested) ? requested : 'image/jpeg';

  const data = asset.base64 ?? (await new File(asset.uri).base64());
  return { kind: 'image', name, mediaType, data, bytes: sizeOfBase64(data) };
}

/** PDF auswählen. */
export async function pickDocument(): Promise<PickedAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const name = asset.name || 'Dokument.pdf';
  const data = await new File(asset.uri).base64();
  return {
    kind: 'pdf',
    name,
    mediaType: mediaTypeFromName(name, asset.mimeType ?? 'application/pdf'),
    data,
    bytes: sizeOfBase64(data),
  };
}

/** Wandelt einen Anhang in den passenden Inhaltsblock für die API um. */
export function toContentBlock(
  attachment: PickedAttachment,
): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  if (attachment.kind === 'image') {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: attachment.mediaType as Anthropic.Base64ImageSource['media_type'],
        data: attachment.data,
      },
    };
  }
  return {
    type: 'document',
    title: attachment.name,
    source: { type: 'base64', media_type: 'application/pdf', data: attachment.data },
  };
}
