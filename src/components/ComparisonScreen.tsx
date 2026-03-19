import { useState } from 'react';
import { theme } from '../theme';
import { ResultBadge } from './ResultBadge';
import { HumanBadge } from './HumanBadge';
import { InfoTooltip } from './InfoTooltip';
import { dataverseRecordUrl } from '../services/orgUrl';
import type { ContentCheck, ContentCheckCatalogue, CategorySummary } from '../types/dataverse';
import { AI_RESULT, HUMAN_RESULT } from '../types/dataverse';
import {
  trackCategorySelect,
  trackArticleVisit,
  trackDataverseClick,
  trackViewStoryClick,
} from '../services/clarity';

interface Props {
  catalogue: ContentCheckCatalogue[];
  categorySummaries: CategorySummary[];
  checks: ContentCheck[];
  onSelectStory: (storyId: string) => void;
}

export function ComparisonScreen({
  catalogue,
  categorySummaries,
  checks,
  onSelectStory,
}: Props) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const activeCat = selectedCat
    ? categorySummaries.find((c) => c.catalogueId === selectedCat)
    : null;

  const catChecks = selectedCat
    ? checks.filter((c) => c._nw_contentcheck_value === selectedCat)
    : [];

  // Separate into agreement/discrepancy buckets
  const bothReviewed = catChecks.filter(
    (c) => c.nw_airesult != null && c._nw_checkedbyid_value != null
  );
  const agreements = bothReviewed.filter((c) => {
    const aiYes = c.nw_airesult === AI_RESULT.YES;
    const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
    return (aiYes && humanYes) || (!aiYes && !humanYes);
  });
  const discrepancies = bothReviewed.filter((c) => !agreements.includes(c));

  return (
    <div data-scroll-container style={{ padding: 24, flex: 1, overflow: 'auto' }}>
      <h1 style={{ margin: '0 0 16px', fontSize: 22, color: theme.textPrimary, display: 'flex', alignItems: 'center' }}>
        AI vs Human Comparison
        <InfoTooltip text="Compare AI and human review results side by side. Select a check type to see individual agreements and discrepancies. 'Agreement %' shows how often both reviewers gave the same verdict." />
      </h1>

      {/* Category selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {catalogue.map((cat) => {
          const summary = categorySummaries.find((s) => s.catalogueId === cat.nw_contentcheckcatalogueid);
          const isActive = selectedCat === cat.nw_contentcheckcatalogueid;
          return (
            <button
              key={cat.nw_contentcheckcatalogueid}
              onClick={() => {
                const next = isActive ? null : cat.nw_contentcheckcatalogueid;
                if (next) trackCategorySelect(cat.nw_name);
                setSelectedCat(next);
              }}
              style={{
                padding: '8px 16px',
                border: `1px solid ${isActive ? theme.primary : theme.borderLight}`,
                borderRadius: 6,
                background: isActive ? theme.primary : theme.surface,
                color: isActive ? '#fff' : theme.textPrimary,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {cat.nw_name}
              {summary && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  ({summary.agreementRate}% agree)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!selectedCat ? (
        /* Summary table for all categories */
        <div
          style={{
            background: theme.surface,
            borderRadius: 8,
            border: `1px solid ${theme.borderLight}`,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: theme.background }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: theme.textPrimary }}>Check Type</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.textPrimary }}>Total</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.success }}>AI Pass</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.danger }}>AI Fail</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#6366F1' }}>Human Reviewed</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.textPrimary }}>Both Reviewed</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.success }}>Agreements</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.danger }}>Discrepancies</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: theme.textPrimary }}>Agreement %</th>
              </tr>
            </thead>
            <tbody>
              {categorySummaries.map((cat) => (
                <tr
                  key={cat.catalogueId}
                  onClick={() => setSelectedCat(cat.catalogueId)}
                  style={{ cursor: 'pointer', borderBottom: `1px solid ${theme.borderLight}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{cat.name}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>{cat.total}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', color: theme.success }}>{cat.passCount}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', color: theme.danger }}>{cat.failCount}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', color: '#6366F1' }}>{cat.humanReviewedCount}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>{cat.agreementCount + cat.discrepancyCount}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', color: theme.success }}>{cat.agreementCount}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', color: theme.danger, fontWeight: cat.discrepancyCount > 0 ? 700 : 400 }}>{cat.discrepancyCount}</td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 700, color: cat.agreementRate >= 80 ? theme.success : cat.agreementRate >= 60 ? theme.warning : cat.humanReviewedCount === 0 ? theme.textSecondary : theme.danger }}>
                    {cat.humanReviewedCount > 0 ? `${cat.agreementRate}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Category detail header */}
          {activeCat && (
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: theme.surface,
                  borderRadius: 8,
                  border: `1px solid ${theme.borderLight}`,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.textPrimary }}>{activeCat.total}</div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>Total Checks</div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: theme.surface,
                  borderRadius: 8,
                  border: `1px solid ${theme.borderLight}`,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: '#6366F1' }}>{activeCat.humanReviewedCount}</div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>Human Reviewed</div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: theme.surface,
                  borderRadius: 8,
                  border: `1px solid ${theme.borderLight}`,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.success }}>{agreements.length}</div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>Agreements</div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: theme.surface,
                  borderRadius: 8,
                  border: `1px solid ${theme.borderLight}`,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: discrepancies.length > 0 ? theme.danger : theme.success }}>{discrepancies.length}</div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>Discrepancies</div>
              </div>
              <div
                style={{
                  flex: 1,
                  background: theme.surface,
                  borderRadius: 8,
                  border: `1px solid ${theme.borderLight}`,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: activeCat.agreementRate >= 80 ? theme.success : activeCat.agreementRate >= 60 ? theme.warning : theme.danger }}>{activeCat.agreementRate}%</div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>Agreement Rate</div>
              </div>
            </div>
          )}

          {/* Discrepancies list */}
          {discrepancies.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: theme.danger }}>
                Discrepancies ({discrepancies.length})
              </h3>
              {discrepancies.map((check) => (
                <div
                  key={check.nw_contentcheckid}
                  data-story-id={check._nw_relatedstory_value}
                  style={{
                    background: theme.surface,
                    borderRadius: 8,
                    border: `1px solid ${theme.borderLight}`,
                    borderLeft: `5px solid ${theme.danger}`,
                    padding: '14px 20px',
                    marginBottom: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {check._nw_relatedstory_formatted && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 6 }}>
                      {check._nw_relatedstory_formatted}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, flex: 1 }}>
                      {check.nw_name}
                    </span>
                    <span style={{ fontSize: 11, color: theme.textSecondary }}>AI:</span>
                    <ResultBadge value={check.nw_airesult} />
                    <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 8 }}>Human:</span>
                    <HumanBadge value={check.nw_contentcheckcompletedchoice} />
                  </div>
                  {(check.nw_aiincorrect || check.nw_aifixrequired) && (
                    <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4, maxHeight: 36, overflow: 'hidden' }}>
                      {(check.nw_aiincorrect || check.nw_aifixrequired || '').slice(0, 200)}{(check.nw_aiincorrect || check.nw_aifixrequired || '').length > 200 ? '...' : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    <div
                      onClick={() => { trackArticleVisit(check._nw_relatedstory_formatted ?? undefined); onSelectStory(check._nw_relatedstory_value); }}
                      style={{
                        padding: '6px 14px',
                        background: theme.primary,
                        color: '#fff',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Full Article →
                    </div>
                    {check._nw_relatedstory_nodeid && (
                      <a
                        href={`https://www.newsweek.com/node/${check._nw_relatedstory_nodeid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackViewStoryClick()}
                        style={{
                          padding: '6px 14px',
                          background: theme.surface,
                          color: theme.primary,
                          border: `1px solid ${theme.primary}`,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Newsweek.com →
                      </a>
                    )}
                    <a
                      href={dataverseRecordUrl('nw_digitaleditorialstory', check._nw_relatedstory_value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackDataverseClick('comparison')}
                      style={{
                        padding: '6px 14px',
                        border: `1px solid ${theme.borderLight}`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: theme.textSecondary,
                        textDecoration: 'none',
                      }}
                    >
                      Dataverse →
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Agreements list */}
          {agreements.length > 0 && (
            <>
              <h3 style={{ margin: '20px 0 12px', fontSize: 15, fontWeight: 600, color: theme.success }}>
                Agreements ({agreements.length})
              </h3>
              {agreements.slice(0, 20).map((check) => (
                <div
                  key={check.nw_contentcheckid}
                  data-story-id={check._nw_relatedstory_value}
                  style={{
                    background: theme.surface,
                    borderRadius: 8,
                    border: `1px solid ${theme.borderLight}`,
                    borderLeft: `5px solid ${theme.success}`,
                    padding: '10px 20px',
                    marginBottom: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {check._nw_relatedstory_formatted && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 4 }}>
                      {check._nw_relatedstory_formatted}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, flex: 1 }}>
                      {check.nw_name}
                    </span>
                    <span style={{ fontSize: 11, color: theme.textSecondary }}>AI:</span>
                    <ResultBadge value={check.nw_airesult} />
                    <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 8 }}>Human:</span>
                    <HumanBadge value={check.nw_contentcheckcompletedchoice} />
                  </div>
                  <div
                    onClick={() => { trackArticleVisit(check._nw_relatedstory_formatted ?? undefined); onSelectStory(check._nw_relatedstory_value); }}
                    style={{
                      marginTop: 6,
                      padding: '5px 12px',
                      background: theme.primary,
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-block',
                    }}
                  >
                    View Full Article →
                  </div>
                </div>
              ))}
              {agreements.length > 20 && (
                <div style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', padding: 8 }}>
                  Showing 20 of {agreements.length} agreements
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
