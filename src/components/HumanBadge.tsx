import { getHumanResultLabel, getHumanResultColor } from '../types/dataverse';

interface Props {
  value: number | null;
}

export function HumanBadge({ value }: Props) {
  const label = getHumanResultLabel(value);
  const color = getHumanResultColor(value);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 4,
        background: color,
        color: '#fff',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
}
