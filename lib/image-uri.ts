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
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://') ||
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

/** 시술 Before/After — Android 4:3 크롭, iOS·Android 네이티브 편집 UI (웹은 별도 편집 모달) */
export function treatmentPhotoPickerOptions(): ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: Platform.OS === 'android' ? ([4, 3] as [number, number]) : undefined,
    quality: Platform.OS === 'web' ? 0.75 : 0.85,
    base64: Platform.OS === 'web',
  };
}
