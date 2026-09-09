/**
 * Runtime configuration read from Vite env vars.
 *
 * Everything is parsed once at module load with safe fallbacks so a missing or
 * malformed `.env` degrades to sensible defaults rather than crashing the app.
 */

function readString(key: string, fallback: string): string {
  const raw = import.meta.env[key as keyof ImportMetaEnv];
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback;
}

function readNumber(key: string, fallback: number): number {
  const parsed = Number(import.meta.env[key as keyof ImportMetaEnv]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = import.meta.env[key as keyof ImportMetaEnv];
  if (raw === undefined || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true';
}

export const config = {
  apiBaseUrl: readString('VITE_API_BASE_URL', '/api'),
  useMockApi: readBoolean('VITE_USE_MOCK_API', true),
  mockLatencyMs: readNumber('VITE_MOCK_LATENCY', 650),
  mockAnalysisSeconds: readNumber('VITE_MOCK_ANALYSIS_SECONDS', 12),
  maxUploadBytes: readNumber('VITE_MAX_UPLOAD_MB', 2048) * 1024 * 1024,
  apiTimeoutMs: readNumber('VITE_API_TIMEOUT', 30_000),
} as const;

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/avi',
  'video/webm',
] as const;

export const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm'] as const;

/**
 * Browsers report AVI inconsistently (and sometimes as an empty string for
 * files dragged from certain file managers), so extension is the tiebreaker.
 */
export function isAcceptedVideo(file: File): boolean {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const mimeOk = (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.type);
  return extOk || mimeOk;
}
