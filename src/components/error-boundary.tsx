import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>😔</Text>
        <Text style={styles.title}>앗, 일시적 오류가 발생했어요</Text>
        <Text style={styles.subtitle}>
          {this.state.message || '잠시 후 다시 시도해주세요.'}
        </Text>
        <Pressable
          onPress={this.handleRetry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>다시 시도하기</Text>
        </Pressable>
        <Text style={styles.help}>도움이 필요하면 문의해주세요</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 28,
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
  button: {
    backgroundColor: colors.coral,
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  help: { color: colors.muted, fontSize: 13, marginTop: 16 },
});
