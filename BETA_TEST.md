# 베타 테스트 체크리스트

## 사전 준비

1. `.env` — Supabase URL/Anon Key (또는 비워두고 **데모 모드**)
2. Supabase SQL (프로덕션): `schema.sql` 또는 개별 migrate 파일 순서대로 실행
3. AI: `supabase secrets set ANTHROPIC_API_KEY=...` + `supabase functions deploy ai-chat`
4. `node scripts/beta-smoke-demo.mjs` — 로직 스모크 테스트
5. `npx tsc --noEmit` — 타입 검사

## 데모 계정 (Supabase 미설정 시)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 고객 | demo@hair.app | demo1234 |
| 디자이너 | designer@hair.app | demo1234 |

### 베타 전용 10계정 (앱 첫 실행 시 자동 시드)

| # | 디자이너 | 고객 (E2E 후 생성) | 비밀번호 |
|---|----------|-------------------|----------|
| 1 | beta-designer-1@hair.app | beta-customer-1@hair.app | beta1234 |
| 2 | beta-designer-2@hair.app | beta-customer-2@hair.app | beta1234 |
| 3 | beta-designer-3@hair.app | beta-customer-3@hair.app | beta1234 |
| 4 | beta-designer-4@hair.app | beta-customer-4@hair.app | beta1234 |
| 5 | beta-designer-5@hair.app | beta-customer-5@hair.app | beta1234 |

자동 검증: `npm run beta:e2e`

### 누적 통합 테스트 (디자이너 3종)

**일반 데모**(`designer@hair.app` / `demo@hair.app`)는 기존처럼 소량 시술 시드만 사용합니다.

테스트 디자이너로 로그인할 때만 해당 프로필 시술이 **메모리에** 로드됩니다 (AsyncStorage 미저장).

| 프로필 | ID | 이메일 | 기간 · 일정 |
|--------|-----|--------|-------------|
| 2년 | `test-designer-3y` | test-designer@hair.app | 최근 2년~현재 · 일 1~2건 |
| 1년 | `test-designer-1y` | test-designer-1y@hair.app | 최근 1년~현재 · 일 1~2건 |
| 3년 | `test-designer-accum-3y` | test-designer-accum-3y@hair.app | 최근 3년~현재 · **일 4~8명** · 단골 재방문 주기(컷 4~6주, 펌 2~4개월, 컬러 3~5개월 등) |

비밀번호 공통: `test1234`

**2년 디자이너 고객** — `test-customer-1@hair.app` … `test-customer-10@hair.app`  
**1년 디자이너 고객** — `test-1y-customer-1@hair.app` … `test-1y-customer-10@hair.app`  
**3년 디자이너 고객** — `test-3y-customer-001@hair.app` … `test-3y-customer-150@hair.app` (150명)

- 로그인 화면 **「2년 / 1년 / 3년 누적 테스트 디자이너 로그인」** 버튼
- **정산**, **자산**, **매출** 탭에서 누적 통계 확인
- **「Row too big…」** 오류 → Expo Go 완전 종료 후 재실행
- CLI: `npm run verify:accumulated-designer`

---

## 시나리오 A — 신규 고객 초대 (핵심)

1. **디자이너** 로그인 → **입력** 탭 → `컷` 선택
2. 고객 이름·금액 입력 → **시술 기록 만들기**
3. 필수 3항목 입력 (기법·진단·홈케어) → **고객 초대** → 코드 공유
4. **회원가입** (새 이메일) → 초대 코드 입력 → 가입
5. 환영 화면 → **다이어리 보기** → 시술 1건 표시 확인
6. 디자이너 **고객** 탭 → `가입 완료` 뱃지 확인

## 시나리오 B — 결제·정산 (연결된 고객)

1. 시나리오 A 완료 후 (또는 `demo@hair.app` + `demo-treatment-1`)
2. 디자이너 시술 상세 → **결제 요청** (고객 연결 필수)
3. **고객** 로그인 → 홈 결제 배너 또는 `/payment/[id]` → 결제 완료
4. 디자이너 → 피드백 3항목 완료 → **정산 요청**
5. 알림·매출 화면 갱신 확인

## 시나리오 C — AI 상담

1. 고객 로그인 → **AI 상담** 탭
2. 메시지 전송 → 응답·기록 저장
3. (Supabase) Edge Function 로그 확인

---

## 자주 나는 이슈

| 증상 | 해결 |
|------|------|
| 결제 요청 안 됨 | 고객 초대 후 가입(연결) 먼저 |
| 시술 입력 탭 무반응 | 최신 빌드 — 유형 선택 후 모달에서 이름 입력 |
| AI 데모만 응답 | Edge 배포 또는 `EXPO_PUBLIC_AI_ALLOW_CLIENT_KEY` (개발만) |
| 초대 4회째 막힘 | 데모는 무제한 / 실계정은 일 20회 |

---

## 실행

```bash
npm install
npx expo start
```

웹: `w` · iOS 시뮬레이터: `i` · Android: `a`
