import { useState, useCallback } from 'react';
import { theme } from '../theme';
import { DateFilter } from './DateFilter';
import { KPICard } from './KPICard';
import { InfoTooltip } from './InfoTooltip';
import { AI_RESULT, HUMAN_RESULT } from '../types/dataverse';
import type { WeekBucket, ContentCheck } from '../types/dataverse';
import { trackChartModeToggle, trackWeekDrill, trackKPIDrill } from '../services/clarity';

interface Props {
  dateFrom: Date;
  dateTo: Date;
  onApplyDate: (from: Date, to: Date) => void;
  weeklyBuckets: WeekBucket[];
  checks: ContentCheck[];
  loading: boolean;
  onSelectStory: (storyId: string) => void;
  onDrill: (title: string, records: ContentCheck[]) => void;
}

type ChartMode = 'coverage' | 'agreementDiscrepancy' | 'aiResults';

export function TrendsScreen({
  dateFrom,
  dateTo,
  onApplyDate,
  weeklyBuckets,
  checks,
  loading,
  onDrill,
}: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>('coverage');

  const handleDrillType = useCallback((type: 'all' | 'discrepancies') => {
    trackKPIDrill(type === 'all' ? 'All Checks' : 'All Discrepancies');
    if (type === 'all') {
      onDrill('All Checks', checks);
    } else {
      const discrepancies = checks.filter((c) => {
        if (c.nw_airesult == null || c._nw_checkedbyid_value == null) return false;
        const aiYes = c.nw_airesult === AI_RESULT.YES;
        const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
        return !((aiYes && humanYes) || (!aiYes && !humanYes));
      });
      onDrill('All Discrepancies', discrepancies);
    }
  }, [checks, onDrill]);

  const handleDrillWeek = useCallback((index: number) => {
    const bucket = weeklyBuckets[index];
    if (!bucket) return;
    const weekEnd = new Date(bucket.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekChecks = checks.filter((c) => {
      const d = new Date(c.nw_aireviewedon || c.createdon);
      return d >= bucket.weekStart && d < weekEnd;
    });
    trackWeekDrill(bucket.weekLabel);
    onDrill(`Week of ${bucket.weekLabel}`, weekChecks);
  }, [checks, weeklyBuckets, onDrill]);

  const validBuckets = weeklyBuckets.filter((b) => b.total > 0);
  const bucketsWith2 = validBuckets.filter((b) => b.humanReviewedCount > 0);
  const avgAgreementRate =
    bucketsWith2.length > 0
      ? Math.round(bucketsWith2.reduce((sum, b) => sum + b.agreementRate, 0) / bucketsWith2.length)
      : 0;

  const totalChecks = weeklyBuckets.reduce((sum, b) => sum + b.total, 0);
  const totalDiscrepancies = weeklyBuckets.reduce((sum, b) => sum + b.discrepancyCount, 0);
  const totalBothReviewed = weeklyBuckets.reduce((sum, b) => sum + b.bothReviewedCount, 0);
  const maxBarHeight = 280;

  // Compute max values for each chart mode
  const maxTotal = Math.max(...weeklyBuckets.map((b) => b.total), 1);
  const maxBothReviewed = Math.max(...weeklyBuckets.map((b) => b.bothReviewedCount), 1);

  return (
    <div data-scroll-container style={{ padding: 24, flex: 1, overflow: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, color: theme.textPrimary, display: 'flex', alignItems: 'center' }}>
          Trend Analysis
          <InfoTooltip text="Shows how review coverage, agreement rates, and AI results change week over week. Click any bar to drill into that week's checks." />
        </h1>
        <DateFilter dateFrom={dateFrom} dateTo={dateTo} onApply={onApplyDate} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: theme.textSecondary }}>
          Loading trends...
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <KPICard
              label="Total Checks"
              value={totalChecks}
              tooltip="Total number of content checks across all weeks in this date range."
              onClick={() => handleDrillType('all')}
            />
            <KPICard
              label="Both Reviewed"
              value={totalBothReviewed}
              subtitle={totalChecks > 0 ? `${Math.round((totalBothReviewed / totalChecks) * 100)}%` : '0%'}
              tooltip="Total checks reviewed by both AI and human across all weeks."
            />
            <KPICard
              label="Avg Agreement Rate"
              value={`${avgAgreementRate}%`}
              color={avgAgreementRate >= 80 ? theme.success : avgAgreementRate >= 60 ? theme.warning : theme.danger}
              tooltip="Average of weekly AI-human agreement rates. Only includes weeks that have human reviews."
            />
            <KPICard
              label="Total Discrepancies"
              value={totalDiscrepancies}
              subtitle={totalBothReviewed > 0 ? `${Math.round((totalDiscrepancies / totalBothReviewed) * 100)}%` : '0%'}
              color={totalDiscrepancies > 0 ? theme.danger : theme.success}
              tooltip="Total number of checks where AI and human reviewers disagreed across all weeks."
              onClick={() => handleDrillType('discrepancies')}
            />
          </div>

          {/* Chart mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([
              { id: 'coverage' as ChartMode, label: 'Review Coverage' },
              { id: 'agreementDiscrepancy' as ChartMode, label: 'Agreement vs Discrepancy' },
              { id: 'aiResults' as ChartMode, label: 'AI Pass / Fail / Uncertain' },
            ]).map((mode) => (
              <button
                key={mode.id}
                onClick={() => { trackChartModeToggle(mode.id); setChartMode(mode.id); }}
                style={{
                  padding: '6px 16px',
                  border: `1px solid ${chartMode === mode.id ? theme.primary : theme.borderLight}`,
                  borderRadius: 6,
                  background: chartMode === mode.id ? theme.primary : theme.surface,
                  color: chartMode === mode.id ? '#fff' : theme.textPrimary,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: chartMode === mode.id ? 600 : 400,
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div
            style={{
              background: theme.surface,
              borderRadius: 8,
              border: `1px solid ${theme.borderLight}`,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>
              {chartMode === 'coverage' && 'Weekly Review Coverage'}
              {chartMode === 'agreementDiscrepancy' && 'Weekly Agreement vs Discrepancy'}
              {chartMode === 'aiResults' && 'Weekly AI Results Breakdown'}
            </h3>
            <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 16 }}>
              {chartMode === 'coverage' && 'Stacked bars show Total checks, AI reviewed, Human reviewed, and Both reviewed per week'}
              {chartMode === 'agreementDiscrepancy' && 'For checks reviewed by both, green = agreement, red = discrepancy'}
              {chartMode === 'aiResults' && 'Stacked bars show AI Pass, Fail, and Uncertain counts per week'}
            </div>

            {weeklyBuckets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: theme.textSecondary }}>
                No data for this period
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Y-axis */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: maxBarHeight,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {(() => {
                    const maxVal = chartMode === 'agreementDiscrepancy' ? maxBothReviewed : maxTotal;
                    return [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map((v) => (
                      <span key={v} style={{ fontSize: 9, color: theme.textSecondary }}>{v}</span>
                    ));
                  })()}
                </div>

                {/* Bars area */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 6,
                    marginLeft: 36,
                    height: maxBarHeight,
                    borderBottom: `1px solid ${theme.borderLight}`,
                    paddingBottom: 0,
                  }}
                >
                  {weeklyBuckets.map((bucket, i) => {
                    const maxVal = chartMode === 'agreementDiscrepancy' ? maxBothReviewed : maxTotal;

                    return (
                      <div
                        key={i}
                        onClick={() => bucket.total > 0 && handleDrillWeek(i)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: bucket.total > 0 ? 'pointer' : 'default',
                          height: '100%',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {chartMode === 'coverage' && (
                          <CoverageBar
                            bucket={bucket}
                            maxVal={maxVal}
                            maxHeight={maxBarHeight}
                          />
                        )}
                        {chartMode === 'agreementDiscrepancy' && (
                          <AgreementBar
                            bucket={bucket}
                            maxVal={maxVal}
                            maxHeight={maxBarHeight}
                          />
                        )}
                        {chartMode === 'aiResults' && (
                          <AIResultsBar
                            bucket={bucket}
                            maxVal={maxVal}
                            maxHeight={maxBarHeight}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels */}
                <div style={{ display: 'flex', gap: 6, marginLeft: 36, marginTop: 6 }}>
                  {weeklyBuckets.map((bucket, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: theme.textSecondary }}>{bucket.weekLabel}</div>
                      <div style={{ fontSize: 8, color: theme.textSecondary }}>{bucket.total > 0 ? bucket.total : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${theme.borderLight}` }}>
              {chartMode === 'coverage' && (
                <>
                  <LegendItem label="Total" color={theme.textSecondary} opacity={0.15} />
                  <LegendItem label="AI Reviewed" color="#3B82F6" />
                  <LegendItem label="Human Reviewed" color="#6366F1" />
                  <LegendItem label="Both Reviewed" color="#8B5CF6" />
                </>
              )}
              {chartMode === 'agreementDiscrepancy' && (
                <>
                  <LegendItem label="Agreement" color={theme.success} />
                  <LegendItem label="Discrepancy" color={theme.danger} />
                </>
              )}
              {chartMode === 'aiResults' && (
                <>
                  <LegendItem label="Pass" color={theme.success} />
                  <LegendItem label="Fail" color={theme.danger} />
                  <LegendItem label="Uncertain" color={theme.warning} />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function LegendItem({ label, color, opacity }: { label: string; color: string; opacity?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, borderRadius: 2, background: color, opacity: opacity ?? 1 }} />
      <span style={{ fontSize: 11, color: theme.textSecondary }}>{label}</span>
    </div>
  );
}

function CoverageBar({ bucket, maxVal, maxHeight }: { bucket: WeekBucket; maxVal: number; maxHeight: number }) {
  if (bucket.total === 0) return <div style={{ width: '100%' }} />;
  const totalH = (bucket.total / maxVal) * maxHeight;
  const aiH = (bucket.aiReviewedCount / maxVal) * maxHeight;
  const humanH = (bucket.humanReviewedCount / maxVal) * maxHeight;
  const bothH = (bucket.bothReviewedCount / maxVal) * maxHeight;

  return (
    <div
      style={{ width: '80%', maxWidth: 48, position: 'relative', height: totalH }}
      title={`${bucket.weekLabel}: ${bucket.total} total, ${bucket.aiReviewedCount} AI, ${bucket.humanReviewedCount} human, ${bucket.bothReviewedCount} both`}
    >
      {/* Total - background */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: totalH, background: '#E5E7EB', borderRadius: '4px 4px 0 0' }} />
      {/* AI reviewed */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '45%', height: aiH, background: '#3B82F6', borderRadius: '4px 4px 0 0' }} />
      {/* Human reviewed */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '45%', height: humanH, background: '#6366F1', borderRadius: '4px 4px 0 0' }} />
      {/* Both reviewed - center dot indicator */}
      <div style={{ position: 'absolute', bottom: 0, left: '25%', width: '50%', height: bothH, background: '#8B5CF6', borderRadius: '4px 4px 0 0', opacity: 0.7 }} />
    </div>
  );
}

function AgreementBar({ bucket, maxVal, maxHeight }: { bucket: WeekBucket; maxVal: number; maxHeight: number }) {
  if (bucket.bothReviewedCount === 0) return <div style={{ width: '100%' }} />;
  const agH = (bucket.agreementCount / maxVal) * maxHeight;
  const disH = (bucket.discrepancyCount / maxVal) * maxHeight;

  return (
    <div
      style={{
        width: '70%',
        maxWidth: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      title={`${bucket.weekLabel}: ${bucket.agreementCount} agreements, ${bucket.discrepancyCount} discrepancies (${bucket.agreementRate}%)`}
    >
      <div style={{ height: disH, background: theme.danger, borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
      <div style={{ height: agH, background: theme.success, transition: 'height 0.3s' }} />
    </div>
  );
}

function AIResultsBar({ bucket, maxVal, maxHeight }: { bucket: WeekBucket; maxVal: number; maxHeight: number }) {
  if (bucket.total === 0) return <div style={{ width: '100%' }} />;
  const passH = (bucket.passCount / maxVal) * maxHeight;
  const failH = (bucket.failCount / maxVal) * maxHeight;
  const uncH = (bucket.uncertainCount / maxVal) * maxHeight;

  return (
    <div
      style={{
        width: '70%',
        maxWidth: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      title={`${bucket.weekLabel}: ${bucket.passCount} pass, ${bucket.failCount} fail, ${bucket.uncertainCount} uncertain`}
    >
      <div style={{ height: uncH, background: theme.warning, borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
      <div style={{ height: failH, background: theme.danger, transition: 'height 0.3s' }} />
      <div style={{ height: passH, background: theme.success, transition: 'height 0.3s' }} />
    </div>
  );
}
