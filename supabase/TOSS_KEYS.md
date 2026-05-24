# 토스페이먼츠 API 키 설정

## 테스트 키 형식

- **클라이언트 키**: `test_ck_` 로 시작하는 긴 문자열 → 결제창·SDK
- **시크릿 키**: `test_sk_` 로 시작하는 긴 문자열 → 서버 승인 API

운영 전환 시 `live_ck_` / `live_sk_` 로 바뀝니다.

## 앱 (Expo)

`.env`:

```env
EXPO_PUBLIC_TOSS_CLIENT_KEY=test_ck_여기에_전체_키
```

`lib/toss.ts`에서 이 값으로 WebView/SDK 결제창을 띄웁니다.

## 서버 (Supabase Edge Function)

시크릿 키는 **절대** `EXPO_PUBLIC_` 또는 React Native 번들에 넣지 마세요.

1. Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
2. 이름: `TOSS_SECRET_KEY`, 값: `test_sk_...` 전체 문자열
3. Edge Function에서 `Deno.env.get('TOSS_SECRET_KEY')` 로 결제 승인 API 호출

앱의 `handleTossPaymentSuccess`는 현재 `paymentKey`를 DB에 저장만 합니다. 실제 입금 확정은 서버에서 시크릿 키로 토스 **결제 승인** API를 호출한 뒤 `payments.status`를 `paid`로 두는 흐름이 안전합니다.

## 참고

- [토스페이먼츠 API 키](https://docs.tosspayments.com/reference/using-api/api-keys)
- [결제 승인 API](https://docs.tosspayments.com/reference#결제-승인)
