import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type UploadStatus = 'idle' | 'uploading' | 'success';

type TreatmentPhotoSlotProps = {
  label: string;
  previewUrl?: string | null;
  uploadStatus?: UploadStatus;
  onAdd: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

export function TreatmentPhotoSlot({
  label,
  previewUrl,
  uploadStatus = 'idle',
  onAdd,
  onPreview,
  onEdit,
  onRemove,
}: TreatmentPhotoSlotProps) {
  const hasPhoto = Boolean(previewUrl);
  const isUploading = uploadStatus === 'uploading';
  const isSuccess = uploadStatus === 'success';

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={isUploading}
        onPress={hasPhoto ? onPreview : onAdd}
        style={[styles.box, !hasPhoto && !isUploading && styles.emptyBox]}>
        {isUploading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color={colors.coral} />
            <Text style={styles.uploadingText}>업로드 중...</Text>
          </View>
        ) : isSuccess && hasPhoto ? (
          <>
            <Image contentFit="cover" source={{ uri: previewUrl! }} style={styles.image} />
            <View style={styles.successBadge}>
              <Text style={styles.successText}>✓</Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation?.();
                onPreview();
              }}
              style={styles.viewHintOverlay}
            >
              <Text style={styles.viewHintOverlayText}>탭하여 보기</Text>
            </Pressable>
          </>
        ) : hasPhoto ? (
          <>
            <Image contentFit="cover" source={{ uri: previewUrl! }} style={styles.image} />
            <View style={styles.viewHint} pointerEvents="none">
              <Text style={styles.viewHintText}>탭하여 보기</Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation?.();
                onEdit();
              }}
              style={styles.editButton}>
              <Text style={styles.editText}>변경</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation?.();
                onRemove();
              }}
              style={styles.removeButton}>
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.placeholderText}>탭하여 촬영·선택</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  box: {
    alignItems: 'center',
    borderRadius: 12,
    height: 130,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFD4D5',
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  centerContent: {
    alignItems: 'center',
    gap: 8,
  },
  cameraIcon: {
    fontSize: 28,
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  uploadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  viewHint: {
    backgroundColor: 'rgba(26, 26, 46, 0.55)',
    borderRadius: 8,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
  },
  viewHintOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewHintOverlayText: {
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 194, 168, 0.92)',
    borderRadius: 8,
    bottom: 10,
    justifyContent: 'center',
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.72)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 28,
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  successBadge: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    width: 36,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
});
