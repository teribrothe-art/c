import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type TreatmentPhotoSourceModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onCamera: () => void;
  onLibrary: () => void;
  onCancel: () => void;
};

export function TreatmentPhotoSourceModal({
  visible,
  title,
  message,
  onCamera,
  onLibrary,
  onCancel,
}: TreatmentPhotoSourceModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onCamera}
            style={({ pressed }) => [styles.actionButton, styles.cameraButton, pressed && styles.pressed]}>
            <Text style={styles.cameraText}>촬영</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onLibrary}
            style={({ pressed }) => [styles.actionButton, styles.libraryButton, pressed && styles.pressed]}>
            <Text style={styles.libraryText}>앨범</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.actionButton, styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 10,
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
  },
  cameraButton: {
    backgroundColor: colors.mint,
  },
  cameraText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  libraryButton: {
    backgroundColor: '#F0EBFF',
  },
  libraryText: {
    color: '#7B5EE6',
    fontSize: 16,
    fontWeight: '900',
  },
  cancelButton: {
    backgroundColor: '#F0F0F4',
    marginTop: 2,
  },
  cancelText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
});
