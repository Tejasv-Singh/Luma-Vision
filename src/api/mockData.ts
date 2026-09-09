/**
 * Deterministic mock data for the Luma Vision pipeline.
 *
 * Every payload is derived from a seeded PRNG keyed on the videoId, so a given
 * match always produces the same numbers across reloads, tabs and the compare
 * view — which is what makes the mock usable for UI review and screenshots.
 *
 * Values are kept inside physically plausible BWF ranges (smash speeds ~300
 * km/h peak, rally lengths 5-9 s, court coverage in metres) so charts have
 * believable shape without needing the real backend.
 */

import {
  SHOT_TYPES,
  SHOT_LABELS,
  type AnalysisJob,
  type AnalysisResult,
  type AnalysisSummary,
  type CourtCoverage,
  type CourtZone,
  type MatchInfo,
  type OverviewData,
  type PlayerProfile,
  type PoseAnalysis,
  type ShotAnalysis,
  type ShotBreakdown,
  type ShotType,
  type ShuttleData,
  type TimelineEvent,
  type TrajectoryPoint,
  type VelocitySample,
  type VideoMetadata,
  type ZoneIntensity,
} from '@/types';

/* -------------------------------------------------------------------------- */
/* Seeded PRNG (mulberry32)                                                    */
/* -------------------------------------------------------------------------- */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rng {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
}

function makeRng(seedKey: string): Rng {
  const next = mulberry32(hashSeed(seedKey));
  const range = (min: number, max: number) => min + next() * (max - min);
  const int = (min: number, max: number) => Math.floor(range(min, max + 1));
  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)] as T;
  return { next, range, int, pick };
}

const round = (value: number, decimals = 1): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/* -------------------------------------------------------------------------- */
/* Reference match fixtures                                                    */
/* -------------------------------------------------------------------------- */

const PLAYERS = [
  { name: 'Viktor Axelsen', country: 'DEN' },
  { name: 'Kunlavut Vitidsarn', country: 'THA' },
  { name: 'Anders Antonsen', country: 'DEN' },
  { name: 'Shi Yu Qi', country: 'CHN' },
  { name: 'Jonatan Christie', country: 'INA' },
  { name: 'Lee Zii Jia', country: 'MAS' },
  { name: 'Loh Kean Yew', country: 'SGP' },
  { name: 'Kodai Naraoka', country: 'JPN' },
] as const;

const TOURNAMENTS = [
  'BWF World Championships',
  'All England Open',
  'Indonesia Open',
  'Malaysia Masters',
  'Denmark Open',
  'BWF World Tour Finals',
] as const;

const ROUNDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'] as const;

const ZONE_ROW_LABELS = ['Backcourt', 'Rear-mid', 'Fore-mid', 'Frontcourt'] as const;
const ZONE_COL_LABELS = ['Far left', 'Left-centre', 'Right-centre', 'Far right'] as const;

/* -------------------------------------------------------------------------- */
/* Builders                                                                    */
/* -------------------------------------------------------------------------- */

function buildMatchInfo(rng: Rng, filename?: string): MatchInfo {
  const a = rng.int(0, PLAYERS.length - 1);
  let b = rng.int(0, PLAYERS.length - 1);
  if (b === a) b = (b + 1) % PLAYERS.length;

  const playerA = PLAYERS[a]!.name;
  const playerB = PLAYERS[b]!.name;
  const tournament = rng.pick(TOURNAMENTS);
  const round_ = rng.pick(ROUNDS);

  const daysAgo = rng.int(2, 420);
  const playedOn = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

  const games = rng.next() > 0.45 ? 3 : 2;
  const scoreline =
    games === 3
      ? `21-${rng.int(12, 19)}, ${rng.int(14, 19)}-21, 21-${rng.int(15, 19)}`
      : `21-${rng.int(11, 18)}, 21-${rng.int(13, 19)}`;

  const derivedTitle = filename
    ? filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
    : '';

  return {
    title: derivedTitle.length > 2 ? derivedTitle : `${playerA} vs ${playerB}`,
    tournament,
    round: round_,
    playedOn,
    playerA,
    playerB,
    focusPlayer: 'A',
    scoreline,
  };
}

function buildVideoMetadata(rng: Rng, overrides?: Partial<VideoMetadata>): VideoMetadata {
  const durationSeconds = rng.int(48 * 60, 82 * 60);
  const fps = rng.pick([25, 30, 50, 60]);
  return {
    filename: 'match_broadcast.mp4',
    sizeBytes: Math.round(durationSeconds * rng.range(1.1, 2.4) * 1024 * 1024),
    durationSeconds,
    width: 1920,
    height: 1080,
    fps,
    codec: rng.pick(['H.264 / AVC', 'H.265 / HEVC', 'VP9']),
    ...overrides,
  };
}

function buildOverview(rng: Rng, video: VideoMetadata): OverviewData {
  const totalRallies = rng.int(62, 118);
  const averageRallyDurationSeconds = round(rng.range(5.2, 9.4), 1);
  const activePlaySeconds = Math.round(totalRallies * averageRallyDurationSeconds);
  const totalShots = Math.round(totalRallies * rng.range(7.5, 12.5));

  const pointsWon = rng.int(38, 46);
  const pointsLost = rng.int(30, 44);
  const unforcedErrors = rng.int(9, 22);
  const forcedErrors = rng.int(6, 16);
  const winningShots = rng.int(22, 38);

  const accuracyPercent = round(rng.range(68, 89), 1);
  const courtCoveragePercent = round(rng.range(64, 87), 1);

  const summary =
    accuracyPercent >= 80
      ? 'Consistently high shot accuracy with strong backcourt control. Rally construction favours attacking clears into the rear corners before finishing at the net. Error rate stays low even in extended rallies.'
      : accuracyPercent >= 74
        ? 'Solid all-round performance with dependable length. Accuracy dips slightly in rallies beyond 12 shots, where recovery to base is a fraction slow. Attacking opportunities are converted at a good rate.'
        : 'Aggressive shot selection driving both winners and errors. Length control is inconsistent under pressure, and defensive lifts sit short of the rear service line more often than ideal.';

  return {
    metrics: {
      totalShots,
      averageRallyDurationSeconds,
      longestRallySeconds: round(averageRallyDurationSeconds * rng.range(3.2, 5.1), 1),
      courtCoveragePercent,
      accuracyPercent,
      totalRallies,
      matchDurationSeconds: video.durationSeconds,
      activePlaySeconds,
    },
    statistics: {
      pointsWon,
      pointsLost,
      unforcedErrors,
      forcedErrors,
      winningShots,
      recoveryShots: rng.int(48, 96),
      netKills: rng.int(8, 21),
      faults: rng.int(1, 7),
      longestStreak: rng.int(4, 11),
      distanceCoveredMeters: round(rng.range(3800, 6400), 0),
    },
    summary,
    highlights: [
      `${winningShots} winning shots across ${totalRallies} rallies`,
      `Longest streak of ${rng.int(4, 11)} consecutive points`,
      `${round(rng.range(58, 78), 0)}% of points finished inside 9 shots`,
      `Net play converted at ${round(rng.range(62, 84), 0)}%`,
    ],
  };
}

function buildShots(rng: Rng, totalShots: number): ShotAnalysis {
  // Distribution weights reflect typical singles shot mix.
  const weights: Record<ShotType, number> = {
    clear: rng.range(0.2, 0.26),
    smash: rng.range(0.15, 0.22),
    drop: rng.range(0.13, 0.19),
    drive: rng.range(0.12, 0.18),
    net: rng.range(0.14, 0.2),
    serve: rng.range(0.07, 0.1),
  };
  const weightSum = SHOT_TYPES.reduce((sum, t) => sum + weights[t], 0);

  const speedRanges: Record<ShotType, [number, number]> = {
    smash: [240, 332],
    clear: [110, 160],
    drop: [55, 95],
    drive: [130, 195],
    net: [30, 62],
    serve: [45, 88],
  };

  const breakdown: ShotBreakdown[] = SHOT_TYPES.map((type) => {
    const count = Math.max(4, Math.round((weights[type] / weightSum) * totalShots));
    const successRate = round(rng.range(62, 93), 1);
    const winners = Math.round(count * rng.range(0.04, type === 'smash' ? 0.26 : 0.12));
    const errors = Math.round(count * rng.range(0.03, 0.14));
    const [lo, hi] = speedRanges[type];
    return {
      type,
      count,
      successRate,
      averageSpeedKmh: round(rng.range(lo, hi), 0),
      winners,
      errors,
    };
  });

  const mostUsed = breakdown.reduce((a, b) => (b.count > a.count ? b : a));
  const mostEffective = breakdown.reduce((a, b) => (b.successRate > a.successRate ? b : a));
  const consistencyScore = round(rng.range(58, 92), 0);

  const tipPool = [
    `Your ${SHOT_LABELS[mostUsed.type].toLowerCase()} carries ${Math.round(
      (mostUsed.count / totalShots) * 100,
    )}% of your shot volume — mixing in more deception would make it harder to read.`,
    `${SHOT_LABELS[mostEffective.type]} is your highest-percentage shot at ${mostEffective.successRate}%. Look for earlier openings to play it.`,
    'Error clusters appear in rallies past the 12-shot mark; a deeper defensive lift buys recovery time.',
    'Contact point on the backhand side drops below shoulder height on 1 in 4 shots, costing angle options.',
    'Follow-through shortens noticeably in the third game — a conditioning rather than technique signal.',
  ];

  return {
    breakdown,
    totalShots: breakdown.reduce((sum, s) => sum + s.count, 0),
    mostUsed: mostUsed.type,
    mostEffective: mostEffective.type,
    consistencyScore,
    consistencyTips: [tipPool[0]!, tipPool[1]!, rng.pick(tipPool.slice(2))],
  };
}

function intensityFor(usagePercent: number): ZoneIntensity {
  if (usagePercent >= 8.5) return 'high';
  if (usagePercent >= 4.5) return 'medium';
  return 'low';
}

function buildCoverage(rng: Rng, distanceMeters: number): CourtCoverage {
  // Raw weights: players spend most time mid-court and centre-court.
  const raw: number[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const rowBias = [0.85, 1.25, 1.15, 0.7][row]!;
      const colBias = [0.7, 1.3, 1.3, 0.7][col]!;
      raw.push(rowBias * colBias * rng.range(0.7, 1.35));
    }
  }
  const total = raw.reduce((a, b) => a + b, 0);

  const zones: CourtZone[] = raw.map((weight, id) => {
    const row = Math.floor(id / 4);
    const col = id % 4;
    const usagePercent = round((weight / total) * 100, 1);
    return {
      id,
      row,
      col,
      label: `${ZONE_ROW_LABELS[row]} · ${ZONE_COL_LABELS[col]}`,
      usagePercent,
      visits: Math.round(usagePercent * rng.range(3.5, 7.5)),
      averageDwellSeconds: round(rng.range(0.6, 2.6), 1),
      shotsPlayed: Math.round(usagePercent * rng.range(4, 9)),
      intensity: intensityFor(usagePercent),
    };
  });

  const sumRows = (rows: number[]) =>
    round(
      zones.filter((z) => rows.includes(z.row)).reduce((sum, z) => sum + z.usagePercent, 0),
      1,
    );

  // Movement trace: a smoothed random walk biased back toward court centre,
  // which is what a real base-recovery pattern looks like from above.
  const trajectory: TrajectoryPoint[] = [];
  let x = 0.5;
  let y = 0.5;
  for (let i = 0; i < 220; i += 1) {
    const pullToBase = 0.12;
    x += (0.5 - x) * pullToBase + rng.range(-0.14, 0.14);
    y += (0.5 - y) * pullToBase + rng.range(-0.16, 0.16);
    x = Math.min(0.96, Math.max(0.04, x));
    y = Math.min(0.96, Math.max(0.04, y));
    trajectory.push({ x: round(x, 3), y: round(y, 3), t: round(i * 1.8, 1) });
  }

  return {
    zones,
    backcourtPercent: sumRows([0]),
    midcourtPercent: sumRows([1, 2]),
    frontcourtPercent: sumRows([3]),
    totalDistanceMeters: distanceMeters,
    averageSpeedMps: round(rng.range(1.9, 3.4), 2),
    trajectory,
  };
}

function buildShuttle(rng: Rng, durationSeconds: number): ShuttleData {
  const peakVelocityKmh = round(rng.range(272, 336), 0);
  const averageVelocityKmh = round(rng.range(96, 148), 0);

  const framesTracked = Math.round(durationSeconds * rng.range(24, 58));
  const framesMissed = Math.round(framesTracked * rng.range(0.012, 0.058));

  // Sample every ~30 s of match time; each point is a rally-window average.
  const sampleCount = 48;
  const step = durationSeconds / sampleCount;
  const velocitySeries: VelocitySample[] = [];
  let drift = averageVelocityKmh;
  for (let i = 0; i < sampleCount; i += 1) {
    drift += rng.range(-16, 16);
    drift = Math.min(peakVelocityKmh * 0.94, Math.max(58, drift));
    const spike = rng.next() > 0.86 ? rng.range(40, 92) : 0;
    velocitySeries.push({
      t: round(i * step, 0),
      velocity: round(Math.min(peakVelocityKmh, drift + spike), 0),
      height: round(rng.range(1.4, 6.8), 2),
    });
  }

  return {
    peakVelocityKmh,
    averageVelocityKmh,
    averageHeightMeters: round(rng.range(2.6, 4.4), 2),
    maxHeightMeters: round(rng.range(6.8, 9.6), 2),
    averageSpinRpm: round(rng.range(1200, 2600), 0),
    averageFlightTimeSeconds: round(rng.range(0.42, 0.95), 2),
    longestFlightSeconds: round(rng.range(1.6, 2.8), 2),
    netClearanceCm: round(rng.range(18, 62), 0),
    landingAccuracyPercent: round(rng.range(71, 93), 1),
    detectionConfidence: round(rng.range(88.5, 98.4), 1),
    framesTracked,
    framesMissed,
    velocitySeries,
  };
}

function buildPose(rng: Rng, totalShots: number): PoseAnalysis {
  const forehandShare = rng.range(0.58, 0.72);
  const forehandCount = Math.round(totalShots * forehandShare);
  const backhandCount = totalShots - forehandCount;
  const forehandAccuracy = round(rng.range(74, 92), 1);
  const backhandAccuracy = round(forehandAccuracy - rng.range(4, 16), 1);
  const footworkRating = Math.round(rng.range(62, 94));

  const notes = [
    `Backhand accuracy trails the forehand by ${round(forehandAccuracy - backhandAccuracy, 1)} points — the largest single gap in the pose model.`,
    'Split-step timing is consistent early but arrives late on roughly 18% of rear-court retrievals.',
    'Racket-arm elevation at contact stays above shoulder on smashes, indicating good overhead mechanics.',
    footworkRating >= 80
      ? 'Chassé recovery to base is efficient, with minimal wasted steps between shots.'
      : 'Recovery footwork adds an extra adjustment step on lateral movement, costing roughly 0.2 s per exchange.',
  ];

  return {
    forehandCount,
    backhandCount,
    forehandAccuracy,
    backhandAccuracy,
    stanceStability: round(rng.range(66, 94), 1),
    followThroughQuality: round(rng.range(64, 93), 1),
    averageReactionMs: Math.round(rng.range(198, 312)),
    fastestReactionMs: Math.round(rng.range(132, 190)),
    averageRecoveryMs: Math.round(rng.range(540, 940)),
    keypointConfidence: round(rng.range(87, 97.5), 1),
    footworkRating,
    notes,
  };
}

function buildTimeline(rng: Rng, durationSeconds: number, totalRallies: number): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const rallyGap = durationSeconds / totalRallies;

  for (let r = 0; r < totalRallies; r += 1) {
    const start = r * rallyGap + rng.range(0, rallyGap * 0.25);
    const shotsInRally = rng.int(3, 14);
    const rallyLength = Math.min(rallyGap * 0.8, shotsInRally * rng.range(0.7, 1.2));

    events.push({
      id: `r${r}-start`,
      t: round(start, 1),
      kind: 'rally-start',
      label: `Rally ${r + 1} start`,
    });

    for (let s = 0; s < shotsInRally; s += 1) {
      const shotType = rng.pick(SHOT_TYPES);
      events.push({
        id: `r${r}-s${s}`,
        t: round(start + (rallyLength / shotsInRally) * s, 1),
        kind: 'shot',
        shotType,
        label: SHOT_LABELS[shotType],
        position: { x: round(rng.range(0.15, 0.85), 3), y: round(rng.range(0.2, 0.8), 3) },
      });
    }

    const won = rng.next() > 0.48;
    events.push({
      id: `r${r}-end`,
      t: round(start + rallyLength, 1),
      kind: rng.next() > 0.9 ? 'fault' : 'point',
      label: won ? 'Point won' : 'Point lost',
      won,
    });
  }

  return events.sort((a, b) => a.t - b.t);
}

/* -------------------------------------------------------------------------- */
/* Public factory                                                              */
/* -------------------------------------------------------------------------- */

export interface MockAnalysisOptions {
  filename?: string;
  sizeBytes?: number;
  sourceUrl?: string;
  createdAt?: string;
}

export function buildMockJob(videoId: string, options: MockAnalysisOptions = {}): AnalysisJob {
  const rng = makeRng(videoId);
  const match = buildMatchInfo(rng, options.filename);
  const video = buildVideoMetadata(rng, {
    ...(options.filename ? { filename: options.filename } : {}),
    ...(options.sizeBytes ? { sizeBytes: options.sizeBytes } : {}),
    ...(options.sourceUrl ? { sourceUrl: options.sourceUrl } : {}),
  });

  return {
    videoId,
    status: 'complete',
    progress: 100,
    stage: 'Analysis complete',
    createdAt: options.createdAt ?? new Date(Date.now() - rng.int(1, 240) * 60_000).toISOString(),
    completedAt: new Date().toISOString(),
    video,
    match,
  };
}

export function buildMockAnalysis(
  videoId: string,
  options: MockAnalysisOptions = {},
): AnalysisResult {
  const job = buildMockJob(videoId, options);
  // Each module gets its own RNG stream so adding a field to one payload does
  // not shift the numbers in the others.
  const overview = buildOverview(makeRng(`${videoId}:overview`), job.video);
  const shots = buildShots(makeRng(`${videoId}:shots`), overview.metrics.totalShots);
  const coverage = buildCoverage(
    makeRng(`${videoId}:coverage`),
    overview.statistics.distanceCoveredMeters,
  );
  const shuttle = buildShuttle(makeRng(`${videoId}:shuttle`), job.video.durationSeconds);
  const pose = buildPose(makeRng(`${videoId}:pose`), shots.totalShots);
  const timeline = buildTimeline(
    makeRng(`${videoId}:timeline`),
    job.video.durationSeconds,
    overview.metrics.totalRallies,
  );

  return { videoId, job, overview, shots, coverage, shuttle, pose, timeline };
}

export function toSummary(result: AnalysisResult): AnalysisSummary {
  const { job, overview } = result;
  return {
    videoId: result.videoId,
    title: job.match.title,
    tournament: job.match.tournament,
    playedOn: job.match.playedOn,
    createdAt: job.createdAt,
    status: job.status,
    durationSeconds: job.video.durationSeconds,
    totalShots: overview.metrics.totalShots,
    accuracyPercent: overview.metrics.accuracyPercent,
    coveragePercent: overview.metrics.courtCoveragePercent,
    thumbnailHue: hashSeed(result.videoId) % 360,
  };
}

/** Seed analyses that make history, search and compare useful on first load. */
export const SEEDED_VIDEO_IDS = [
  'lv_axelsen_final_2024',
  'lv_vitidsarn_semi_2024',
  'lv_antonsen_qf_2024',
  'lv_shiyuqi_r16_2023',
  'lv_christie_final_2023',
  'lv_leezijia_semi_2023',
] as const;

export function buildSeedLibrary(): AnalysisResult[] {
  return SEEDED_VIDEO_IDS.map((id, index) =>
    buildMockAnalysis(id, {
      filename: `${id}.mp4`,
      createdAt: new Date(Date.now() - (index + 1) * 36 * 3600_000).toISOString(),
    }),
  );
}

export function buildMockProfile(results: AnalysisResult[]): PlayerProfile {
  const rng = makeRng('luma-profile');
  const count = Math.max(1, results.length);
  const avg = (fn: (r: AnalysisResult) => number) =>
    round(results.reduce((sum, r) => sum + fn(r), 0) / count, 1);

  const shotTally = new Map<ShotType, number>();
  for (const r of results) {
    for (const b of r.shots.breakdown) {
      shotTally.set(b.type, (shotTally.get(b.type) ?? 0) + b.count);
    }
  }
  const signatureShot =
    [...shotTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ('smash' as ShotType);

  return {
    id: 'player_focus',
    name: results[0]?.job.match.playerA ?? 'Focus Player',
    country: rng.pick(PLAYERS).country,
    worldRank: rng.int(1, 24),
    handedness: rng.next() > 0.2 ? 'Right' : 'Left',
    matchesAnalyzed: results.length,
    averageAccuracy: avg((r) => r.overview.metrics.accuracyPercent),
    averageCoverage: avg((r) => r.overview.metrics.courtCoveragePercent),
    signatureShot,
  };
}
