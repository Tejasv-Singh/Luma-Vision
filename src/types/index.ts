/**
 * Domain types for the Luma Vision analysis pipeline.
 *
 * These mirror the JSON contract emitted by the backend ML modules:
 *   - shot classifier        -> ShotAnalysis
 *   - court homography       -> CourtCoverage
 *   - TrackNetV3 shuttle net -> ShuttleData
 *   - pose estimator         -> PoseAnalysis
 */

export type AnalysisStatus =
  | 'pending'
  | 'uploading'
  | 'queued'
  | 'analyzing'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type ShotType = 'smash' | 'clear' | 'drop' | 'drive' | 'net' | 'serve';

export const SHOT_TYPES: readonly ShotType[] = [
  'smash',
  'clear',
  'drop',
  'drive',
  'net',
  'serve',
] as const;

export const SHOT_LABELS: Record<ShotType, string> = {
  smash: 'Smash',
  clear: 'Clear',
  drop: 'Drop',
  drive: 'Drive',
  net: 'Net Shot',
  serve: 'Serve',
};

/* -------------------------------------------------------------------------- */
/* Video + job metadata                                                        */
/* -------------------------------------------------------------------------- */

export interface VideoMetadata {
  filename: string;
  sizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  /** Playable source for the preview player (blob: URL or backend stream). */
  sourceUrl?: string;
}

export interface MatchInfo {
  title: string;
  tournament: string;
  round: string;
  playedOn: string; // ISO date
  playerA: string;
  playerB: string;
  /** Which player the analysis is scoped to. */
  focusPlayer: 'A' | 'B';
  scoreline: string;
}

export interface AnalysisJob {
  videoId: string;
  status: AnalysisStatus;
  /** 0-100. Upload progress while uploading, pipeline progress while analyzing. */
  progress: number;
  stage: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  video: VideoMetadata;
  match: MatchInfo;
}

/* -------------------------------------------------------------------------- */
/* Tab 1 - Overview                                                            */
/* -------------------------------------------------------------------------- */

export interface OverviewMetrics {
  totalShots: number;
  averageRallyDurationSeconds: number;
  longestRallySeconds: number;
  courtCoveragePercent: number;
  accuracyPercent: number;
  totalRallies: number;
  matchDurationSeconds: number;
  activePlaySeconds: number;
}

export interface MatchStatistics {
  pointsWon: number;
  pointsLost: number;
  unforcedErrors: number;
  forcedErrors: number;
  winningShots: number;
  recoveryShots: number;
  netKills: number;
  faults: number;
  longestStreak: number;
  distanceCoveredMeters: number;
}

export interface OverviewData {
  metrics: OverviewMetrics;
  statistics: MatchStatistics;
  /** Short generated narrative shown in the performance summary panel. */
  summary: string;
  highlights: string[];
}

/* -------------------------------------------------------------------------- */
/* Tab 2 - Shot analysis                                                       */
/* -------------------------------------------------------------------------- */

export interface ShotBreakdown {
  type: ShotType;
  count: number;
  successRate: number; // 0-100
  averageSpeedKmh: number;
  winners: number;
  errors: number;
}

export interface ShotAnalysis {
  breakdown: ShotBreakdown[];
  totalShots: number;
  mostUsed: ShotType;
  mostEffective: ShotType;
  consistencyScore: number; // 0-100
  consistencyTips: string[];
}

/* -------------------------------------------------------------------------- */
/* Tab 3 - Court coverage                                                      */
/* -------------------------------------------------------------------------- */

export type ZoneIntensity = 'low' | 'medium' | 'high';

export interface CourtZone {
  /** 0-15, row-major over a 4x4 grid; index 0 is the far-left backcourt cell. */
  id: number;
  row: number; // 0 = backcourt .. 3 = frontcourt
  col: number; // 0 = left .. 3 = right
  label: string;
  /** Share of total time spent in this zone, 0-100. */
  usagePercent: number;
  visits: number;
  averageDwellSeconds: number;
  shotsPlayed: number;
  intensity: ZoneIntensity;
}

export interface TrajectoryPoint {
  /** Normalised court coordinates, 0-1. x: left to right, y: back to front. */
  x: number;
  y: number;
  t: number; // seconds into the match
}

export interface CourtCoverage {
  zones: CourtZone[];
  frontcourtPercent: number;
  midcourtPercent: number;
  backcourtPercent: number;
  totalDistanceMeters: number;
  averageSpeedMps: number;
  trajectory: TrajectoryPoint[];
}

/* -------------------------------------------------------------------------- */
/* Tab 4 - Shuttle data                                                        */
/* -------------------------------------------------------------------------- */

export interface VelocitySample {
  t: number; // seconds
  velocity: number; // km/h
  height: number; // metres above court
}

export interface ShuttleData {
  peakVelocityKmh: number;
  averageVelocityKmh: number;
  averageHeightMeters: number;
  maxHeightMeters: number;
  averageSpinRpm: number;
  averageFlightTimeSeconds: number;
  longestFlightSeconds: number;
  netClearanceCm: number;
  landingAccuracyPercent: number;
  /** TrackNetV3 mean detection confidence, 0-100. */
  detectionConfidence: number;
  framesTracked: number;
  framesMissed: number;
  velocitySeries: VelocitySample[];
}

/* -------------------------------------------------------------------------- */
/* Tab 5 - Player pose                                                         */
/* -------------------------------------------------------------------------- */

export interface PoseAnalysis {
  forehandCount: number;
  backhandCount: number;
  forehandAccuracy: number; // 0-100
  backhandAccuracy: number; // 0-100
  stanceStability: number; // 0-100
  followThroughQuality: number; // 0-100
  averageReactionMs: number;
  fastestReactionMs: number;
  averageRecoveryMs: number;
  keypointConfidence: number; // 0-100
  footworkRating: number; // 1-100
  notes: string[];
}

/* -------------------------------------------------------------------------- */
/* Timeline + aggregate                                                        */
/* -------------------------------------------------------------------------- */

export type TimelineEventKind = 'shot' | 'rally-start' | 'rally-end' | 'point' | 'fault';

export interface TimelineEvent {
  id: string;
  t: number; // seconds into video
  kind: TimelineEventKind;
  shotType?: ShotType;
  label: string;
  won?: boolean;
  /** Normalised on-frame position of the event marker, 0-1. */
  position?: { x: number; y: number };
}

export interface AnalysisResult {
  videoId: string;
  job: AnalysisJob;
  overview: OverviewData;
  shots: ShotAnalysis;
  coverage: CourtCoverage;
  shuttle: ShuttleData;
  pose: PoseAnalysis;
  timeline: TimelineEvent[];
}

/** Lightweight row used by history, search and compare views. */
export interface AnalysisSummary {
  videoId: string;
  title: string;
  tournament: string;
  playedOn: string;
  createdAt: string;
  status: AnalysisStatus;
  durationSeconds: number;
  totalShots: number;
  accuracyPercent: number;
  coveragePercent: number;
  thumbnailHue: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  country: string;
  worldRank: number;
  handedness: 'Right' | 'Left';
  matchesAnalyzed: number;
  averageAccuracy: number;
  averageCoverage: number;
  signatureShot: ShotType;
}

/* -------------------------------------------------------------------------- */
/* API envelopes                                                               */
/* -------------------------------------------------------------------------- */

export interface UploadResponse {
  videoId: string;
  status: AnalysisStatus;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}
