import { useState, useMemo } from 'react';
import { theme } from '../theme';
import { ResultBadge } from './ResultBadge';
import { HumanBadge } from './HumanBadge';
import { InfoTooltip } from './InfoTooltip';
import { FeedbackPanel } from './FeedbackPanel';
import { dataverseRecordUrl } from '../services/orgUrl';
import { AI_RESULT, HUMAN_RESULT, getHumanResultLabel } from '../types/dataverse';
import type { ContentCheckCatalogue, DiscrepancyCheck } from '../types/dataverse';
import {
  trackDiscrepancyFilter,
  trackCheckExpand,
  trackDataverseClick,
  trackViewStoryClick,
  trackArticleVisit,
} from '../services/clarity';

interface Props {
  discrepancies: DiscrepancyCheck[];
  catalogue: ContentCheckCatalogue[];
  onSelectStory: (storyId: string) => void;
}

type TypeFilter = 'all' | 'ai_yes_human_no' | 'ai_no_human_yes' | 'ai_uncertain_human_yes' | 'ai_uncertain_human_no';

const typeLabels: Record<TypeFilter, string> = {
  all: 'All Discrepancies',
  ai_yes_human_no: 'AI said Pass, Human said Fail',
  ai_no_human_yes: 'AI said Fail, Human said Pass',
  ai_uncertain_human_yes: 'AI said Uncertain, Human said Pass',
  ai_uncertain_human_no: 'AI said Uncertain, Human said Fail',
};

/* ── Group by article ── */

interface ArticleGroup {
  storyId: string;
  headline: string;
  nodeId: string | null;
  checks: DiscrepancyCheck[];
  createdOn: string;
  typeCounts: Record<string, number>;
}

function groupByArticle(checks: DiscrepancyCheck[]): ArticleGroup[] {
  const map = new Map<string, DiscrepancyCheck[]>();
  for (const c of checks) {
    const key = c._nw_relatedstory_value;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const groups: ArticleGroup[] = [];
  for (const [storyId, groupChecks] of map) {
    const typeCounts: Record<string, number> = {};
    for (const c of groupChecks) {
      typeCounts[c.discrepancyType] = (typeCounts[c.discrepancyType] || 0) + 1;
    }
    groups.push({
      storyId,
      headline: groupChecks[0]?._nw_relatedstory_formatted || 'Untitled Article',
      nodeId: groupChecks[0]?._nw_relatedstory_nodeid ?? null,
      checks: groupChecks,
      createdOn: groupChecks[0]?.createdon || '',
      typeCounts,
    });
  }
  groups.sort((a, b) => b.checks.length - a.checks.length || new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
  return groups;
}

/* ── Check detail row (expandable) ── */

function CheckDetailRow({ check }: { check: DiscrepancyCheck }) {
  const [expanded, setExpanded] = useState(false);
  const hasAIDetails = !!(
    check.nw_aicorrect || check.nw_aiincorrect || check.nw_aievidence || check.nw_aifixrequired
  );

  return (
    <div style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
      {/* Row summary */}
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
        </div>
        <div><ResultBadge value={check.nw_airesult} /></div>
        <div><HumanBadge value={check.nw_contentcheckcompletedchoice} /></div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 10, color: theme.primary, fontWeight: 600, userSelect: 'none' }}>
            {expanded ? '▼ Collapse' : '▶ Details'}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
              <DetailField
                label="Verdict"
                value={check.nw_airesult === AI_RESULT.YES ? 'Pass' : check.nw_airesult === AI_RESULT.NO ? 'Fail' : 'Uncertain'}
                color={check.nw_airesult === AI_RESULT.YES ? theme.success : check.nw_airesult === AI_RESULT.NO ? theme.danger : theme.warning}
              />
              {check.nw_aireviewedon && (
                <DetailField label="Reviewed On" value={new Date(check.nw_aireviewedon).toLocaleDateString()} />
              )}
              {check.nw_aicorrect && <DetailField label="Correct" value={check.nw_aicorrect} color={theme.success} />}
              {check.nw_aiincorrect && <DetailField label="Incorrect" value={check.nw_aiincorrect} color={theme.danger} />}
              {check.nw_aievidence && <DetailField label="Evidence" value={check.nw_aievidence} color="#6366F1" />}
              {check.nw_aifixrequired && <DetailField label="Fix Required" value={check.nw_aifixrequired} color={theme.warning} />}
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
                color={check.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES ? theme.success : theme.danger}
              />
              {check._nw_checkedbyid_formatted && (
                <DetailField label="Reviewed By" value={check._nw_checkedbyid_formatted} />
              )}
              {check.nw_checkedon && (
                <DetailField label="Reviewed On" value={new Date(check.nw_checkedon).toLocaleDateString()} />
              )}
            </div>
          )}

          {/* Discrepancy callout */}
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
            AI says: {check.nw_airesult === AI_RESULT.YES ? 'Pass' : check.nw_airesult === AI_RESULT.NO ? 'Fail' : 'Uncertain'}
            {' — '}
            Human says: {getHumanResultLabel(check.nw_contentcheckcompletedchoice)}
          </div>

          {/* Feedback form */}
          <div style={{ width: '100%', marginTop: 8 }}>
            <FeedbackPanel check={check} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, color }: { label: string; value: string; color?: string }) {
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
      <div style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  );
}

/* ── Article Card ── */

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

  return (
    <div
      data-story-id={group.storyId}
      style={{
        background: theme.surface,
        borderRadius: 10,
        border: `1px solid ${theme.borderLight}`,
        borderLeft: `5px solid ${theme.danger}`,
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
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.3 }}>
            {group.headline}
          </div>
          <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 3 }}>
            {group.checks.length} discrepanc{group.checks.length !== 1 ? 'ies' : 'y'} | {group.createdOn ? new Date(group.createdOn).toLocaleDateString() : ''}
          </div>
        </div>

        {/* Discrepancy type pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {group.typeCounts['ai_yes_human_no'] > 0 && (
            <StatPill label="AI Pass / Human Fail" count={group.typeCounts['ai_yes_human_no']} color={theme.danger} />
          )}
          {group.typeCounts['ai_no_human_yes'] > 0 && (
            <StatPill label="AI Fail / Human Pass" count={group.typeCounts['ai_no_human_yes']} color={theme.warning} />
          )}
          {group.typeCounts['ai_uncertain_human_yes'] > 0 && (
            <StatPill label="AI Uncertain / Human Pass" count={group.typeCounts['ai_uncertain_human_yes']} color="#6366F1" />
          )}
          {group.typeCounts['ai_uncertain_human_no'] > 0 && (
            <StatPill label="AI Uncertain / Human Fail" count={group.typeCounts['ai_uncertain_human_no']} color="#6366F1" />
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { trackArticleVisit(group.headline); onSelectStory(group.storyId); }}
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
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.primary; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.primary; }}
          >
            Full Article
          </button>
          {group.nodeId && (
            <a
              href={`https://www.newsweek.com/node/${group.nodeId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackViewStoryClick()}
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
            onClick={() => trackDataverseClick('discrepancy')}
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

      {/* Subgrid — check rows */}
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

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        fontSize: 10,
        fontWeight: 700,
        color,
      }}
    >
      {count} {label}
    </span>
  );
}

/* ── Main Screen ── */

export function DiscrepancyScreen({
  discrepancies,
  catalogue,
  onSelectStory,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = discrepancies;
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.discrepancyType === typeFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((c) => c._nw_contentcheck_value === categoryFilter);
    }
    return result;
  }, [discrepancies, typeFilter, categoryFilter]);

  const groups = useMemo(() => groupByArticle(filtered), [filtered]);

  // Discrepancy type counts (from full set, not filtered)
  const typeCounts = useMemo(() => ({
    ai_yes_human_no: discrepancies.filter((c) => c.discrepancyType === 'ai_yes_human_no').length,
    ai_no_human_yes: discrepancies.filter((c) => c.discrepancyType === 'ai_no_human_yes').length,
    ai_uncertain_human_yes: discrepancies.filter((c) => c.discrepancyType === 'ai_uncertain_human_yes').length,
    ai_uncertain_human_no: discrepancies.filter((c) => c.discrepancyType === 'ai_uncertain_human_no').length,
  }), [discrepancies]);

  return (
    <div data-scroll-container style={{ padding: 24, flex: 1, overflow: 'auto' }}>
      <h1 style={{ margin: '0 0 16px', fontSize: 22, color: theme.textPrimary, display: 'flex', alignItems: 'center' }}>
        Discrepancy Analysis
        <InfoTooltip text="Lists all checks where AI and human reviewers gave different verdicts. Use the cards and filters to narrow by discrepancy type or check category. Expand an article to see each discrepant check with AI and human review details." />
      </h1>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(Object.keys(typeCounts) as (keyof typeof typeCounts)[]).map((key) => (
          <div
            key={key}
            onClick={() => {
              const next = typeFilter === key ? 'all' : key;
              trackDiscrepancyFilter(next);
              setTypeFilter(next);
            }}
            style={{
              flex: 1,
              background: typeFilter === key ? theme.primary : theme.surface,
              borderRadius: 8,
              border: `1px solid ${typeFilter === key ? theme.primary : theme.borderLight}`,
              padding: '12px 16px',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: typeFilter === key ? '#fff' : theme.textPrimary }}>
              {typeCounts[key]}
            </div>
            <div style={{ fontSize: 10, color: typeFilter === key ? 'rgba(255,255,255,0.8)' : theme.textSecondary, marginTop: 2 }}>
              {typeLabels[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: theme.textSecondary }}>Type:</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          style={{ padding: '6px 10px', border: `1px solid ${theme.borderLight}`, borderRadius: 6, fontSize: 13 }}
        >
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <label style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 8 }}>Category:</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '6px 10px', border: `1px solid ${theme.borderLight}`, borderRadius: 6, fontSize: 13 }}
        >
          <option value="all">All Categories</option>
          {catalogue.map((cat) => (
            <option key={cat.nw_contentcheckcatalogueid} value={cat.nw_contentcheckcatalogueid}>
              {cat.nw_name}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: 13, color: theme.textSecondary }}>
          <span style={{ fontWeight: 600, color: filtered.length > 0 ? theme.danger : theme.success }}>
            {filtered.length}
          </span>
          {' '}discrepanc{filtered.length !== 1 ? 'ies' : 'y'} across{' '}
          <span style={{ fontWeight: 600 }}>{groups.length}</span>
          {' '}article{groups.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Grouped article cards */}
      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: theme.surface, borderRadius: 8, border: `1px solid ${theme.borderLight}`, color: theme.success, fontSize: 14 }}>
          No discrepancies found for the selected filters
        </div>
      ) : (
        groups.map((group) => (
          <ArticleCard
            key={group.storyId}
            group={group}
            defaultExpanded={groups.length <= 5}
            onSelectStory={onSelectStory}
          />
        ))
      )}
    </div>
  );
}
