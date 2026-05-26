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

### 3년 누적 통합 테스트 (디자이너 1 + 고객 10)

앱 실행 시 데모 저장소에 **2023년~현재** 시술·정산 더미가 자동 병합됩니다. (3년 테스트 디자이너: **시술 약 1,000건**, 영업일 **일 6~8건** 패턴)

**디자이너 공개 계정 (데모 모드)**

| 항목 | 값 |
|------|-----|
| **ID** | `test-designer-3y` |
| 이메일 | `test-designer@hair.app` |
| 비밀번호 | `test1234` |

| 역할 | 이메일 | 비밀번호 | ID |
|------|--------|----------|-----|
| 디자이너 | test-designer@hair.app | test1234 | `test-designer-3y` |
| 고객 1 | test-customer-1@hair.app | test1234 | `test-customer-01` |
| 고객 2 | test-customer-2@hair.app | test1234 | `test-customer-02` |
| … | … | … | … |
| 고객 10 | test-customer-10@hair.app | test1234 | `test-customer-10` |

- 디자이너 로그인 → **마이 → 내 활동**, **고객**, **매출**에서 누적 통계·월별 정산 확인
- 고객 로그인 → **홈/다이어리**에서 본인 시술 이력 확인
- 기존에 앱을 켠 적이 있어도 다음 실행 시 시드가 병합됨 (데이터가 안 보이면 앱 재시작)
- CLI 검증: `npm run verify:accumulated-designer` (시술·결제 건수·기간 자동 확인)

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
