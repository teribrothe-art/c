import * as ImagePicker from 'expo-image-picker';

import { getCurrentUser, isDemoAuthMode } from './auth';
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

function isLocalOrRemoteUrl(path: string) {
  return (
    path.startsWith('file://') ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  );
}

export async function getTreatmentPhotoSignedUrl(
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }

  if (isLocalOrRemoteUrl(storagePath)) {
    return storagePath;
  }

  if (isDemoAuthMode || !supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function pickTreatmentPhotoFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('갤러리 접근 권한이 필요합니다.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
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
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return updateTreatment(treatmentId, { [column]: storagePath });
}

export async function removeTreatmentPhoto(
  treatmentId: string,
  kind: TreatmentPhotoKind,
  storagePath: string | null | undefined,
): Promise<Treatment> {
  const column = getTreatmentPhotoColumn(kind);

  if (storagePath && !isLocalOrRemoteUrl(storagePath) && supabase && !isDemoAuthMode) {
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

    if (error) {
      throw new Error(error.message);
    }
  }

  return updateTreatment(treatmentId, { [column]: null });
}
