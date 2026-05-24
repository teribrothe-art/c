# hair-diary-app

Expo Router와 TypeScript를 사용하는 Expo React Native 프로젝트입니다.

## 시작하기

```sh
npm install
cp .env.example .env
npm start
```

`.env` 파일을 만든 뒤 Supabase 값을 입력합니다.

```sh
EXPO_PUBLIC_SUPABASE_URL=여기에_입력
EXPO_PUBLIC_SUPABASE_ANON_KEY=여기에_입력
```

## Supabase 설정

Supabase 값이 placeholder인 상태에서는 앱이 로컬 저장소를 사용해 회원가입/로그인 흐름을 바로 확인할 수 있습니다. 실제 Supabase Auth와 profiles 테이블을 사용하려면 `.env`의 placeholder 값을 실제 Supabase 값으로 바꿔야 합니다.

```sh
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

값을 바꾼 뒤 Expo 서버를 다시 시작합니다.

```sh
npx expo start --tunnel --clear
```

회원가입 후 역할 정보와 시술 타임라인을 저장하려면 Supabase SQL Editor에서 `supabase/schema.sql` 내용을 먼저 실행해 `profiles`, `treatments` 테이블과 RLS 정책을 만들어야 합니다.

자동 로그인까지 바로 테스트하려면 Supabase Dashboard의 Authentication 설정에서 이메일 확인이 꺼져 있어야 합니다. 이메일 확인이 켜져 있으면 가입 후 이메일 인증을 먼저 해야 로그인할 수 있습니다.

## 토스페이먼츠 (테스트)

토스페이먼츠 개발자센터에서 **API 개별 연동 키**를 발급받습니다.

| 키 | 접두사 | 어디에 넣나요 |
|----|--------|----------------|
| **클라이언트 키** | `test_ck_` … (긴 문자열) | 앱 `.env` → `EXPO_PUBLIC_TOSS_CLIENT_KEY` |
| **시크릿 키** | `test_sk_` … (긴 문자열) | **앱에 넣지 않음** → Supabase Edge Function Secrets (`TOSS_SECRET_KEY`) |

```sh
# .env (Expo만)
EXPO_PUBLIC_TOSS_CLIENT_KEY=test_ck_발급받은_전체_문자열
```

시크릿 키는 결제 **승인 API**(`paymentKey` 확정)에만 쓰입니다. 클라이언트에 노출되면 안 됩니다.

키를 넣은 뒤 `npx expo start --clear`로 다시 실행하세요. `test_ck_`가 없으면 결제 화면은 **데모 결제**로 동작합니다.

결제 화면에 샌드박스 **테스트 카드** 안내가 표시됩니다 (카드번호 `4330-1234-1234-1234` 등).

## 다이어리 타임라인

홈 화면(`/home`)은 Supabase의 `treatments` 테이블에서 본인 시술 기록을 최신순으로 불러옵니다. Supabase 설정 전에는 로컬 확인용 시술 카드가 표시됩니다.

## 사용 가능한 스크립트

- `npm start`: Expo 개발 서버 실행
- `npm run android`: Android 에뮬레이터/기기에서 실행
- `npm run ios`: iOS 시뮬레이터/기기에서 실행
- `npm run web`: 웹에서 실행
- `npm run lint`: Expo lint 실행
