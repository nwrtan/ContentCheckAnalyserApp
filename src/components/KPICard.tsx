import { theme } from '../theme';
import { InfoTooltip } from './InfoTooltip';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  tooltip?: string;
  onClick?: () => void;
}

export function KPICard({ label, value, subtitle, color = theme.textPrimary, tooltip, onClick }: KPICardProps) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        background: theme.surface,
        borderRadius: 8,
        border: `1px solid ${theme.borderLight}`,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
          e.currentTarget.style.borderColor = theme.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.borderColor = theme.borderLight;
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{value}</span>
        {subtitle && (
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.textSecondary }}>{subtitle}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
        {clickable && (
          <span style={{ marginLeft: 6, fontSize: 10, color: theme.primary, fontWeight: 600 }}>
            View records
          </span>
        )}
      </div>
    </div>
  );
}
