import { StyleSheet, Text, View } from 'react-native';

import { colors, loginLayout } from '../../lib/theme';
import { LoginHopeQuotesAnimation } from './login-hope-quotes-animation';

const SALON_TITLE = '나만의 살롱';
const APP_TITLE = 'AI 헤어 다이어리';

export function LoginHeadlines() {
  return (
    <View style={styles.block}>
      <Text style={styles.salon}>{SALON_TITLE}</Text>
      <Text style={styles.app}>{APP_TITLE}</Text>
      <LoginHopeQuotesAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    maxWidth: loginLayout.maxContentWidth,
    width: '100%',
  },
  salon: {
    color: colors.purple,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 52,
    textAlign: 'center',
  },
  app: {
    color: colors.coral,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
});
