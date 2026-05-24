import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView, { WebViewNavigation } from 'react-native-webview';

import { parseTossFailUrl, parseTossSuccessUrl } from '../../lib/toss';

type Props = {
  visible: boolean;
  html: string;
  onClose: () => void;
  onSuccess: (result: { paymentKey: string; orderId: string; amount: number }) => void;
  onFail: (result: { code: string; message: string }) => void;
};

export function TossPaymentWebView({ visible, html, onClose, onSuccess, onFail }: Props) {
  const insets = useSafeAreaInsets();

  const handleNavigation = (navigation: WebViewNavigation) => {
    const url = navigation.url;
    const success = parseTossSuccessUrl(url);

    if (success) {
      onSuccess(success);
      return false;
    }

    const failure = parseTossFailUrl(url);

    if (failure) {
      onFail({ code: failure.code, message: failure.message });
      return false;
    }

    return true;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
          <Text style={styles.title}>토스페이먼츠</Text>
          <View style={styles.headerSpacer} />
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          onShouldStartLoadWithRequest={(request) => handleNavigation(request)}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#E8E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 48,
  },
});
