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

/** 카메라 촬영 — allowsEditing+aspect 조합이 Android에서 실패하는 경우가 많아 분리 */
export function treatmentCameraPickerOptions(): ImagePickerOptions {
  if (Platform.OS === 'ios') {
    return {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    };
  }

  return {
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  };
}

const WEB_MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** 웹: launchCameraAsync 대신 capture 파일 입력 (모바일·데스크톱) */
export function pickImageFileOnWeb(options?: { useCamera?: boolean }): Promise<string | null> {
  if (typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    if (options?.useCamera) {
      input.setAttribute('capture', 'environment');
    }

    const finish = (result: string | null) => {
      input.remove();
      resolve(result);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];

      if (!file) {
        finish(null);
        return;
      }

      if (file.size > WEB_MAX_PHOTO_BYTES) {
        reject(new Error('PHOTO_TOO_LARGE'));
        return;
      }

      const reader = new FileReader();

      reader.onloadend = () => {
        finish(typeof reader.result === 'string' ? reader.result : null);
      };

      reader.onerror = () => {
        reject(new Error('사진 파일을 읽을 수 없습니다.'));
      };

      reader.readAsDataURL(file);
    });

    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
  });
}
