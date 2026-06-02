# hair-diary-app

Expo Router와 TypeScript를 사용하는 Expo React Native 프로젝트입니다.

## 시작하기

```sh
npm install
cp .env.example .env
npm start
```

## Metro 없이 사용하기

**Expo Go**는 실행할 때마다 PC의 **Metro**가 JS 번들을 보내줘야 합니다. Metro·ngrok 없이 쓰려면 아래 중 하나를 씁니다.

### A. 설치형 앱 (EAS Build) — 폰에서 단독 실행

1. [Expo 계정](https://expo.dev) + `npm i -g eas-cli` + `eas login`
2. Android APK 빌드:

```sh
npm run build:preview:android
```

3. EAS 대시보드에서 **APK 다운로드 → 폰 설치**
4. 이후 **앱 아이콘**으로 실행 (Metro·PC 불필요)

코드만 바꿨을 때 (앱 재설치 없이):

```sh
npm run update:preview
```

앱을 열면 OTA로 최신 JS 반영 (`preview` 채널, `eas.json` 참고).

iOS는 `npm run build:preview:ios` 후 TestFlight/Ad Hoc.

### B. 웹만 (정적 export)

```sh
npm run export:web
```

`dist/` 폴더를 Netlify·Vercel·NAS 등에 올리면 **브라우저**에서 Metro 없이 접속. (네이티브 Expo Go와는 별도)

### C. 개발 중 (Metro 필요)

| 목적 | 명령 |
|------|------|
| 같은 Wi‑Fi | `npm run start:wifi` → `npm run share` |
| Android USB | `npm run start` → `npm run android:usb` |
| 다른 네트워크 | `npm run connect` (원클릭) |
| 수동 터널 | `npm run start:connect` → `npm run share` |

요약: `npm run phone:standalone`

## 휴대폰에서 접속 (Expo Go) — PC 공유

**브라우저용** `npm run web` / `web:clear` 만 켜 두면 휴대폰 QR이 안 보이거나 접속이 실패할 수 있습니다.

### 휴대폰 접속 — ngrok 없이 (권장, 같은 Wi‑Fi)

**터미널 1:**

```sh
npm run start:wifi
```

**터미널 2:**

```sh
npm run share
```

Expo Go → QR 스캔 (`exp://192.168.x.x:8081` 형식). PC·폰이 **같은 Wi‑Fi**, 게스트 Wi‑Fi·VPN 끄기.

Windows: `scripts\start-wifi-pc.cmd` → Metro 뜬 뒤 `scripts\share-expo-pc.cmd`

### Android USB (Wi‑Fi 없이)

```sh
npm run start
npm run android:usb
```

Expo Go → `exp://127.0.0.1:8081` 입력

### 원클릭 접속 (권장)

```sh
npm run connect
```

cloudflared 터널(토큰 불필요) + Metro + QR 자동 생성 → `expo-go-qr.png` 스캔

### 수동 (터미널 2개)

**터미널 1:**

```sh
npm run start:connect
```

**터미널 2:**

```sh
npm run share
```

터널 우선순위: **ngrok**(`.env`에 `NGROK_AUTHTOKEN`) → **cloudflared**(무료) → **localtunnel**

생성 파일:

| 파일 | 용도 |
|------|------|
| `expo-go-share.txt` | 카톡·메일로 `exp://…` 주소 복사 |
| `expo-go-share.html` | 브라우저에서 QR + **주소 복사** 버튼 |
| `expo-go-qr.png` | Expo Go에서 QR 스캔 |

Windows: `scripts\start-phone-pc.cmd` 실행 후, Metro가 뜨면 `scripts\share-expo-pc.cmd` (HTML 자동 열림).

`npm run share`가 **localhost / 사설 IP(172·10 대역)** 이면 같은 Wi‑Fi·VPN 확인. LAN은 `start:wifi` 권장.

### ngrok v3 + Traffic Policy (`policy.yaml`)

Expo에 포함된 `@expo/ngrok`(v2)은 `--traffic-policy-file`을 지원하지 않습니다. **ngrok v3 CLI**를 별도 설치하세요.

1. [ngrok 다운로드](https://ngrok.com/download) → `ngrok config add-authtoken YOUR_TOKEN`
2. **터미널 1** — Metro:

```sh
npm run start:wifi
```

3. **터미널 2** — Traffic Policy 터널 (Metro 기본 **8081**):

```sh
npm run tunnel:policy
```

또는 직접:

```sh
ngrok http 8081 --traffic-policy-file policy.yaml
```

로컬 프록시가 **80** 포트면:

```sh
npm run tunnel:policy:80
# 또는
ngrok http 80 --traffic-policy-file policy.yaml
```

4. **터미널 3** — 공유 URL·QR:

```sh
npm run share
```

Windows: `scripts\start-ngrok-policy.cmd`

`policy.yaml`은 브라우저로 `/`에 접속했을 때 Expo Go 안내 페이지를 보여 주고, Metro 응답에 개발용 CORS 헤더를 추가합니다.

### ~~같은 Wi‑Fi만 쓸 때~~ → 위 `start:wifi` 참고

```sh
npm run start:wifi
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
5. `react-native-svg` / QR 관련 500 오류는 `metro.config.js`의 스텁 설정으로 해결됨 — 의존성 변경 후에는 반드시 `--clear`로 재시작

### 어플(Expo Go)로 접속이 안 될 때

| 증상 | 가장 흔한 원인 | 조치 |
|------|----------------|------|
| 연결 자체가 안 됨 / 로딩만 멈춤 | `web:clear`만 실행, 또는 PC·폰 네트워크 불일치 | `npm run start:phone` 후 QR 재스캔 |
| "Unable to connect" | 방화벽·게스트 Wi‑Fi·VPN | 터널(`start:phone`) 또는 같은 Wi‑Fi + `start:lan` |
| 파란 화면 "Something went wrong" | Expo Go 구버전 또는 번들 크래시 | Expo Go 업데이트(SDK 56), `start:phone` + Reload |
| Cursor 원격 VM에서 개발 | QR의 IP가 내 폰에서 안 보임 | **본인 PC**에서 `git clone` 후 `start:phone` 실행 (또는 터널 URL이 폰에서 열리는지 확인) |

데모 로그인( Supabase 미설정 시): `demo@hair.app` / `demo1234`, `designer@hair.app` / `demo1234`

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
