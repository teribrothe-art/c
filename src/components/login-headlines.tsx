import { StyleSheet, View } from 'react-native';

import { loginLayout } from '../../lib/theme';
import { IronlongLogoWordmark } from './ironlong-logo';
import { LoginHopeQuotesAnimation } from './login-hope-quotes-animation';

export function LoginHeadlines() {
  return (
    <View style={styles.block}>
      <IronlongLogoWordmark />
      <LoginHopeQuotesAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    maxWidth: loginLayout.maxContentWidth,
    width: '100%',
  },
});
