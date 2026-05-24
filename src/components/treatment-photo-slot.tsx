import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type TreatmentPhotoSlotProps = {
  label: string;
  previewUrl?: string | null;
  isUploading?: boolean;
  onPress: () => void;
  onRemove: () => void;
};

export function TreatmentPhotoSlot({
  label,
  previewUrl,
  isUploading = false,
  onPress,
  onRemove,
}: TreatmentPhotoSlotProps) {
  const hasPhoto = Boolean(previewUrl);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={isUploading}
        onPress={onPress}
        style={[styles.box, !hasPhoto && styles.emptyBox]}>
        {isUploading ? (
          <ActivityIndicator color="#FF5A5F" />
        ) : hasPhoto ? (
          <>
            <Image contentFit="cover" source={{ uri: previewUrl! }} style={styles.image} />
            <Pressable
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              style={styles.removeButton}>
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.placeholderText}>사진 추가</Text>
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
    color: '#6B6B7B',
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
  placeholder: {
    alignItems: 'center',
    gap: 8,
  },
  cameraIcon: {
    fontSize: 28,
  },
  placeholderText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '700',
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
});
