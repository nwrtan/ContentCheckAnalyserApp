import { useCallback } from 'react';
import { theme } from '../theme';
import { DateFilter } from './DateFilter';
import { KPICard } from './KPICard';
import { InfoTooltip } from './InfoTooltip';
import type { CategorySummary, ContentCheck } from '../types/dataverse';
import { AI_RESULT, HUMAN_RESULT } from '../types/dataverse';
import { trackKPIDrill } from '../services/clarity';

type DrillType =
  | 'totalChecks'
  | 'aiReviewed'
  | 'humanReviewed'
  | 'bothReviewed'
  | 'aiPass'
  | 'agreement'
  | 'discrepancies'
  | { category: string; filter: 'all' | 'pass' | 'fail' | 'uncertain' | 'discrepancies' };

interface Props {
  dateFrom: Date;
  dateTo: Date;
  onApplyDate: (from: Date, to: Date) => void;
  totalChecks: number;
  aiReviewedCount: number;
  aiCoverage: number;
  uniqueArticles: number;
  humanCoverage: number;
  humanReviewedCount: number;
  agreementRate: number;
  discrepancyCount: number;
  bothReviewedCount: number;
  categorySummaries: CategorySummary[];
  checks: ContentCheck[];
  loading: boolean;
  onSelectStory: (storyId: string) => void;
  onDrill: (title: string, records: ContentCheck[]) => void;
}

export function OverviewScreen({
  dateFrom,
  dateTo,
  onApplyDate,
  totalChecks,
  aiReviewedCount,
  aiCoverage,
  uniqueArticles,
  humanCoverage,
  humanReviewedCount,
  agreementRate,
  discrepancyCount,
  bothReviewedCount,
  categorySummaries,
  checks,
  loading,
  onDrill,
}: Props) {

  const handleDrillClick = useCallback((drill: DrillType) => {
    let title = '';
    let records: ContentCheck[] = [];

    if (typeof drill === 'object') {
      const cat = categorySummaries.find((c) => c.catalogueId === drill.category);
      const name = cat?.name ?? 'Category';
      const filterLabel = drill.filter === 'all' ? '' : ` — ${drill.filter}`;
      title = `${name}${filterLabel}`;

      let filtered = checks.filter((c) => c._nw_contentcheck_value === drill.category);
      switch (drill.filter) {
        case 'pass': records = filtered.filter((c) => c.nw_airesult === AI_RESULT.YES); break;
        case 'fail': records = filtered.filter((c) => c.nw_airesult === AI_RESULT.NO); break;
        case 'uncertain': records = filtered.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN); break;
        case 'discrepancies': records = filtered.filter((c) => {
          if (c.nw_airesult == null || c._nw_checkedbyid_value == null) return false;
          const aiYes = c.nw_airesult === AI_RESULT.YES;
          const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
          return !((aiYes && humanYes) || (!aiYes && !humanYes));
        }); break;
        default: records = filtered;
      }
    } else {
      const titles: Record<string, string> = {
        totalChecks: 'All Checks',
        aiReviewed: 'AI Reviewed Checks',
        humanReviewed: 'Human Reviewed Checks',
        bothReviewed: 'Reviewed by Both AI & Human',
        aiPass: 'AI Pass Rate — Reviewed Checks',
        agreement: 'AI-Human Agreements',
        discrepancies: 'Discrepancies',
      };
      title = titles[drill] ?? '';

      switch (drill) {
        case 'totalChecks': records = checks; break;
        case 'aiReviewed': records = checks.filter((c) => c.nw_airesult != null); break;
        case 'humanReviewed': records = checks.filter((c) => c._nw_checkedbyid_value != null); break;
        case 'bothReviewed': records = checks.filter((c) => c.nw_airesult != null && c._nw_checkedbyid_value != null); break;
        case 'aiPass': records = checks.filter((c) => c.nw_airesult != null); break;
        case 'agreement': records = checks.filter((c) => {
          if (c.nw_airesult == null || c._nw_checkedbyid_value == null) return false;
          const aiYes = c.nw_airesult === AI_RESULT.YES;
          const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
          return (aiYes && humanYes) || (!aiYes && !humanYes);
        }); break;
        case 'discrepancies': records = checks.filter((c) => {
          if (c.nw_airesult == null || c._nw_checkedbyid_value == null) return false;
          const aiYes = c.nw_airesult === AI_RESULT.YES;
          const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
          return !((aiYes && humanYes) || (!aiYes && !humanYes));
        }); break;
      }
    }

    trackKPIDrill(title);
    onDrill(title, records);
  }, [checks, categorySummaries, onDrill]);

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
        <h1 style={{ margin: 0, fontSize: 22, color: theme.textPrimary }}>
          Overview
        </h1>
        <DateFilter dateFrom={dateFrom} dateTo={dateTo} onApply={onApplyDate} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: theme.textSecondary }}>
          Loading data...
        </div>
      ) : (
        <>
          {/* KPI Cards — Row 1: Volume */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <KPICard
              label="Published Articles"
              value={uniqueArticles}
              tooltip="Number of unique published/scheduled articles that have content checks in this date range."
            />
            <KPICard
              label="Total Checks"
              value={totalChecks}
              tooltip="Each article is evaluated against multiple check types (e.g. Source Comment, Original Reporting). This is the total number of individual checks."
              onClick={() => handleDrillClick('totalChecks')}
            />
            <KPICard
              label={`AI Reviewed (${aiCoverage}%)`}
              value={aiReviewedCount}
              color={aiCoverage >= 70 ? theme.success : aiCoverage >= 40 ? theme.warning : theme.danger}
              tooltip="Checks where the AI has completed its review and given a Pass, Fail, or Uncertain verdict. The percentage shows AI coverage out of all checks."
              onClick={() => handleDrillClick('aiReviewed')}
            />
            <KPICard
              label={`Human Reviewed (${humanCoverage}%)`}
              value={humanReviewedCount}
              tooltip="Checks that have been manually reviewed by a human editor. The percentage shows human coverage out of all checks."
              onClick={() => handleDrillClick('humanReviewed')}
            />
          </div>

          {/* KPI Cards — Row 2: Both reviewed + Agreement + Discrepancies */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <KPICard
              label="Reviewed by Both AI & Human"
              value={bothReviewedCount}
              subtitle={totalChecks > 0 ? `${Math.round((bothReviewedCount / totalChecks) * 1000) / 10}%` : '0%'}
              tooltip="Checks where both the AI and a human editor have given a verdict. Only these checks can be compared for agreement or discrepancy."
              onClick={() => handleDrillClick('bothReviewed')}
            />
            <KPICard
              label="AI-Human Agreement"
              value={bothReviewedCount - discrepancyCount}
              subtitle={`${agreementRate}% of both-reviewed`}
              color={agreementRate >= 80 ? theme.success : agreementRate >= 60 ? theme.warning : theme.danger}
              tooltip="How often AI and human reviewers reach the same verdict on the same check. Only calculated for checks reviewed by both. Higher is better."
              onClick={() => handleDrillClick('agreement')}
            />
            <KPICard
              label="Discrepancies"
              value={discrepancyCount}
              subtitle={bothReviewedCount > 0 ? `${Math.round((discrepancyCount / bothReviewedCount) * 1000) / 10}% of both-reviewed` : '0%'}
              color={discrepancyCount > 0 ? theme.danger : theme.success}
              tooltip="Checks where the AI and human reviewer gave different verdicts (e.g. AI said Pass but human said Fail). These need attention to understand why they disagree."
              onClick={() => handleDrillClick('discrepancies')}
            />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            {/* AI Results by Check Type */}
            <div
              style={{
                flex: 3,
                background: theme.surface,
                borderRadius: 8,
                border: `1px solid ${theme.borderLight}`,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: theme.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                AI Results by Check Type
                <InfoTooltip text="For each check type, shows how many checks the AI marked as Pass, Fail, or Uncertain. 'Pending' means the AI hasn't reviewed yet. Click any segment to drill in." />
              </h3>

              {/* Column headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 60px 60px 60px 60px',
                  gap: 8,
                  padding: '0 0 8px',
                  borderBottom: `1px solid ${theme.borderLight}`,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase' }}>Check Type</span>
                <span />
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.success, textAlign: 'center' }}>Pass</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.danger, textAlign: 'center' }}>Fail</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.warning, textAlign: 'center' }}>Uncertain</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textAlign: 'center' }}>Pending</span>
              </div>

              {categorySummaries.map((cat) => {
                const pending = cat.total - cat.passCount - cat.failCount - cat.uncertainCount;
                const aiReviewed = cat.passCount + cat.failCount + cat.uncertainCount;

                return (
                  <div
                    key={cat.catalogueId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 60px 60px 60px 60px',
                      gap: 8,
                      alignItems: 'center',
                      padding: '8px 0',
                      cursor: 'pointer',
                      borderRadius: 4,
                      borderBottom: `1px solid ${theme.borderLight}`,
                    }}
                    onClick={() => handleDrillClick({ category: cat.catalogueId, filter: 'all' })}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: 12, color: theme.primary, fontWeight: 600, paddingRight: 4 }}>
                      {cat.name}
                    </div>

                    {/* Stacked bar */}
                    <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', background: theme.background }}>
                      {cat.passCount > 0 && (
                        <div
                          style={{ width: `${(cat.passCount / cat.total) * 100}%`, background: theme.success, cursor: 'pointer' }}
                          title={`Pass: ${cat.passCount}`}
                          onClick={(e) => { e.stopPropagation(); handleDrillClick({ category: cat.catalogueId, filter: 'pass' }); }}
                        />
                      )}
                      {cat.failCount > 0 && (
                        <div
                          style={{ width: `${(cat.failCount / cat.total) * 100}%`, background: theme.danger, cursor: 'pointer' }}
                          title={`Fail: ${cat.failCount}`}
                          onClick={(e) => { e.stopPropagation(); handleDrillClick({ category: cat.catalogueId, filter: 'fail' }); }}
                        />
                      )}
                      {cat.uncertainCount > 0 && (
                        <div
                          style={{ width: `${(cat.uncertainCount / cat.total) * 100}%`, background: theme.warning, cursor: 'pointer' }}
                          title={`Uncertain: ${cat.uncertainCount}`}
                          onClick={(e) => { e.stopPropagation(); handleDrillClick({ category: cat.catalogueId, filter: 'uncertain' }); }}
                        />
                      )}
                      {pending > 0 && (
                        <div
                          style={{ width: `${(pending / cat.total) * 100}%`, background: '#D1D5DB' }}
                          title={`Pending: ${pending}`}
                        />
                      )}
                    </div>

                    {/* Counts */}
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.success, textAlign: 'center' }}>
                      {cat.passCount}
                      <div style={{ fontSize: 9, fontWeight: 400, color: theme.textSecondary }}>
                        {aiReviewed > 0 ? `${Math.round((cat.passCount / aiReviewed) * 100)}%` : '-'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.danger, textAlign: 'center' }}>
                      {cat.failCount}
                      <div style={{ fontSize: 9, fontWeight: 400, color: theme.textSecondary }}>
                        {aiReviewed > 0 ? `${Math.round((cat.failCount / aiReviewed) * 100)}%` : '-'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.warning, textAlign: 'center' }}>
                      {cat.uncertainCount}
                      <div style={{ fontSize: 9, fontWeight: 400, color: theme.textSecondary }}>
                        {aiReviewed > 0 ? `${Math.round((cat.uncertainCount / aiReviewed) * 100)}%` : '-'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, textAlign: 'center' }}>
                      {pending}
                      <div style={{ fontSize: 9, fontWeight: 400 }}>
                        {cat.total > 0 ? `${Math.round((pending / cat.total) * 100)}%` : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: `1px solid ${theme.borderLight}`,
                }}
              >
                {[
                  { label: 'Pass', color: theme.success },
                  { label: 'Fail', color: theme.danger },
                  { label: 'Uncertain', color: theme.warning },
                  { label: 'Pending (AI not reviewed)', color: '#D1D5DB' },
                ].map((l) => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
                    <span style={{ fontSize: 11, color: theme.textSecondary }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agreement Summary by Category */}
            <div
              style={{
                flex: 2,
                background: theme.surface,
                borderRadius: 8,
                border: `1px solid ${theme.borderLight}`,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                maxHeight: 500,
                overflow: 'auto',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: theme.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                AI-Human Agreement by Type
                <InfoTooltip text="For each check type, shows how often AI and human reviewers agree. Only includes checks reviewed by both. Click a row to drill into individual checks." />
              </h3>

              {categorySummaries.map((cat) => (
                <div
                  key={cat.catalogueId}
                  style={{
                    padding: '10px 8px',
                    borderBottom: `1px solid ${theme.borderLight}`,
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                  onClick={() => handleDrillClick({ category: cat.catalogueId, filter: 'all' })}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.primary }}>
                      {cat.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          cat.agreementRate >= 80
                            ? theme.success
                            : cat.agreementRate >= 60
                            ? theme.warning
                            : cat.humanReviewedCount === 0
                            ? theme.textSecondary
                            : theme.danger,
                      }}
                    >
                      {cat.humanReviewedCount > 0 ? `${cat.agreementRate}%` : 'No human reviews'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: theme.textSecondary }}>
                    {cat.humanReviewedCount} human reviews |{' '}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrillClick({ category: cat.catalogueId, filter: 'discrepancies' });
                      }}
                      style={{
                        color: cat.discrepancyCount > 0 ? theme.danger : theme.textSecondary,
                        fontWeight: cat.discrepancyCount > 0 ? 600 : 400,
                        textDecoration: cat.discrepancyCount > 0 ? 'underline' : 'none',
                        cursor: cat.discrepancyCount > 0 ? 'pointer' : 'default',
                      }}
                    >
                      {cat.discrepancyCount} discrepancies
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Review Coverage Funnel + Agreement vs Discrepancy by Category */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            {/* Review Coverage Pipeline */}
            <div
              style={{
                flex: 1,
                background: theme.surface,
                borderRadius: 8,
                border: `1px solid ${theme.borderLight}`,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: theme.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Review Coverage Pipeline
                <InfoTooltip text="Shows how checks flow through the review pipeline: from created, to AI reviewed, to human reviewed, to both reviewed." />
              </h3>

              {(() => {
                const bothCount = bothReviewedCount;
                const stages = [
                  { label: 'Total Checks', count: totalChecks, color: theme.textSecondary, drill: 'totalChecks' as DrillType },
                  { label: 'AI Reviewed', count: aiReviewedCount, color: '#3B82F6', drill: 'aiReviewed' as DrillType },
                  { label: 'Human Reviewed', count: humanReviewedCount, color: '#6366F1', drill: 'humanReviewed' as DrillType },
                  { label: 'Both Reviewed', count: bothCount, color: '#8B5CF6', drill: 'bothReviewed' as DrillType },
                ];
                const maxCount = totalChecks || 1;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {stages.map((stage) => {
                      const pct = totalChecks > 0 ? Math.round((stage.count / maxCount) * 100) : 0;

                      return (
                        <div
                          key={stage.label}
                          style={{ cursor: 'pointer', padding: '4px 0', borderRadius: 4 }}
                          onClick={() => handleDrillClick(stage.drill)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: theme.primary }}>{stage.label}</span>
                            <span style={{ fontSize: 11, color: theme.textSecondary }}>
                              <span style={{ color: stage.color, fontWeight: 600 }}>{stage.count}</span>
                              {' '}
                              <span>({pct}%)</span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', background: theme.background }}>
                            {pct > 0 && (
                              <div style={{ width: `${pct}%`, background: stage.color, transition: 'width 0.5s' }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Agreement vs Discrepancy by Category */}
            <div
              style={{
                flex: 1,
                background: theme.surface,
                borderRadius: 8,
                border: `1px solid ${theme.borderLight}`,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 20px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: theme.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Agreement vs Discrepancy by Type
                <InfoTooltip text="For each check type, green shows how many checks AI and human agreed on, red shows disagreements. Only includes checks reviewed by both." />
              </h3>

              {(() => {
                const maxBoth = Math.max(...categorySummaries.map((c) => c.agreementCount + c.discrepancyCount), 1);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {categorySummaries.map((cat) => {
                      const bothCount = cat.agreementCount + cat.discrepancyCount;
                      const agPct = bothCount > 0 ? (cat.agreementCount / maxBoth) * 100 : 0;
                      const disPct = bothCount > 0 ? (cat.discrepancyCount / maxBoth) * 100 : 0;

                      return (
                        <div
                          key={cat.catalogueId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleDrillClick({ category: cat.catalogueId, filter: 'all' })}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: theme.primary }}>{cat.name}</span>
                            <span style={{ fontSize: 11, color: theme.textSecondary }}>
                              {bothCount > 0 ? (
                                <>
                                  <span style={{ color: theme.success, fontWeight: 600 }}>{cat.agreementCount}</span>
                                  {' / '}
                                  <span style={{ color: theme.danger, fontWeight: 600 }}>{cat.discrepancyCount}</span>
                                  <span style={{ marginLeft: 6 }}>({cat.agreementRate}%)</span>
                                </>
                              ) : 'No both-reviewed'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', height: 18, borderRadius: 4, overflow: 'hidden', background: theme.background }}>
                            {agPct > 0 && (
                              <div style={{ width: `${agPct}%`, background: theme.success, transition: 'width 0.5s' }} />
                            )}
                            {disPct > 0 && (
                              <div style={{ width: `${disPct}%`, background: theme.danger, transition: 'width 0.5s' }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: `1px solid ${theme.borderLight}` }}>
                      {[
                        { label: 'Agreement', color: theme.success },
                        { label: 'Discrepancy', color: theme.danger },
                      ].map((l) => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
                          <span style={{ fontSize: 11, color: theme.textSecondary }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
