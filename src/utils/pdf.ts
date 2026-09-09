import { SHOT_LABELS, type AnalysisResult } from '@/types';
import { formatBytes, formatDate, formatDurationLong, formatNumber } from './format';

/**
 * Builds a structured PDF report from an analysis result.
 *
 * This composes the document from real text rather than rasterising the DOM:
 * the output stays selectable, searchable and a fraction of the size, and it
 * does not depend on the screenshot library reproducing the dark theme's
 * gradients and backdrop filters correctly.
 *
 * jsPDF is imported dynamically so it never lands in the initial bundle.
 */
export async function exportAnalysisPdf(analysis: AnalysisResult): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 48; // page margin
  const NAVY = [10, 14, 39] as const;
  const GOLD = [255, 193, 7] as const;
  const INK = [60, 66, 96] as const;

  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - M) {
      doc.addPage();
      y = M;
    }
  };

  const heading = (text: string) => {
    ensureSpace(40);
    y += 14;
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...NAVY);
    doc.text(text.toUpperCase(), M, y);
    y += 6;
    doc.setDrawColor(...GOLD).setLineWidth(1.4);
    doc.line(M, y, M + 42, y);
    y += 14;
  };

  /** Two-column key/value rows, wrapped into `columns` groups per line. */
  const rows = (entries: [string, string][], columns = 2) => {
    const colWidth = (PAGE_W - M * 2) / columns;
    for (let i = 0; i < entries.length; i += columns) {
      ensureSpace(30);
      for (let c = 0; c < columns; c += 1) {
        const entry = entries[i + c];
        if (!entry) continue;
        const x = M + c * colWidth;
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...INK);
        doc.text(entry[0].toUpperCase(), x, y);
        doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...NAVY);
        doc.text(entry[1], x, y + 15);
      }
      y += 32;
    }
  };

  const paragraph = (text: string) => {
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...INK);
    const lines = doc.splitTextToSize(text, PAGE_W - M * 2) as string[];
    ensureSpace(lines.length * 13 + 8);
    doc.text(lines, M, y);
    y += lines.length * 13 + 6;
  };

  /* -- Cover banner ------------------------------------------------------ */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 108, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 104, PAGE_W, 4, 'F');

  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(255, 255, 255);
  doc.text('Luma Vision', M, 46);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GOLD);
  doc.text('Badminton Match Analysis Report', M, 64);

  doc.setFontSize(8).setTextColor(200, 205, 235);
  doc.text(`Generated ${new Date().toLocaleString('en-US')}`, PAGE_W - M, 46, { align: 'right' });
  doc.text(`Analysis ID ${analysis.videoId}`, PAGE_W - M, 60, { align: 'right' });

  y = 140;

  /* -- Match ------------------------------------------------------------- */
  const { match, video } = analysis.job;
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...NAVY);
  doc.text(match.title, M, y);
  y += 18;
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...INK);
  doc.text(
    `${match.tournament} · ${match.round} · ${formatDate(match.playedOn)} · ${match.scoreline}`,
    M,
    y,
  );
  y += 10;

  /* -- Overview ---------------------------------------------------------- */
  const { metrics, statistics, summary } = analysis.overview;
  heading('Key metrics');
  rows(
    [
      ['Total shots', formatNumber(metrics.totalShots)],
      ['Avg rally duration', `${metrics.averageRallyDurationSeconds.toFixed(1)} s`],
      ['Court coverage', `${metrics.courtCoveragePercent.toFixed(1)}%`],
      ['Shot accuracy', `${metrics.accuracyPercent.toFixed(1)}%`],
      ['Rallies', formatNumber(metrics.totalRallies)],
      ['Longest rally', `${metrics.longestRallySeconds.toFixed(1)} s`],
      ['Match duration', formatDurationLong(metrics.matchDurationSeconds)],
      ['Active play', formatDurationLong(metrics.activePlaySeconds)],
    ],
    4,
  );

  heading('Performance summary');
  paragraph(summary);

  heading('Match statistics');
  rows(
    [
      ['Points won', String(statistics.pointsWon)],
      ['Points lost', String(statistics.pointsLost)],
      ['Unforced errors', String(statistics.unforcedErrors)],
      ['Forced errors', String(statistics.forcedErrors)],
      ['Winning shots', String(statistics.winningShots)],
      ['Recovery shots', String(statistics.recoveryShots)],
      ['Net kills', String(statistics.netKills)],
      ['Faults', String(statistics.faults)],
      ['Longest streak', String(statistics.longestStreak)],
      ['Distance covered', `${formatNumber(statistics.distanceCoveredMeters)} m`],
    ],
    4,
  );

  /* -- Shots (tabular) --------------------------------------------------- */
  heading('Shot breakdown');
  const colX = [M, M + 150, M + 230, M + 320, M + 400, M + 470];
  ensureSpace(30);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...INK);
  ['Shot type', 'Count', 'Success', 'Avg speed', 'Winners', 'Errors'].forEach((label, i) => {
    doc.text(label.toUpperCase(), colX[i]!, y);
  });
  y += 6;
  doc.setDrawColor(210, 214, 232).setLineWidth(0.6);
  doc.line(M, y, PAGE_W - M, y);
  y += 14;

  for (const shot of analysis.shots.breakdown) {
    ensureSpace(20);
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...NAVY);
    const cells = [
      SHOT_LABELS[shot.type],
      formatNumber(shot.count),
      `${shot.successRate.toFixed(1)}%`,
      `${shot.averageSpeedKmh} km/h`,
      String(shot.winners),
      String(shot.errors),
    ];
    cells.forEach((cell, i) => doc.text(cell, colX[i]!, y));
    y += 17;
  }

  y += 4;
  paragraph(
    `Most used: ${SHOT_LABELS[analysis.shots.mostUsed]}. Most effective: ${SHOT_LABELS[analysis.shots.mostEffective]}. Consistency score: ${analysis.shots.consistencyScore}/100.`,
  );

  /* -- Coverage ---------------------------------------------------------- */
  const { coverage } = analysis;
  heading('Court coverage');
  rows(
    [
      ['Frontcourt', `${coverage.frontcourtPercent.toFixed(1)}%`],
      ['Midcourt', `${coverage.midcourtPercent.toFixed(1)}%`],
      ['Backcourt', `${coverage.backcourtPercent.toFixed(1)}%`],
      ['Avg speed', `${coverage.averageSpeedMps.toFixed(2)} m/s`],
    ],
    4,
  );

  const topZones = [...coverage.zones].sort((a, b) => b.usagePercent - a.usagePercent).slice(0, 5);
  paragraph(
    `Most-occupied zones: ${topZones.map((z) => `${z.label} (${z.usagePercent.toFixed(1)}%)`).join(', ')}.`,
  );

  /* -- Shuttle ----------------------------------------------------------- */
  const { shuttle } = analysis;
  heading('Shuttle tracking');
  rows(
    [
      ['Peak velocity', `${formatNumber(shuttle.peakVelocityKmh)} km/h`],
      ['Average velocity', `${formatNumber(shuttle.averageVelocityKmh)} km/h`],
      ['Avg flight time', `${shuttle.averageFlightTimeSeconds.toFixed(2)} s`],
      ['Net clearance', `${formatNumber(shuttle.netClearanceCm)} cm`],
      ['Landing accuracy', `${shuttle.landingAccuracyPercent.toFixed(1)}%`],
      ['Avg spin', `${formatNumber(shuttle.averageSpinRpm)} rpm`],
      ['Max height', `${shuttle.maxHeightMeters.toFixed(2)} m`],
      ['Detection confidence', `${shuttle.detectionConfidence.toFixed(1)}%`],
    ],
    4,
  );

  /* -- Pose -------------------------------------------------------------- */
  const { pose } = analysis;
  heading('Player pose');
  rows(
    [
      ['Forehand shots', formatNumber(pose.forehandCount)],
      ['Backhand shots', formatNumber(pose.backhandCount)],
      ['Forehand accuracy', `${pose.forehandAccuracy.toFixed(1)}%`],
      ['Backhand accuracy', `${pose.backhandAccuracy.toFixed(1)}%`],
      ['Stance stability', `${pose.stanceStability.toFixed(1)}%`],
      ['Follow-through', `${pose.followThroughQuality.toFixed(1)}%`],
      ['Avg reaction', `${formatNumber(pose.averageReactionMs)} ms`],
      ['Avg recovery', `${formatNumber(pose.averageRecoveryMs)} ms`],
      ['Footwork rating', `${pose.footworkRating}/100`],
      ['Keypoint confidence', `${pose.keypointConfidence.toFixed(1)}%`],
    ],
    4,
  );

  for (const note of pose.notes) paragraph(`• ${note}`);

  /* -- Source ------------------------------------------------------------ */
  heading('Source video');
  rows([
    ['File', video.filename],
    ['Duration', formatDurationLong(video.durationSeconds)],
    ['Resolution', `${video.width} × ${video.height} @ ${video.fps} fps`],
    ['Size', formatBytes(video.sizeBytes)],
  ]);

  /* -- Footers ----------------------------------------------------------- */
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(140, 146, 175);
    doc.text('Generated by Luma Vision · AI-assisted analysis, review against video before coaching decisions.', M, PAGE_H - 24);
    doc.text(`${page} / ${pageCount}`, PAGE_W - M, PAGE_H - 24, { align: 'right' });
  }

  const safeTitle = match.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  doc.save(`luma-vision-${safeTitle || analysis.videoId}.pdf`);
}
