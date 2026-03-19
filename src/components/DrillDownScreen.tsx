import { useState, useMemo } from 'react';
import { theme } from '../theme';
import { ResultBadge } from './ResultBadge';
import { HumanBadge } from './HumanBadge';
import { InfoTooltip } from './InfoTooltip';
import { FeedbackPanel } from './FeedbackPanel';
import { dataverseRecordUrl } from '../services/orgUrl';
import { AI_RESULT, HUMAN_RESULT, getHumanResultLabel } from '../types/dataverse';
import type { ContentCheck } from '../types/dataverse';
import {
  trackCheckExpand,
  trackArticleVisit,
  trackDataverseClick,
  trackViewStoryClick,
  trackBackClick,
  trackDrillFilter,
} from '../services/clarity';

interface Props {
  title: string;
  records: ContentCheck[];
  onBack: () => void;
  onSelectStory: (storyId: string) => void;
}

/* ── Helpers ── */

interface ArticleGroup {
  storyId: string;
  headline: string;
  nodeId: string | null;
  checks: ContentCheck[];
  passCount: number;
  failCount: number;
  uncertainCount: number;
  humanReviewedCount: number;
  discrepancyCount: number;
  createdOn: string;
}

function hasDiscrepancy(c: ContentCheck): boolean {
  if (c.nw_airesult == null || c._nw_checkedbyid_value == null) return false;
  const aiYes = c.nw_airesult === AI_RESULT.YES;
  const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
  return !((aiYes && humanYes) || (!aiYes && !humanYes));
}

function groupByArticle(records: ContentCheck[]): ArticleGroup[] {
  const map = new Map<string, ContentCheck[]>();
  for (const r of records) {
    const key = r._nw_relatedstory_value;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  const groups: ArticleGroup[] = [];
  for (const [storyId, checks] of map) {
    const headline = checks[0]?._nw_relatedstory_formatted || 'Untitled Article';
    const nodeId = checks[0]?._nw_relatedstory_nodeid ?? null;
    groups.push({
      storyId,
      headline,
      nodeId,
      checks,
      passCount: checks.filter((c) => c.nw_airesult === AI_RESULT.YES).length,
      failCount: checks.filter((c) => c.nw_airesult === AI_RESULT.NO).length,
      uncertainCount: checks.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN).length,
      humanReviewedCount: checks.filter((c) => c._nw_checkedbyid_value != null).length,
      discrepancyCount: checks.filter(hasDiscrepancy).length,
      createdOn: checks[0]?.createdon || '',
    });
  }
  // Sort: most checks first, then by date desc
  groups.sort((a, b) => {
    if (a.discrepancyCount !== b.discrepancyCount) return b.discrepancyCount - a.discrepancyCount;
    if (a.passCount !== b.passCount) return b.passCount - a.passCount;
    return new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime();
  });
  return groups;
}

type FilterMode = 'all' | 'discrepancies' | 'fails' | 'uncertain';

/* ── Inline check detail row ── */
function CheckDetailRow({ check }: { check: ContentCheck }) {
  const [expanded, setExpanded] = useState(false);
  const disc = hasDiscrepancy(check);
  const hasAIDetails = !!(
    check.nw_aicorrect || check.nw_aiincorrect || check.nw_aievidence ||
    check.nw_aifixrequired
  );

  return (
    <div
      style={{
        borderBottom: `1px solid ${theme.borderLight}`,
        background: 'transparent',
      }}
    >
      {/* Row summary — always visible */}
      <div
        onClick={() => {
          if (!expanded) trackCheckExpand(check.nw_name);
          setExpanded(!expanded);
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px 100px 120px',
          alignItems: 'center',
          padding: '10px 16px',
          cursor: 'pointer',
          gap: 8,
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {check.nw_name}
          </span>
          {disc && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#fff',
                background: theme.danger,
                padding: '1px 6px',
                borderRadius: 3,
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              Mismatch
            </span>
          )}
        </div>
        <div><ResultBadge value={check.nw_airesult} /></div>
        <div>
          <HumanBadge
            value={check._nw_checkedbyid_value ? check.nw_contentcheckcompletedchoice : null}
          />
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: 10,
              color: theme.primary,
              fontWeight: 600,
              userSelect: 'none',
            }}
          >
            {expanded ? '▼ Collapse' : '▶ Details'}
          </span>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div
          style={{
            padding: '0 16px 14px',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* AI Analysis */}
          {check.nw_airesult != null && (
            <div
              style={{
                flex: 1,
                minWidth: 280,
                background: '#EFF6FF',
                borderRadius: 6,
                padding: 12,
                border: '1px solid #DBEAFE',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#1E40AF',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>AI Analysis</span>
                <ResultBadge value={check.nw_airesult} />
              </div>
              {check.nw_aicorrect && (
                <DetailField label="Correct" value={check.nw_aicorrect} color={theme.success} />
              )}
              {check.nw_aiincorrect && (
                <DetailField label="Incorrect" value={check.nw_aiincorrect} color={theme.danger} />
              )}
              {check.nw_aievidence && (
                <DetailField label="Evidence" value={check.nw_aievidence} color="#6366F1" />
              )}
              {check.nw_aifixrequired && (
                <DetailField label="Fix Required" value={check.nw_aifixrequired} color={theme.warning} />
              )}
              {!hasAIDetails && (
                <div style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' }}>
                  No detailed analysis available.
                </div>
              )}
            </div>
          )}

          {/* Human Review */}
          {check._nw_checkedbyid_value && (
            <div
              style={{
                flex: 1,
                minWidth: 280,
                background: '#F0FDF4',
                borderRadius: 6,
                padding: 12,
                border: '1px solid #DCFCE7',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#166534',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Human Review</span>
                <HumanBadge value={check.nw_contentcheckcompletedchoice} />
              </div>
              <DetailField
                label="Verdict"
                value={getHumanResultLabel(check.nw_contentcheckcompletedchoice)}
                color={
                  check.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES
                    ? theme.success
                    : theme.danger
                }
              />
              {check._nw_checkedbyid_formatted && (
                <DetailField label="Reviewed By" value={check._nw_checkedbyid_formatted} />
              )}
              {check.nw_checkedon && (
                <DetailField
                  label="Reviewed On"
                  value={new Date(check.nw_checkedon).toLocaleDateString()}
                />
              )}
            </div>
          )}

          {/* Discrepancy callout */}
          {disc && (
            <div
              style={{
                width: '100%',
                padding: '8px 14px',
                background: '#FEF2F2',
                border: `1px solid ${theme.danger}`,
                borderRadius: 6,
                fontSize: 12,
                color: theme.danger,
                fontWeight: 600,
              }}
            >
              AI says:{' '}
              {check.nw_airesult === AI_RESULT.YES
                ? 'Pass'
                : check.nw_airesult === AI_RESULT.NO
                ? 'Fail'
                : 'Uncertain'}
              {' — '}
              Human says: {getHumanResultLabel(check.nw_contentcheckcompletedchoice)}
            </div>
          )}

          {/* Feedback form */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <FeedbackPanel check={check} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: color ?? theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: theme.textPrimary,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── Article Card with subgrid ── */
function ArticleCard({
  group,
  defaultExpanded,
  onSelectStory,
}: {
  group: ArticleGroup;
  defaultExpanded: boolean;
  onSelectStory: (storyId: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const borderColor = theme.borderLight;

  return (
    <div
      data-story-id={group.storyId}
      style={{
        background: theme.surface,
        borderRadius: 10,
        border: `1px solid ${theme.borderLight}`,
        borderLeft: `5px solid ${borderColor}`,
        marginBottom: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Article header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.background)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Expand icon */}
        <span style={{ fontSize: 12, color: theme.primary, fontWeight: 700, width: 16 }}>
          {expanded ? '▼' : '▶'}
        </span>

        {/* Headline */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.textPrimary,
              lineHeight: 1.3,
            }}
          >
            {group.headline}
          </div>
          <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 3 }}>
            {group.checks.length} checks | {group.createdOn ? new Date(group.createdOn).toLocaleDateString() : ''}
          </div>
        </div>

        {/* Quick stats pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatPill label="Pass" count={group.passCount} color={theme.success} />
          <StatPill label="Fail" count={group.failCount} color={theme.danger} />
          <StatPill label="Uncertain" count={group.uncertainCount} color={theme.warning} />
          {group.discrepancyCount > 0 && (
            <StatPill label="Discrepancy" count={group.discrepancyCount} color={theme.danger} filled />
          )}
        </div>

        {/* View full article + Dataverse link */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              trackArticleVisit(group.headline);
              onSelectStory(group.storyId);
            }}
            style={{
              background: 'none',
              border: `1px solid ${theme.primary}`,
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 11,
              color: theme.primary,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primary;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = theme.primary;
            }}
          >
            Full Article
          </button>
          {group.nodeId && (
            <a
              href={`https://www.newsweek.com/node/${group.nodeId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); trackViewStoryClick(); }}
              style={{
                padding: '5px 12px',
                border: `1px solid ${theme.primary}`,
                borderRadius: 6,
                fontSize: 11,
                color: theme.primary,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Newsweek.com
            </a>
          )}
          <a
            href={dataverseRecordUrl('nw_digitaleditorialstory', group.storyId)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); trackDataverseClick('drill_down'); }}
            style={{
              padding: '5px 12px',
              border: `1px solid ${theme.borderLight}`,
              borderRadius: 6,
              fontSize: 11,
              color: theme.textSecondary,
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Dataverse
          </a>
        </div>
      </div>

      {/* Subgrid — content checks */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${theme.borderLight}` }}>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 120px',
              padding: '8px 16px',
              background: theme.background,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Check Name
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              AI Result
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Human Result
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
              Details
            </span>
          </div>

          {/* Check rows */}
          {group.checks.map((check) => (
            <CheckDetailRow key={check.nw_contentcheckid} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  count,
  color,
  filled = false,
}: {
  label: string;
  count: number;
  color: string;
  filled?: boolean;
}) {
  if (count === 0 && !filled) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        background: filled ? color : `${color}15`,
        border: `1px solid ${color}40`,
        fontSize: 10,
        fontWeight: 700,
        color: filled ? '#fff' : color,
      }}
    >
      {count} {label}
    </span>
  );
}

/* ── Main Screen ── */

export function DrillDownScreen({ title, records, onBack, onSelectStory }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    let result = records;
    switch (filter) {
      case 'discrepancies':
        result = records.filter(hasDiscrepancy);
        break;
      case 'fails':
        result = records.filter((c) => c.nw_airesult === AI_RESULT.NO);
        break;
      case 'uncertain':
        result = records.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN);
        break;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c._nw_relatedstory_formatted?.toLowerCase().includes(q) ||
          c.nw_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, filter, searchQuery]);

  const groups = useMemo(() => groupByArticle(filteredRecords), [filteredRecords]);

  const discrepancyTotal = useMemo(() => records.filter(hasDiscrepancy).length, [records]);
  const failTotal = useMemo(() => records.filter((c) => c.nw_airesult === AI_RESULT.NO).length, [records]);
  const uncertainTotal = useMemo(() => records.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN).length, [records]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sticky header bar */}
      <div
        style={{
          padding: '16px 24px',
          background: theme.surface,
          borderBottom: `1px solid ${theme.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => { trackBackClick(); onBack(); }}
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

        {/* Title & count */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <h1 style={{ margin: 0, fontSize: 20, color: theme.textPrimary, lineHeight: 1.2 }}>
            {title}
          </h1>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center' }}>
            {records.length} check{records.length !== 1 ? 's' : ''} across{' '}
            {new Set(records.map((r) => r._nw_relatedstory_value)).size} article
            {new Set(records.map((r) => r._nw_relatedstory_value)).size !== 1 ? 's' : ''}
            {filter !== 'all' && ` (showing ${filteredRecords.length} filtered)`}
            <InfoTooltip text="Checks are grouped by article. Expand an article to see each individual check with AI and human review details. Use the filters above to narrow by result type." />
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search articles or checks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 14px',
            border: `1px solid ${theme.borderLight}`,
            borderRadius: 8,
            fontSize: 12,
            width: 220,
            outline: 'none',
          }}
        />
      </div>

      {/* Filter bar */}
      <div
        style={{
          padding: '10px 24px',
          background: theme.background,
          borderBottom: `1px solid ${theme.borderLight}`,
          display: 'flex',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <FilterChip
          label={`All (${records.length})`}
          active={filter === 'all'}
          onClick={() => { trackDrillFilter('all'); setFilter('all'); }}
        />
        <FilterChip
          label={`Discrepancies (${discrepancyTotal})`}
          active={filter === 'discrepancies'}
          onClick={() => { trackDrillFilter('discrepancies'); setFilter('discrepancies'); }}
          color={theme.danger}
        />
        <FilterChip
          label={`Fails (${failTotal})`}
          active={filter === 'fails'}
          onClick={() => { trackDrillFilter('fails'); setFilter('fails'); }}
          color={theme.danger}
        />
        <FilterChip
          label={`Uncertain (${uncertainTotal})`}
          active={filter === 'uncertain'}
          onClick={() => { trackDrillFilter('uncertain'); setFilter('uncertain'); }}
          color={theme.warning}
        />
      </div>

      {/* Scrollable content */}
      <div data-scroll-container style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {groups.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: theme.textSecondary,
              fontSize: 14,
              background: theme.surface,
              borderRadius: 8,
              border: `1px solid ${theme.borderLight}`,
            }}
          >
            No records match the current filter
          </div>
        ) : (
          groups.map((group) => (
            <ArticleCard
              key={group.storyId}
              group={group}
              defaultExpanded={groups.length <= 5 || group.discrepancyCount > 0}
              onSelectStory={onSelectStory}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  const chipColor = color ?? theme.primary;
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px',
        border: `1px solid ${active ? chipColor : theme.borderLight}`,
        borderRadius: 20,
        background: active ? chipColor : theme.surface,
        color: active ? '#fff' : theme.textPrimary,
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
