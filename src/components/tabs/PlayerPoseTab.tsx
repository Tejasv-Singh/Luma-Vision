import { Badge, MetricCard, Panel, StatTile } from '@/components/ui/Card';
import { ProgressBar, ScoreRing } from '@/components/ui/ProgressBar';
import { StrokeSplitChart } from '@/components/charts';
import { formatNumber, scoreTone } from '@/utils/format';
import { seriesColor } from '@/utils/viz';
import type { PoseAnalysis } from '@/types';

/**
 * Tab 5 — biomechanics from the pose estimator: stroke split, stance quality,
 * reaction and recovery timing, and how reliable the keypoints were.
 */
export function PlayerPoseTab({ pose }: { pose: PoseAnalysis }) {
  const totalStrokes = pose.forehandCount + pose.backhandCount;
  const forehandShare = totalStrokes > 0 ? (pose.forehandCount / totalStrokes) * 100 : 0;
  const accuracyGap = pose.forehandAccuracy - pose.backhandAccuracy;
  const footworkTone = scoreTone(pose.footworkRating);

  return (
    <div className="space-y-5">
      {/* Headline pose metrics -------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Footwork rating"
          value={pose.footworkRating}
          unit="/100"
          progress={pose.footworkRating}
          tone={footworkTone === 'positive' ? 'positive' : footworkTone === 'caution' ? 'gold' : 'caution'}
          caption="Split-step timing, recovery efficiency and step economy"
          hint="Composite of split-step timing, chassé efficiency and the number of adjustment steps per shot."
        />
        <MetricCard
          label="Stance stability"
          value={pose.stanceStability.toFixed(1)}
          unit="%"
          progress={pose.stanceStability}
          tone={pose.stanceStability >= 80 ? 'positive' : 'gold'}
          caption="Balance retained through contact"
          hint="How often the centre of mass stayed inside the base of support at the moment of racket contact."
        />
        <MetricCard
          label="Avg reaction"
          value={formatNumber(pose.averageReactionMs)}
          unit="ms"
          // Faster is better, so the track is inverted against a 400 ms ceiling.
          progress={Math.max(0, 400 - pose.averageReactionMs)}
          progressMax={400}
          tone={pose.averageReactionMs <= 240 ? 'positive' : 'gold'}
          caption={`Fastest ${formatNumber(pose.fastestReactionMs)} ms`}
          hint="Time from the opponent's racket contact to the first movement of the player's centre of mass. Lower is better."
        />
        <MetricCard
          label="Keypoint confidence"
          value={pose.keypointConfidence.toFixed(1)}
          unit="%"
          progress={pose.keypointConfidence}
          tone={pose.keypointConfidence >= 92 ? 'positive' : 'caution'}
          caption="Mean confidence across body keypoints"
          hint="Average detector confidence over the 17 tracked body keypoints. Low values usually mean occlusion or motion blur."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Forehand / backhand --------------------------------------------- */}
        <Panel
          title="Forehand vs backhand"
          subtitle="Stroke volume and accuracy by side"
          className="lg:col-span-2"
          hint="Two series, so each side keeps a fixed colour across the chart and the cards below."
        >
          <StrokeSplitChart
            forehand={{ count: pose.forehandCount, accuracy: pose.forehandAccuracy }}
            backhand={{ count: pose.backhandCount, accuracy: pose.backhandAccuracy }}
          />

          <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
            <StrokeCard
              side="Forehand"
              color={seriesColor(0)}
              count={pose.forehandCount}
              accuracy={pose.forehandAccuracy}
              share={forehandShare}
            />
            <StrokeCard
              side="Backhand"
              color={seriesColor(1)}
              count={pose.backhandCount}
              accuracy={pose.backhandAccuracy}
              share={100 - forehandShare}
            />
          </div>

          <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-ink-300">
            <span className="font-semibold text-ink-100">Accuracy gap: </span>
            {accuracyGap >= 0
              ? `the forehand is ${accuracyGap.toFixed(1)} points more accurate than the backhand.`
              : `the backhand is ${Math.abs(accuracyGap).toFixed(1)} points more accurate than the forehand — unusual, and worth checking the stroke labels against video.`}
            {Math.abs(accuracyGap) > 12 &&
              ' A gap this wide is exploitable: expect opponents to target the weaker side under pressure.'}
          </p>
        </Panel>

        {/* Technique scores ------------------------------------------------ */}
        <Panel title="Technique quality">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing
              value={pose.followThroughQuality}
              suffix="%"
              label="Follow-through"
              tone={pose.followThroughQuality >= 80 ? 'positive' : 'caution'}
            />
            <Badge tone={pose.followThroughQuality >= 80 ? 'positive' : 'caution'}>
              {pose.followThroughQuality >= 80 ? 'Consistent' : 'Variable'}
            </Badge>
          </div>

          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
            <ProgressBar
              label="Stance stability"
              value={pose.stanceStability}
              tone={pose.stanceStability >= 80 ? 'positive' : 'caution'}
              showValue
            />
            <ProgressBar
              label="Follow-through quality"
              value={pose.followThroughQuality}
              tone={pose.followThroughQuality >= 80 ? 'positive' : 'caution'}
              showValue
            />
            <ProgressBar
              label="Footwork rating"
              value={pose.footworkRating}
              tone={footworkTone === 'positive' ? 'positive' : 'caution'}
              showValue
            />
            <ProgressBar
              label="Keypoint confidence"
              value={pose.keypointConfidence}
              tone="neutral"
              showValue
            />
          </div>
        </Panel>
      </div>

      {/* Timing ------------------------------------------------------------ */}
      <Panel title="Timing" subtitle="Reaction and recovery windows measured from the pose track">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Avg reaction"
            value={`${formatNumber(pose.averageReactionMs)} ms`}
            tone={pose.averageReactionMs <= 240 ? 'positive' : 'neutral'}
          />
          <StatTile label="Fastest reaction" value={`${formatNumber(pose.fastestReactionMs)} ms`} tone="gold" />
          <StatTile
            label="Avg recovery"
            value={`${formatNumber(pose.averageRecoveryMs)} ms`}
            hint="Time from completing a shot to being re-established at base and ready for the next."
          />
          <StatTile
            label="Strokes analysed"
            value={formatNumber(totalStrokes)}
            hint="Strokes where enough keypoints were visible to classify the side and score the mechanics."
          />
        </div>

        <ul className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
          {pose.notes.map((note) => (
            <li key={note} className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-300">
              <span
                aria-hidden
                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gold-500/15 text-[9px] font-bold text-gold-500"
              >
                ↗
              </span>
              {note}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function StrokeCard({
  side,
  color,
  count,
  accuracy,
  share,
}: {
  side: string;
  color: string;
  count: number;
  accuracy: number;
  share: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold text-ink-100">{side}</span>
        <span className="ml-auto font-mono text-xs tabular-nums text-ink-400">
          {share.toFixed(0)}% of strokes
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <p className="stat-value !text-2xl">{formatNumber(count)}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-400">shots</p>
        </div>
        <div>
          <p className="stat-value !text-2xl">{accuracy.toFixed(1)}%</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-400">accuracy</p>
        </div>
      </div>
      <ProgressBar className="mt-3" value={accuracy} size="sm" tone={accuracy >= 80 ? 'positive' : 'gold'} />
    </div>
  );
}
