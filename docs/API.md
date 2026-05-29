# BFF API 계약 (Phase B)

앱에서 `EXPO_PUBLIC_API_BASE_URL`을 설정하면 Supabase 직접 조회 대신 아래 REST API를 사용합니다.  
인증: `Authorization: Bearer <supabase_access_token>`

데모 모드(`isDemoAuthMode`)에서는 REST를 사용하지 않고 로컬 Repository를 사용합니다.

---

## Ledger (권장 — 한 번에 시술+결제)

### `GET /v1/designer/ledger`

디자이너 시술·결제 원장. 자산·매출·정산 화면의 공통 데이터 소스.

**Query**

| 파라미터 | 설명 |
|----------|------|
| `month` | 선택. `YYYY-MM` — 해당 월 필터 (서버 측 선택) |

**Response `200`**

```json
{
  "treatments": [ /* Treatment[] */ ],
  "payments": [ /* PaymentRecord[] */ ]
}
```

### `GET /v1/customer/ledger`

고객 다이어리·결제·영수증 공통 데이터.

**Response `200`**

```json
{
  "treatments": [ /* Treatment[] */ ],
  "payments": [ /* PaymentRecord[] */ ]
}
```

---

## Granular (선택 — Ledger 미구현 시 폴백)

| Method | Path | Response |
|--------|------|----------|
| GET | `/v1/designer/treatments` | `{ "treatments": Treatment[] }` |
| GET | `/v1/customer/treatments` | `{ "treatments": Treatment[] }` |
| GET | `/v1/designer/payments` | `{ "payments": PaymentRecord[] }` |
| GET | `/v1/customer/payments` | `{ "payments": PaymentRecord[] }` |
| GET | `/v1/treatments/:id` | `{ "treatment": Treatment \| null }` |
| GET | `/v1/payments/by-treatment/:treatmentId` | `{ "payment": PaymentRecord \| null }` |

---

## 쓰기 (Phase C 예정)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/v1/payments/settle` | 디자이너 정산 |
| POST | `/v1/payments/:treatmentId/paid` | 결제 완료 콜백 |

쓰기는 현재 앱에서 Supabase/demo `lib/payments.ts` 경로를 사용합니다.

---

## 타입 참고

- `Treatment` — `lib/treatments.ts`
- `PaymentRecord` — `lib/payment-types.ts`

---

## 앱 설정

```env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`EXPO_PUBLIC_API_BASE_URL`이 없으면 **supabase** 모드(직접 DB).  
데모 로그인 시 **demo** 모드(AsyncStorage + in-memory).
