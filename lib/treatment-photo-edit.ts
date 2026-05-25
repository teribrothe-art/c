import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

const JPEG_OPTIONS = {
  compress: 0.85,
  format: ImageManipulator.SaveFormat.JPEG,
  base64: Platform.OS === 'web',
} as const;

function toDisplayUri(result: ImageManipulator.ImageResult) {
  if (result.base64) {
    return `data:image/jpeg;base64,${result.base64}`;
  }

  return result.uri;
}

export async function rotateTreatmentPhoto(sourceUri: string, degrees: 90 | -90 = 90) {
  const result = await ImageManipulator.manipulateAsync(sourceUri, [{ rotate: degrees }], JPEG_OPTIONS);
  return toDisplayUri(result);
}

/** 가운데 기준 4:3 크롭 (웹·네이티브 공통) */
export async function cropTreatmentPhotoToAspect(
  sourceUri: string,
  aspect: [number, number] = [4, 3],
) {
  const probe = await ImageManipulator.manipulateAsync(sourceUri, [], JPEG_OPTIONS);
  const width = probe.width;
  const height = probe.height;
  const targetRatio = aspect[0] / aspect[1];
  const currentRatio = width / height;

  let cropWidth: number;
  let cropHeight: number;
  let originX: number;
  let originY: number;

  if (currentRatio > targetRatio) {
    cropHeight = height;
    cropWidth = Math.round(height * targetRatio);
    originX = Math.round((width - cropWidth) / 2);
    originY = 0;
  } else {
    cropWidth = width;
    cropHeight = Math.round(width / targetRatio);
    originX = 0;
    originY = Math.round((height - cropHeight) / 2);
  }

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
    JPEG_OPTIONS,
  );

  return toDisplayUri(result);
}
