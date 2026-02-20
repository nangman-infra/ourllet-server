/** 이메일별 인증코드·만료시간. 인메모리 (재시작 시 초기화) */
const store = new Map<
  string,
  { code: string; expiresAt: number }
>();

const CODE_TTL_MS = 5 * 60 * 1000; // 5분

export function setCode(email: string, code: string): void {
  const normalized = email.trim().toLowerCase();
  store.set(normalized, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

export function getAndConsumeCode(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const entry = store.get(normalized);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(normalized);
    return null;
  }
  store.delete(normalized);
  return entry.code;
}

export function getCode(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const entry = store.get(normalized);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.code;
}
