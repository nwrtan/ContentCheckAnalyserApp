import { theme } from '../theme';
import { ResultBadge } from './ResultBadge';
import { HumanBadge } from './HumanBadge';
import type { ContentCheck } from '../types/dataverse';

interface Props {
  title: string;
  records: ContentCheck[];
  onClose: () => void;
  onSelectStory: (storyId: string) => void;
}

export function RecordsDrawer({ title, records, onClose, onSelectStory }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 520,
        background: theme.surface,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${theme.borderLight}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.borderLight}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.background,
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: theme.textPrimary }}>{title}</h2>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
            {records.length} record{records.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${theme.borderLight}`,
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            color: theme.textPrimary,
          }}
        >
          Close
        </button>
      </div>

      {/* Records list */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: theme.textSecondary, fontSize: 13 }}>
            No records found
          </div>
        ) : (
          records.map((check) => (
            <div
              key={check.nw_contentcheckid}
              data-story-id={check._nw_relatedstory_value}
              onClick={() => onSelectStory(check._nw_relatedstory_value)}
              style={{
                background: theme.background,
                borderRadius: 8,
                border: `1px solid ${theme.borderLight}`,
                padding: '12px 16px',
                marginBottom: 8,
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              {check._nw_relatedstory_formatted && (
                <div style={{ fontSize: 11, color: theme.primary, fontWeight: 600, marginBottom: 4 }}>
                  {check._nw_relatedstory_formatted}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 6 }}>
                {check.nw_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: theme.textSecondary }}>AI:</span>
                <ResultBadge value={check.nw_airesult} />
                <span style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 6 }}>Human:</span>
                <HumanBadge value={check._nw_checkedbyid_value ? check.nw_contentcheckcompletedchoice : null} />
              </div>
              {check.nw_aiincorrect && (
                <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4, maxHeight: 32, overflow: 'hidden' }}>
                  {check.nw_aiincorrect.slice(0, 150)}{check.nw_aiincorrect.length > 150 ? '...' : ''}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: theme.textSecondary }}>
                  {new Date(check.createdon).toLocaleDateString()}
                </span>
                <span style={{ fontSize: 10, color: theme.primary, fontWeight: 600 }}>
                  View Article →
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Backdrop overlay for drawer */
export function DrawerBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.3)',
        zIndex: 99,
      }}
    />
  );
}
