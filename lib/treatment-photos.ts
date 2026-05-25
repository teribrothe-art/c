import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { imagePickerOptions, isDisplayableImageUri } from './image-uri';
import { prepareImageForUpload } from './prepare-upload-image';
import { supabase } from './supabase';
import { Treatment, updateTreatment } from './treatments';

export type TreatmentPhotoKind = 'before' | 'after';

const BUCKET = 'treatment-photos';
const SIGNED_URL_EXPIRY_SECONDS = 3600;

export function getTreatmentPhotoStoragePath(
  userId: string,
  treatmentId: string,
  kind: TreatmentPhotoKind,
) {
  return `${userId}/${treatmentId}/${kind}.jpg`;
}

export function getTreatmentPhotoColumn(kind: TreatmentPhotoKind) {
  return kind === 'before' ? 'before_photo_url' : 'after_photo_url';
}

export async function getTreatmentPhotoSignedUrl(
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }

  if (isDisplayableImageUri(storagePath)) {
    return storagePath;
  }

  if (isDemoAuthMode || !supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    throw toAppError(error);
  }

  return data.signedUrl;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function pickTreatmentPhotoFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('갤러리 접근 권한이 필요합니다.');
  }

  const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions());

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];

  if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
    throw new Error('PHOTO_TOO_LARGE');
  }

  return prepareImageForUpload(asset.uri);
}

export async function uploadTreatmentPhoto(
  treatmentId: string,
  kind: TreatmentPhotoKind,
  localUri: string,
): Promise<Treatment> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const column = getTreatmentPhotoColumn(kind);

  if (isDemoAuthMode || !supabase) {
    return updateTreatment(treatmentId, { [column]: localUri });
  }

  const storagePath = getTreatmentPhotoStoragePath(user.id, treatmentId, kind);
  let blob: Blob;
  let contentType = 'image/jpeg';

  if (localUri.startsWith('data:')) {
    const response = await fetch(localUri);
    blob = await response.blob();
    contentType = blob.type || contentType;
  } else {
    const response = await fetch(localUri);

    if (!response.ok) {
      throw new Error('사진 파일을 읽을 수 없습니다.');
    }

    blob = await response.blob();
    contentType = blob.type || contentType;
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    upsert: true,
    contentType,
  });

  if (uploadError) {
    throw toAppError(uploadError);
  }

  return updateTreatment(treatmentId, { [column]: storagePath });
}

export async function removeTreatmentPhoto(
  treatmentId: string,
  kind: TreatmentPhotoKind,
  storagePath: string | null | undefined,
): Promise<Treatment> {
  const column = getTreatmentPhotoColumn(kind);

  if (storagePath && !isDisplayableImageUri(storagePath) && supabase && !isDemoAuthMode) {
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

    if (error) {
      throw toAppError(error);
    }
  }

  return updateTreatment(treatmentId, { [column]: null });
}
