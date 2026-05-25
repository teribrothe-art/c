import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

const MAX_UPLOAD_WIDTH = 1080;
const UPLOAD_JPEG_QUALITY = 0.8;

/**
 * 갤러리·카메라 URI를 업로드용으로 보정합니다.
 * - EXIF 회전 반영(올바른 방향)
 * - 긴 변 기준 최대 1080px 리사이즈
 * - JPEG 압축
 */
export async function prepareImageForUpload(sourceUri: string): Promise<string> {
  if (!sourceUri) {
    throw new Error('이미지 URI가 없습니다.');
  }

  const actions: ImageManipulator.Action[] = [{ resize: { width: MAX_UPLOAD_WIDTH } }];

  const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: UPLOAD_JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: Platform.OS === 'web',
  });

  if (result.base64) {
    return `data:image/jpeg;base64,${result.base64}`;
  }

  return result.uri;
}
