import { Redirect } from 'expo-router';

/** 이전 /ai 경로 호환 — 음성 상담은 /voice */
export default function AiRouteRedirect() {
  return <Redirect href="/voice" />;
}
