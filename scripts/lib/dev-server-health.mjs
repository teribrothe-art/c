/** localhost Expo 웹 개발 서버 응답 확인 */
export async function isDevServerReady(options?: {
  host?: string;
  port?: number;
  timeoutMs?: number;
}) {
  const host = options?.host ?? process.env.HOST ?? '127.0.0.1';
  const port = Number(options?.port ?? process.env.PORT ?? 8081);
  const timeoutMs = options?.timeoutMs ?? 8000;
  const url = `http://${host}:${port}/`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await response.text();

    return response.ok && text.includes('<!DOCTYPE html');
  } catch {
    return false;
  }
}
