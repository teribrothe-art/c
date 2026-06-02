import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '../../lib/errors';
import { cropTreatmentPhotoToAspect, rotateTreatmentPhoto } from '../../lib/treatment-photo-edit';
import { colors } from '../../lib/theme';

type TreatmentPhotoEditModalProps = {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (editedUri: string) => void;
};

type TreatmentPhotoEditBodyProps = {
  imageUri: string;
  onCancel: () => void;
  onConfirm: (editedUri: string) => void;
};

function TreatmentPhotoEditBody({ imageUri, onCancel, onConfirm }: TreatmentPhotoEditBodyProps) {
  const [draftUri, setDraftUri] = useState(imageUri);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const runEdit = async (action: () => Promise<string>) => {
    try {
      setIsProcessing(true);
      setErrorMessage('');
      setDraftUri(await action());
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '편집에 실패했습니다.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!draftUri || isProcessing) {
      return;
    }

    onConfirm(draftUri);
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>사진 편집</Text>
        <Text style={styles.subtitle}>회전·자르기 후 적용해 주세요</Text>

        <View style={styles.previewFrame}>
          <Image contentFit="contain" source={{ uri: draftUri }} style={styles.preview} />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.toolRow}>
          <Pressable
            disabled={isProcessing}
            onPress={() => runEdit(() => rotateTreatmentPhoto(draftUri, -90))}
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}>
            <Text style={styles.toolButtonText}>↺ 회전</Text>
          </Pressable>
          <Pressable
            disabled={isProcessing}
            onPress={() => runEdit(() => rotateTreatmentPhoto(draftUri, 90))}
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}>
            <Text style={styles.toolButtonText}>회전 ↻</Text>
          </Pressable>
          <Pressable
            disabled={isProcessing}
            onPress={() => runEdit(() => cropTreatmentPhotoToAspect(draftUri))}
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}>
            <Text style={styles.toolButtonText}>4:3 자르기</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={isProcessing}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
          <Pressable
            disabled={isProcessing}
            onPress={handleConfirm}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>적용</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function TreatmentPhotoEditModal({
  visible,
  imageUri,
  onCancel,
  onConfirm,
}: TreatmentPhotoEditModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      {visible && imageUri ? (
        <TreatmentPhotoEditBody
          key={imageUri}
          imageUri={imageUri}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewFrame: {
    alignItems: 'center',
    backgroundColor: '#F3F3F6',
    borderRadius: 12,
    height: 240,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  preview: {
    height: '100%',
    width: '100%',
  },
  errorText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  toolButton: {
    backgroundColor: '#F3F3F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toolButtonText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#F0F0F4',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
  },
  cancelText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 12,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
  },
});
