import type { ImagePickerOptions } from 'expo-image-picker';
import { Platform } from 'react-native';

/** ImagePicker·Storage에서 쓸 수 있는 표시 가능 URI */
export function isDisplayableImageUri(uri: string | null | undefined) {
  if (!uri) {
    return false;
  }

  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('data:') ||
    uri.startsWith('blob:')
  );
}

type PickerAsset = {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
};

/** 웹 blob URL 만료 방지 — base64 data URI로 저장 */
export function normalizePickerAssetUri(asset: PickerAsset) {
  if (asset.base64) {
    const mime = asset.mimeType ?? 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }

  return asset.uri;
}

export function imagePickerOptions(extra?: { aspect?: [number, number] }): ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: Platform.OS === 'web' ? 0.75 : 0.85,
    base64: Platform.OS === 'web',
    ...extra,
  };
}
