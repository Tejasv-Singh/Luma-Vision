import { MetricCard, Panel, StatTile, Badge } from '@/components/ui/Card';
import { ProgressBar, ScoreRing } from '@/components/ui/ProgressBar';
import { Collapsible } from '@/components/ui/Collapsible';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { VelocityChart } from '@/components/charts';
import { formatNumber, formatDuration } from '@/utils/format';
import type { ShuttleData, VelocitySample } from '@/types';

/**
 * Tab 4 — shuttlecock flight characteristics from the TrackNetV3 detector:
 * velocity, height, spin, net clearance and how confident the tracker was.
 */
export function ShuttleDataTab({ shuttle }: { shuttle: ShuttleData }) {
  const totalFrames = shuttle.framesTracked + shuttle.framesMissed;
  const trackedShare = totalFrames > 0 ? (shuttle.framesTracked / totalFrames) * 100 : 0;

  const columns: Column<VelocitySample>[] = [
    {
      key: 't',
      header: 'Match time',
      render: (row) => <span className="font-mono tabular-nums">{formatDuration(row.t)}</span>,
      sortValue: (row) => row.t,
    },
    {
      key: 'velocity',
      header: 'Velocity',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-mono tabular-nums">{row.velocity} km/h</span>
          <ProgressBar className="w-16" value={row.velocity} max={shuttle.peakVelocityKmh} size="sm" tone="gold" />
        </div>
      ),
      sortValue: (row) => row.velocity,
    },
    {
      key: 'height',
      header: 'Peak height',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="font-mono tabular-nums text-ink-300">{row.height.toFixed(2)} m</span>,
      sortValue: (row) => row.height,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Headline shuttle metrics ----------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Peak velocity"
          value={formatNumber(shuttle.peakVelocityKmh)}
          unit="km/h"
          progress={shuttle.peakVelocityKmh}
          progressMax={350}
          caption="Fastest tracked shuttle speed"
          hint="Highest instantaneous speed measured just after racket contact. The BWF record is around 565 km/h in lab conditions; in-match smashes peak near 300-350."
        />
        <MetricCard
          label="Average velocity"
          value={formatNumber(shuttle.averageVelocityKmh)}
          unit="km/h"
          progress={shuttle.averageVelocityKmh}
          progressMax={200}
          caption="Mean across all tracked flights"
          hint="Averaged over every detected shuttle flight, so it blends smashes with net shots."
        />
        <MetricCard
          label="Net clearance"
          value={formatNumber(shuttle.netClearanceCm)}
          unit="cm"
          progress={shuttle.netClearanceCm}
          progressMax={100}
          tone={shuttle.netClearanceCm < 30 ? 'positive' : 'gold'}
          caption={shuttle.netClearanceCm < 30 ? 'Tight, attacking margin' : 'Comfortable safety margin'}
          hint="Average vertical gap between the shuttle and the net tape as it crosses. Lower is more aggressive but riskier."
        />
        <MetricCard
          label="Landing accuracy"
          value={shuttle.landingAccuracyPercent.toFixed(1)}
          unit="%"
          progress={shuttle.landingAccuracyPercent}
          tone={shuttle.landingAccuracyPercent >= 85 ? 'positive' : 'gold'}
          caption="Shuttles landing in the intended zone"
          hint="Share of shots whose landing point fell inside the target zone the classifier inferred from the stroke."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Velocity over time ---------------------------------------------- */}
        <Panel
          title="Shuttle velocity over time"
          subtitle="Rally-window averages across the match"
          className="lg:col-span-2"
          hint="Each point averages shuttle speed over a rally window. The horizontal rule marks the match average."
        >
          <VelocityChart samples={shuttle.velocitySeries} average={shuttle.averageVelocityKmh} />
        </Panel>

        {/* Detection confidence -------------------------------------------- */}
        <Panel
          title="TrackNetV3 detection"
          hint="Mean per-frame confidence from the shuttle detection network. Below ~85% the derived velocity and trajectory figures should be treated as indicative."
        >
          <div className="flex flex-col items-center gap-3">
            <ScoreRing
              value={shuttle.detectionConfidence}
              suffix="%"
              label="Confidence"
              tone={shuttle.detectionConfidence >= 92 ? 'positive' : 'caution'}
            />
            <Badge tone={shuttle.detectionConfidence >= 92 ? 'positive' : 'caution'}>
              {shuttle.detectionConfidence >= 92 ? 'High confidence' : 'Moderate confidence'}
            </Badge>
          </div>

          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
            <ProgressBar
              label="Frames with a detection"
              value={trackedShare}
              tone={trackedShare >= 95 ? 'positive' : 'caution'}
              showValue
            />
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Tracked" value={formatNumber(shuttle.framesTracked)} tone="positive" />
              <StatTile label="Missed" value={formatNumber(shuttle.framesMissed)} tone="negative" />
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              Dropped frames cluster around fast smashes and occlusion by the player&apos;s body;
              the tracker interpolates across gaps shorter than four frames.
            </p>
          </div>
        </Panel>
      </div>

      {/* Flight characteristics ------------------------------------------- */}
      <Panel title="Flight characteristics" subtitle="Trajectory metrics derived from the tracked shuttle path">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label="Avg flight time"
            value={`${shuttle.averageFlightTimeSeconds.toFixed(2)}s`}
            hint="Contact-to-contact time for a single shuttle flight."
          />
          <StatTile label="Longest flight" value={`${shuttle.longestFlightSeconds.toFixed(2)}s`} />
          <StatTile label="Avg height" value={`${shuttle.averageHeightMeters.toFixed(2)} m`} />
          <StatTile label="Max height" value={`${shuttle.maxHeightMeters.toFixed(2)} m`} tone="gold" />
          <StatTile
            label="Avg spin"
            value={`${formatNumber(shuttle.averageSpinRpm)} rpm`}
            hint="Rotation rate of the shuttle about its axis, estimated from feather-cone deformation between frames."
          />
          <StatTile
            label="Velocity spread"
            value={`${formatNumber(shuttle.peakVelocityKmh - shuttle.averageVelocityKmh)} km/h`}
            hint="Gap between peak and average speed — a wide spread means a varied, deceptive shot mix."
          />
        </div>
      </Panel>

      <Collapsible
        title="Velocity samples"
        subtitle="Table view of the series plotted above"
        meta={`${shuttle.velocitySeries.length} samples`}
      >
        <DataTable
          columns={columns}
          rows={shuttle.velocitySeries}
          rowKey={(row) => String(row.t)}
          initialSort={{ key: 'velocity', direction: 'desc' }}
        />
      </Collapsible>
    </div>
  );
}
