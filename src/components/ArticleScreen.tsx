import { useState, useEffect, useRef } from 'react';
import { theme } from '../theme';
import { ResultBadge } from './ResultBadge';
import { HumanBadge } from './HumanBadge';
import { InfoTooltip } from './InfoTooltip';
import { FeedbackPanel } from './FeedbackPanel';
import { dataverseRecordUrl } from '../services/orgUrl';
import { useArticleDrillDown, useStorySearch } from '../hooks/useDataverse';
import { getHumanResultLabel, AI_RESULT, HUMAN_RESULT } from '../types/dataverse';
import type { ContentCheck } from '../types/dataverse';
import {
  trackArticleVisit,
  trackArticleSearch,
  trackCheckExpand,
  trackDataverseClick,
  trackViewStoryClick,
  trackBackClick,
} from '../services/clarity';

interface Props {
  initialStoryId?: string | null;
  onBack?: () => void;
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <tr>
      <td
        style={{
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: color ?? theme.textSecondary,
          verticalAlign: 'top',
          whiteSpace: 'nowrap',
          borderBottom: `1px solid ${theme.borderLight}`,
          width: 140,
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '6px 12px',
          fontSize: 12,
          color: theme.textPrimary,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          borderBottom: `1px solid ${theme.borderLight}`,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function CheckCard({ check }: { check: ContentCheck }) {
  const [expanded, setExpanded] = useState(false);

  const hasDiscrepancy =
    check.nw_airesult != null &&
    check._nw_checkedbyid_value != null &&
    !(
      (check.nw_airesult === AI_RESULT.YES && check.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES) ||
      (check.nw_airesult !== AI_RESULT.YES && check.nw_contentcheckcompletedchoice !== HUMAN_RESULT.YES)
    );

  const hasAIDetails = !!(check.nw_aicorrect || check.nw_aiincorrect || check.nw_aievidence || check.nw_aifixrequired);
  const hasAIResult = check.nw_airesult != null;
  const hasHumanReview = !!check._nw_checkedbyid_value;
  const hasDetails = hasAIResult || hasHumanReview;

  return (
    <div
      style={{
        background: theme.surface,
        borderRadius: 8,
        border: `1px solid ${hasDiscrepancy ? theme.danger : theme.borderLight}`,
        borderLeft: `5px solid ${hasDiscrepancy ? theme.danger : theme.borderLight}`,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <div
        onClick={() => {
          if (hasDetails) {
            if (!expanded) trackCheckExpand(check.nw_name);
            setExpanded(!expanded);
          }
        }}
        style={{
          padding: '14px 20px',
          cursor: hasDetails ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
        onMouseEnter={(e) => { if (hasDetails) e.currentTarget.style.background = theme.background; }}
        onMouseLeave={(e) => { if (hasDetails) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>{check.nw_name}</span>
        {hasDiscrepancy && (
          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: theme.danger, padding: '1px 8px', borderRadius: 3, textTransform: 'uppercase' }}>
            Discrepancy
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 10, color: theme.textSecondary }}>AI:</span>
          <ResultBadge value={check.nw_airesult} />
          <span style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 6 }}>Human:</span>
          <HumanBadge value={hasHumanReview ? check.nw_contentcheckcompletedchoice : null} />
          {hasDetails && (
            <span style={{ fontSize: 11, color: theme.primary, fontWeight: 600, marginLeft: 8 }}>
              {expanded ? '▼ Hide' : '▶ Details'}
            </span>
          )}
        </div>
      </div>

      {/* Expanded detail — AI Analysis & Human Review side by side */}
      {expanded && (
        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${theme.borderLight}` }}>
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            {/* AI Analysis Column — left */}
            {hasAIResult && (
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: theme.textPrimary,
                    marginBottom: 8,
                    padding: '6px 12px',
                    background: '#EFF6FF',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>AI Analysis</span>
                  <ResultBadge value={check.nw_airesult} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <DetailRow
                      label="Verdict"
                      value={check.nw_airesult === AI_RESULT.YES ? 'Pass' : check.nw_airesult === AI_RESULT.NO ? 'Fail' : 'Uncertain'}
                      color={check.nw_airesult === AI_RESULT.YES ? theme.success : check.nw_airesult === AI_RESULT.NO ? theme.danger : theme.warning}
                    />
                    {check.nw_aireviewedon && (
                      <DetailRow label="Reviewed On" value={new Date(check.nw_aireviewedon).toLocaleDateString()} />
                    )}
                    {check.nw_aicorrect && (
                      <DetailRow label="What's Correct" value={check.nw_aicorrect} color={theme.success} />
                    )}
                    {check.nw_aiincorrect && (
                      <DetailRow label="What's Incorrect" value={check.nw_aiincorrect} color={theme.danger} />
                    )}
                    {check.nw_aievidence && (
                      <DetailRow label="Evidence" value={check.nw_aievidence} color="#6366F1" />
                    )}
                    {check.nw_aifixrequired && (
                      <DetailRow label="Fix Required" value={check.nw_aifixrequired} color={theme.warning} />
                    )}
                  </tbody>
                </table>
                {!hasAIDetails && (
                  <div style={{ fontSize: 11, color: theme.textSecondary, padding: '8px 12px', fontStyle: 'italic' }}>
                    No detailed analysis available for this check.
                  </div>
                )}
              </div>
            )}

            {/* Human Review Column — right */}
            {hasHumanReview && (
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: theme.textPrimary,
                    marginBottom: 8,
                    padding: '6px 12px',
                    background: '#F0FDF4',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Human Review</span>
                  <HumanBadge value={check.nw_contentcheckcompletedchoice} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <DetailRow
                      label="Verdict"
                      value={getHumanResultLabel(check.nw_contentcheckcompletedchoice)}
                      color={check.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES ? theme.success : theme.danger}
                    />
                    {check._nw_checkedbyid_formatted && (
                      <DetailRow label="Reviewed By" value={check._nw_checkedbyid_formatted} />
                    )}
                    {check.nw_checkedon && (
                      <DetailRow label="Reviewed On" value={new Date(check.nw_checkedon).toLocaleDateString()} />
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Discrepancy callout */}
          {hasDiscrepancy && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 16px',
                background: '#FEF2F2',
                border: `1px solid ${theme.danger}`,
                borderRadius: 6,
                fontSize: 12,
                color: theme.danger,
                fontWeight: 600,
              }}
            >
              AI and Human reviewers disagree on this check.
              AI says: {check.nw_airesult === AI_RESULT.YES ? 'Pass' : check.nw_airesult === AI_RESULT.NO ? 'Fail' : 'Uncertain'}
              {' — '}
              Human says: {getHumanResultLabel(check.nw_contentcheckcompletedchoice)}
            </div>
          )}

          {/* Feedback form */}
          <div style={{ marginTop: 12 }}>
            <FeedbackPanel check={check} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ArticleScreen({ initialStoryId, onBack }: Props) {
  const {
    story, storyChecks, loading, error, loadStory,
    passCount, failCount, uncertainCount,
    humanReviewedCount, agreementCount, discrepancyCount,
  } = useArticleDrillDown();
  const { results, searching, search, clear } = useStorySearch();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialStoryId) {
      loadStory(initialStoryId);
    }
  }, [initialStoryId, loadStory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        trackArticleSearch(query);
        search(query);
        setShowResults(true);
      } else {
        clear();
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, clear]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalChecks = storyChecks.length;

  return (
    <div style={{ padding: 24, flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {onBack && (
          <button
            onClick={() => { trackBackClick(); onBack!(); }}
            style={{
              background: 'none',
              border: `1px solid ${theme.borderLight}`,
              borderRadius: 6,
              padding: '7px 14px',
              fontSize: 12,
              cursor: 'pointer',
              color: theme.textPrimary,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.background;
              e.currentTarget.style.borderColor = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.borderColor = theme.borderLight;
            }}
          >
            ← Back
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 22, color: theme.textPrimary, display: 'flex', alignItems: 'center' }}>
          Article Detail
          <InfoTooltip text="Search for an article by headline to see all its content checks. Each check shows the AI verdict and human review side by side. Expand a check to see the full AI reasoning." />
        </h1>
      </div>

      {/* Search */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search articles by headline..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          style={{
            width: '100%',
            padding: '10px 16px',
            border: `1px solid ${theme.borderLight}`,
            borderRadius: 8,
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        {searching && (
          <div style={{ position: 'absolute', right: 12, top: 12, fontSize: 12, color: theme.textSecondary }}>
            Searching...
          </div>
        )}

        {showResults && results.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: theme.surface,
              border: `1px solid ${theme.borderLight}`,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: 280,
              overflow: 'auto',
              zIndex: 10,
            }}
          >
            {results.map((s) => (
              <div
                key={s.nw_digitaleditorialstoryid}
                onClick={() => {
                  trackArticleVisit(s.nw_cmsheadline);
                  loadStory(s.nw_digitaleditorialstoryid);
                  setShowResults(false);
                  setQuery('');
                }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${theme.borderLight}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
                onMouseLeave={(e) => (e.currentTarget.style.background = theme.surface)}
              >
                <div style={{ fontSize: 13, color: theme.textPrimary }}>{s.nw_cmsheadline}</div>
                <div style={{ fontSize: 10, color: theme.textSecondary }}>
                  {new Date(s.createdon).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 20px', background: '#FEE2E2', color: theme.danger, borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: theme.textSecondary }}>
          Loading article checks...
        </div>
      ) : story ? (
        <>
          {/* Article Header */}
          <div
            style={{
              background: theme.surface,
              borderRadius: 8,
              border: `1px solid ${theme.borderLight}`,
              padding: '16px 24px',
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderLeft: `5px solid ${
                discrepancyCount > 0
                  ? theme.danger
                  : failCount > 0
                  ? theme.warning
                  : theme.success
              }`,
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: theme.textPrimary }}>
              {story.nw_cmsheadline}
            </h2>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
              {story.nw_nodeid ? `Node ID: ${story.nw_nodeid}  |  ` : ''}
              Created: {new Date(story.createdon).toLocaleDateString()}
              {story.nw_nodeid && (
                <>
                  {' | '}
                  <a
                    href={`https://www.newsweek.com/node/${story.nw_nodeid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.primary, textDecoration: 'none', fontWeight: 600 }}
                    onClick={() => trackViewStoryClick()}
                  >
                    View Story →
                  </a>
                </>
              )}
              {' | '}
              <a
                href={dataverseRecordUrl('nw_digitaleditorialstory', story.nw_digitaleditorialstoryid)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: theme.textSecondary, textDecoration: 'none', fontWeight: 600 }}
                onClick={() => trackDataverseClick('article_detail')}
              >
                Open in Dataverse →
              </a>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
              <span style={{ color: theme.success }}>{passCount} Pass</span>
              {' | '}
              <span style={{ color: theme.danger }}>{failCount} Fail</span>
              {' | '}
              <span style={{ color: theme.warning }}>{uncertainCount} Uncertain</span>
              {' — '}
              {totalChecks} total checks
            </div>
            <div style={{ fontSize: 12, color: theme.textSecondary }}>
              Human reviewed: {humanReviewedCount}/{totalChecks}
              {' | '}
              <span style={{ color: theme.success }}>Agreements: {agreementCount}</span>
              {' | '}
              <span style={{ color: discrepancyCount > 0 ? theme.danger : theme.success, fontWeight: discrepancyCount > 0 ? 700 : 400 }}>
                Discrepancies: {discrepancyCount}
              </span>
            </div>
          </div>

          {/* Check Results */}
          {storyChecks.map((check) => (
            <CheckCard key={check.nw_contentcheckid} check={check} />
          ))}
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: 80,
            background: theme.surface,
            borderRadius: 8,
            border: `1px solid ${theme.borderLight}`,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 14, color: theme.textSecondary }}>
            Search for an article above to view its content check results
          </div>
        </div>
      )}
    </div>
  );
}
