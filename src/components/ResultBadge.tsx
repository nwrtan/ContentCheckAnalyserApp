import { getResultLabel, getResultColor } from '../types/dataverse';

interface ResultBadgeProps {
  value: number | null;
  size?: 'sm' | 'md';
}

export function ResultBadge({ value, size = 'sm' }: ResultBadgeProps) {
  const label = getResultLabel(value);
  const color = getResultColor(value);
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: isSmall ? '2px 10px' : '4px 14px',
        borderRadius: 4,
        background: color,
        color: '#fff',
        fontSize: isSmall ? 10 : 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
}
