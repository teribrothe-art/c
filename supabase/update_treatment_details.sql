update public.treatments
set
  duration = '3시간 20분',
  designer_diagnosis = '손상도 7/10. 한 달간 매직스트레이트 금지. 산성 샴푸 권장.',
  home_care = '주 2회 헤어 마스크. 드라이 온도 낮게.',
  ai_insight = '다음 시술은 6주 후 권장. 모이스처 트리트먼트 우선.'
where treatment_type = '탈색';

update public.treatments
set
  duration = '1시간 30분',
  designer_diagnosis = '모발 상태 양호. 정기 관리 잘 되고 있음.',
  home_care = '평소 사용 샴푸 유지. 3개월 후 트리트먼트 권장.',
  ai_insight = '컷 주기 6-8주 유지 권장.'
where treatment_type = '커트';

update public.treatments
set
  duration = '2시간 40분',
  designer_diagnosis = '컬러 시술 후 큐티클 손상. 단백질 보충 필요.',
  home_care = '단백질 트리트먼트 주 1회. 열기구 사용 자제.',
  ai_insight = '컬러 유지 위해 4주 후 토닝 권장.'
where treatment_type = '컬러';
