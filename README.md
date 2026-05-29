# hair-diary-app

Expo Router와 TypeScript를 사용하는 Expo React Native 프로젝트입니다.

## 시작하기 (처음 개발할 때와 동일)

```sh
npm install
cp .env.example .env
npm start
```

- 터미널에 **QR 코드**가 나옵니다 → Expo Go로 스캔 (PC·폰이 **같은 Wi‑Fi**)
- Windows: `scripts\start-dev.cmd` 도 동일 (`npm start`)

Wi‑Fi가 다르거나 QR이 `172.x`만 보이면:

```sh
npm run start:phone
npm run share
```

접속 점검: `npm run connect`

## 휴대폰에서 접속 (Expo Go) — PC 공유

**브라우저용** `npm run web` / `web:clear` 만 켜 두면 휴대폰 QR이 안 보이거나 접속이 실패할 수 있습니다.

### PC에서 공유 주소 받기 (권장 순서)

**터미널 1** — Metro 터널 (이 창을 닫지 않음):

```sh
npm run start:phone
```

**터미널 2** — 공유 URL·QR·HTML 생성:

```sh
npm run share
```

생성 파일:

| 파일 | 용도 |
|------|------|
| `expo-go-share.txt` | 카톡·메일로 `exp://…` 주소 복사 |
| `expo-go-share.html` | 브라우저에서 QR + **주소 복사** 버튼 |
| `expo-go-qr.png` | Expo Go에서 QR 스캔 |

Windows: `scripts\start-phone-pc.cmd` 실행 후, Metro가 뜨면 `scripts\share-expo-pc.cmd` (HTML 자동 열림).

`npm run share`가 **터널 없음 / 사설 IP**이면 종료 코드 2 — 반드시 `start:phone`으로 터널이 켜졌는지 확인하세요.

### 같은 Wi‑Fi만 쓸 때

```sh
npm run start:lan
npm run share
```

### QR만 다시 만들기

```sh
npm run qr
```

- `npm run qr:html` → `expo-go-qr.html`  

3. Metro가 떠 있는 **같은 PC**에서 번들 확인:

```sh
npm run check:phone
```

- `check:phone` OK + 폰만 실패 → Wi‑Fi/터널 문제 → `start:phone` 재시도, Expo Go **Reload**(↻)  
- `check:phone` FAIL → 터미널 빨간 Metro 오류 확인 후 `npm run start:phone`  
4. 빨간 번들 오류가 나면 캐시 삭제 후 재시작: `npm run start:phone`  
5. QR 관련 Metro 500 (`Failed to get the SHA-1 for …/metro-stubs/…`) → `react-native-qrcode-svg` 제거됨. `npm run start:phone` 으로 캐시 삭제 후 재시작

### 어플(Expo Go)로 접속이 안 될 때

| 증상 | 가장 흔한 원인 | 조치 |
|------|----------------|------|
| 연결 자체가 안 됨 / 로딩만 멈춤 | `web:clear`만 실행, 또는 PC·폰 네트워크 불일치 | `npm run start:phone` 후 QR 재스캔 |
| "Unable to connect" | 방화벽·게스트 Wi‑Fi·VPN | 터널(`start:phone`) 또는 같은 Wi‑Fi + `start:lan` |
| 파란 화면 **Something went wrong** | 번들 로드 실패·구버전 Expo Go·캐시 | 아래 「Something went wrong」 절차 |
| 노란 **Console Warning: Cannot connect to Expo CLI** | Metro 꺼짐·PC·폰 네트워크 불일치·HMR 끊김 | `npm run start:phone` 후 QR 재스캔 · `npm run check:app` · Expo Go **Reload**(↻) |
| Cursor 원격 VM에서 개발 | QR의 IP가 내 폰에서 안 보임 | **본인 PC**에서 `git clone` 후 `start:phone` 실행 (또는 터널 URL이 폰에서 열리는지 확인) |

데모 로그인( Supabase 미설정 시): `demo@hair.app` / `demo1234`, `designer@hair.app` / `demo1234`

### Expo Go 파란 화면 — Something went wrong

1. 화면 맨 아래 **View error log** 탭 → 빨간 오류 한 줄 확인 (PC Metro 터미널에도 동일 메시지)
2. Expo Go **최신 버전** (SDK 56) — 스토어 업데이트 또는 https://expo.dev/go
3. PC에서 Metro 종료 후: `npm run start:phone` → `npm run share` → **새 QR** 스캔
4. Expo Go에서 프로젝트 삭제 후 QR 다시 스캔, 또는 **Reload(↻)** 두 번
5. PC에서 `npm run check:phone` 이 OK인지 확인 (FAIL이면 터미널 빨간 Metro 로그 수정)

### 브라우저 `http://localhost:8081` — ERR_EMPTY_RESPONSE (-324)

| 순위 | 가장 흔한 원인 |
|------|----------------|
| 1 | **Expo/Metro가 안 떠 있음** (8081에 프로세스 없음) |
| 2 | **첫 접속이 너무 빠름** — 번들링 중이라 응답 없이 끊김 |
| 3 | **Metro가 번들 중 크래시** — 터미널에 빨간 에러 |
| 4 | **다른 터미널/PC** — 브라우저 PC와 `expo start` PC가 다름 |

**가장 빠른 확인 (순서대로):**

```sh
# 1) 서버 실행 (프로젝트 폴더에서)
npm run web:clear

# 2) 터미널에 "Metro waiting on" / "Web is waiting" 나올 때까지 30~60초 대기

# 3) 같은 PC에서 확인
npm run check:dev
# 또는
curl -I http://127.0.0.1:8081/
```

- `Connection refused` → 서버 미실행 → 1번부터  
- `check:dev` OK인데 브라우저만 실패 → **127.0.0.1:8081** 로 다시 열기, 시크릿 창, 확장 프로그램 끄기  
- Cursor **포트 포워딩** 사용 시 → 워크스페이스 안에서 `npm run web:clear` 실행 중이어야 함  

웹 전용이면 `npm run web` 만으로 충분합니다 (`expo start`만 하고 `w` 안 눌러도 됨).

### Expo Go에서 "Something went wrong" (파란 화면)

1. **Expo Go 앱을 최신 버전**으로 업데이트 (이 프로젝트는 SDK 56)
2. PC에서 캐시 삭제 후 재시작: `npm run start:phone`
3. 휴대폰과 PC **같은 Wi‑Fi**이면 `npm run start:lan`이 더 안정적
4. Expo Go에서 **Reload**(↻) 한 번 더 시도

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

## AI 상담 (Anthropic + Supabase Edge)

프로덕션에서는 **앱에 API 키를 넣지 않습니다.** Supabase Edge Function `ai-chat`이 Anthropic을 프록시합니다.

1. `supabase/migrate_ai_conversations.sql` 실행
2. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
3. `supabase functions deploy ai-chat`

자세한 설정: [`supabase/AI_EDGE.md`](supabase/AI_EDGE.md)

| 모드 | 동작 |
|------|------|
| Supabase + 로그인 | Edge Function → `claude-haiku-4-5` |
| 데모 로그인 (`demo@hair.app`) | 시술 이력 기반 샘플 응답 |
| 로컬만 (`EXPO_PUBLIC_AI_ALLOW_CLIENT_KEY=true`) | 앱에서 직접 Anthropic (개발용) |

대화는 `ai_conversations` 테이블에 저장됩니다.

## 다이어리 타임라인

홈 화면(`/home`)은 Supabase의 `treatments` 테이블에서 본인 시술 기록을 최신순으로 불러옵니다. Supabase 설정 전에는 로컬 확인용 시술 카드가 표시됩니다.

## 사용 가능한 스크립트

- `npm start`: Expo 개발 서버 실행
- `npm run android`: Android 에뮬레이터/기기에서 실행
- `npm run ios`: iOS 시뮬레이터/기기에서 실행
- `npm run web`: 웹에서 실행
- `npm run lint`: Expo lint 실행
