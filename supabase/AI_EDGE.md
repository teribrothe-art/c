# AI 상담 — Supabase Edge Function 프록시

앱에는 **Anthropic API 키를 넣지 않습니다.** 서버(Supabase Edge Function)만 키를 보관합니다.

## 1. Secret 등록 (Supabase Dashboard 또는 CLI)

```bash
supabase login
supabase link --project-ref <프로젝트_REF>

supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

Dashboard: **Project Settings → Edge Functions → Secrets** 에 `ANTHROPIC_API_KEY` 추가.

## 2. 함수 배포

```bash
supabase functions deploy ai-chat
```

## 3. 앱 환경 변수 (.env)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`EXPO_PUBLIC_ANTHROPIC_API_KEY` 는 **제거** (로컬 직접 호출이 필요할 때만 아래 참고).

## 4. 로컬 개발 (Edge Function 없이 테스트)

`.env` 에 추가 (개발 빌드 `expo start`):

```env
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-api03-...
# 선택: 프로덕션 빌드에서도 클라이언트 직접 호출 시
# EXPO_PUBLIC_AI_ALLOW_CLIENT_KEY=true
```

개발 모드에서는 `EXPO_PUBLIC_AI_ALLOW_CLIENT_KEY` 없이도 키가 있으면 Claude를 직접 호출합니다.  
프로덕션/EAS Update에는 **Anthropic 키를 앱에 넣지 마세요** (Edge만 사용).

## 5. 동작 확인

1. 고객 계정으로 로그인
2. **AI 상담** 탭에서 메시지 전송

## AI 인사이트 · 오늘의 케어

동일한 `ai-chat` Edge Function에 `taskType`을 전달합니다.

| taskType | 용도 |
|----------|------|
| `chat` (기본) | 고객 AI 상담 |
| `treatment_insight` | 디자이너 시술 기록 → `treatments.ai_insight` |
| `daily_care` | 로그인 후 오늘의 케어 문구 |

배포 후 디자이너 시술 입력 화면에서 **AI 인사이트 생성**이 Claude로 동작합니다. 미연동 시 앱은 규칙 기반 문구로 폴백합니다.
3. Supabase **Edge Functions → ai-chat → Logs** 에서 호출 확인
4. `ai_conversations` 테이블에 저장 확인

## 아키텍처

```
앱 → supabase.functions.invoke('ai-chat', { userMessage, userContext })
     → JWT 검증
     → Anthropic API (서버의 ANTHROPIC_API_KEY)
     → { text } 반환 → ai_conversations 저장
```
