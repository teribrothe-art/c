import * as Linking from 'expo-linking';

import { parseTossFailUrl, parseTossSuccessUrl, type TossPaymentFailure, type TossPaymentSuccess } from './toss';

export type TossWebViewNavigationResult =
  | { action: 'success'; payload: TossPaymentSuccess }
  | { action: 'fail'; payload: TossPaymentFailure }
  | { action: 'block' }
  | { action: 'allow' };

function extractIntentAppLink(intentUrl: string) {
  const schemeMatch = intentUrl.match(/[#;]scheme=([^;\s]+)/i);
  const pathMatch = intentUrl.match(/intent:\/\/([^#]+)/i);

  if (!pathMatch?.[1]) {
    return null;
  }

  const scheme = schemeMatch?.[1] ?? 'https';
  return `${scheme}://${pathMatch[1]}`;
}

function openExternalUrl(url: string) {
  void Linking.canOpenURL(url)
    .then((canOpen) => {
      if (canOpen) {
        return Linking.openURL(url);
      }

      return undefined;
    })
    .catch(() => undefined);
}

/** WebView URL 변경 시 토스 결제 완료·실패·앱스킴·Intent 판별 (동기) */
export function resolveTossWebViewNavigation(url: string): TossWebViewNavigationResult {
  const trimmed = url.trim();

  if (!trimmed) {
    return { action: 'allow' };
  }

  const success = parseTossSuccessUrl(trimmed);

  if (success) {
    return { action: 'success', payload: success };
  }

  const failure = parseTossFailUrl(trimmed);

  if (failure) {
    return { action: 'fail', payload: failure };
  }

  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('about:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:')
  ) {
    return { action: 'allow' };
  }

  if (lower.startsWith('intent:')) {
    const appLink = extractIntentAppLink(trimmed);

    if (appLink) {
      openExternalUrl(appLink);
    }

    return { action: 'block' };
  }

  openExternalUrl(trimmed);
  return { action: 'block' };
}
