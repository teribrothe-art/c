import { StyleSheet, Text, View } from 'react-native';

import type { DemoLoginAccount } from '../../lib/demo-login-account-types';
import { formatDemoDesignerCustomerCount } from '../../lib/demo-designer-customer-counts';
import { WebPressable, webPressableStyle } from './web-pressable';

type TestLoginAccountGridProps = {
  accounts: DemoLoginAccount[];
  loadingId: string | null;
  onLogin: (account: DemoLoginAccount) => void;
};

function getInitial(label: string) {
  return label.trim().slice(0, 1) || '?';
}

function resolveTileTitle(account: DemoLoginAccount) {
  return account.displayName?.trim() || account.loginLabel;
}

function resolveTileSubtitle(account: DemoLoginAccount) {
  if (!account.displayName || account.displayName === account.loginLabel) {
    return null;
  }

  const parts = account.loginLabel.split(' · ').filter(Boolean);
  const yearPart = parts.find((part) => part.includes('년'));

  return yearPart ? `${account.roleLabel} · ${yearPart}` : account.roleLabel;
}

export function TestLoginAccountGrid({ accounts, loadingId, onLogin }: TestLoginAccountGridProps) {
  return (
    <View style={styles.grid}>
      {accounts.map((account) => {
        const isLoading = loadingId === account.id;
        const title = resolveTileTitle(account);
        const subtitle = resolveTileSubtitle(account);

        return (
          <View key={account.id} style={styles.tileWrap}>
            <WebPressable
              accessibilityRole="button"
              accessibilityLabel={`${account.loginLabel} ${account.roleLabel} 로그인`}
              disabled={Boolean(loadingId)}
              onPress={() => onLogin(account)}
              style={webPressableStyle(
                [
                  styles.tile,
                  { borderColor: account.accent },
                  isLoading && styles.tileLoading,
                ],
                !loadingId ? styles.tilePressed : undefined,
              )}>
              <View style={[styles.avatar, { backgroundColor: account.accent }]}>
                <Text style={styles.avatarText}>{getInitial(title)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : (
                <Text style={styles.badge}>{account.roleLabel}</Text>
              )}
              {typeof account.customerCount === 'number' ? (
                <Text style={styles.customerCount}>
                  {formatDemoDesignerCustomerCount(account.customerCount)}
                </Text>
              ) : null}
              {account.meta ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {account.meta}
                </Text>
              ) : null}
              <Text style={styles.action}>{isLoading ? '…' : '로그인'}</Text>
            </WebPressable>
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
    padding: 4,
    width: '25%',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'flex-start',
    minHeight: 128,
    overflow: 'hidden',
    paddingBottom: 6,
    paddingHorizontal: 4,
    paddingTop: 8,
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
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    color: '#7B5EE6',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
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
    marginTop: 'auto',
    paddingTop: 4,
  },
});