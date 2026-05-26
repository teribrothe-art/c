import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView, { WebViewNavigation } from 'react-native-webview';

import { resolveTossWebViewNavigation } from '../../lib/toss-webview-navigation';

type Props = {
  visible: boolean;
  html: string;
  onClose: () => void;
  onSuccess: (result: {
    paymentKey: string;
    orderId: string;
    amount: number;
    treatmentId?: string;
  }) => void;
  onFail: (result: { code: string; message: string }) => void;
};

export function TossPaymentWebView({ visible, html, onClose, onSuccess, onFail }: Props) {
  const insets = useSafeAreaInsets();
  const lastHandledUrl = useRef('');

  useEffect(() => {
    if (!visible) {
      lastHandledUrl.current = '';
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [onClose, visible]);

  const handleUrl = useCallback(
    (url: string) => {
      if (!url || lastHandledUrl.current === url) {
        return 'allow' as const;
      }

      const result = resolveTossWebViewNavigation(url);

      if (result.action === 'success') {
        lastHandledUrl.current = url;
        onSuccess(result.payload);
        return 'block' as const;
      }

      if (result.action === 'fail') {
        lastHandledUrl.current = url;
        onFail({ code: result.payload.code, message: result.payload.message });
        return 'block' as const;
      }

      if (result.action === 'block') {
        return 'block' as const;
      }

      return 'allow' as const;
    },
    [onFail, onSuccess],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, [handleUrl, visible]);

  const handleNavigation = useCallback(
    (navigation: WebViewNavigation) => handleUrl(navigation.url) !== 'block',
    [handleUrl],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="결제창 닫기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
          <Text style={styles.title}>토스페이먼츠</Text>
          <View style={styles.headerSpacer} />
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          onShouldStartLoadWithRequest={(request) => handleNavigation(request)}
          onLoadStart={(event) => {
            handleUrl(event.nativeEvent.url);
          }}
          onNavigationStateChange={(navigation) => {
            void handleNavigation(navigation);
          }}
          setSupportMultipleWindows
          javaScriptCanOpenWindowsAutomatically
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closeButtonPressed: {
    opacity: 0.6,
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
