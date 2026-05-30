import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DemoLoginAccount } from '../../lib/demo-login-accounts';
import { formatDemoDesignerCustomerCount } from '../../lib/demo-designer-customer-counts';

type TestLoginAccountGridProps = {
  accounts: DemoLoginAccount[];
  loadingId: string | null;
  onLogin: (account: DemoLoginAccount) => void;
};

function getInitial(label: string) {
  return label.trim().slice(0, 1) || '?';
}

export function TestLoginAccountGrid({ accounts, loadingId, onLogin }: TestLoginAccountGridProps) {
  return (
    <View style={styles.grid}>
      {accounts.map((account) => {
        const isLoading = loadingId === account.id;

        return (
          <View key={account.id} style={styles.tileWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${account.loginLabel} ${account.roleLabel} 로그인`}
              disabled={Boolean(loadingId)}
              onPress={() => onLogin(account)}
              style={({ pressed }) => [
                styles.tile,
                { borderColor: account.accent },
                pressed && !loadingId && styles.tilePressed,
                isLoading && styles.tileLoading,
              ]}>
              <View style={[styles.avatar, { backgroundColor: account.accent }]}>
                <Text style={styles.avatarText}>{getInitial(account.loginLabel)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {account.loginLabel}
              </Text>
              <Text style={styles.badge}>{account.roleLabel}</Text>
              {typeof account.customerCount === 'number' ? (
                <Text style={styles.customerCount}>
                  {formatDemoDesignerCustomerCount(account.customerCount)}
                </Text>
              ) : null}
              {account.meta ? (
                <Text style={styles.meta} numberOfLines={2}>
                  {account.meta}
                </Text>
              ) : null}
              <Text style={styles.action}>{isLoading ? '…' : '로그인'}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tileWrap: {
    aspectRatio: 1,
    padding: 4,
    width: '25%',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tilePressed: {
    backgroundColor: '#F5F5F8',
    opacity: 0.92,
  },
  tileLoading: {
    opacity: 0.65,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    marginBottom: 4,
    width: 28,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  name: {
    color: '#1A1A2E',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 12,
    textAlign: 'center',
    width: '100%',
  },
  badge: {
    color: '#6B6B7B',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  customerCount: {
    color: '#00C2A8',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
  },
  meta: {
    color: '#9CA3AF',
    fontSize: 7,
    fontWeight: '600',
    lineHeight: 9,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  action: {
    color: '#FF5A5F',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
  },
});
