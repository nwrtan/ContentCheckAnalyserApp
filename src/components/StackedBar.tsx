import { theme } from '../theme';

interface StackedBarProps {
  passCount: number;
  failCount: number;
  uncertainCount: number;
  height?: number;
}

export function StackedBar({
  passCount,
  failCount,
  uncertainCount,
  height = 24,
}: StackedBarProps) {
  const total = passCount + failCount + uncertainCount;
  if (total === 0) {
    return (
      <div
        style={{
          height,
          background: theme.borderLight,
          borderRadius: 4,
          width: '100%',
        }}
      />
    );
  }

  const passPct = (passCount / total) * 100;
  const failPct = (failCount / total) * 100;
  const uncPct = (uncertainCount / total) * 100;

  return (
    <div
      style={{
        display: 'flex',
        height,
        borderRadius: 4,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {passPct > 0 && (
        <div
          style={{ width: `${passPct}%`, background: theme.success }}
          title={`Pass: ${passCount}`}
        />
      )}
      {failPct > 0 && (
        <div
          style={{ width: `${failPct}%`, background: theme.danger }}
          title={`Fail: ${failCount}`}
        />
      )}
      {uncPct > 0 && (
        <div
          style={{ width: `${uncPct}%`, background: theme.warning }}
          title={`Uncertain: ${uncertainCount}`}
        />
      )}
    </div>
  );
}
