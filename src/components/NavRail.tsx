import { theme } from '../theme';
import { version } from '../../package.json';

export type Screen = 'overview' | 'comparison' | 'discrepancies' | 'article' | 'trends' | 'drill';

interface NavRailProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
  canGoBack?: boolean;
  onBack?: () => void;
}

const navItems: { id: Screen; label: string; icon: string; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊', description: 'KPIs & coverage' },
  { id: 'comparison', label: 'AI vs Human', icon: '⚖️', description: 'Compare verdicts' },
  { id: 'discrepancies', label: 'Discrepancies', icon: '⚠️', description: 'Where they disagree' },
  { id: 'article', label: 'Article Lookup', icon: '🔍', description: 'Search by headline' },
];

export function NavRail({ active, onNavigate }: NavRailProps) {
  return (
    <nav
      style={{
        width: theme.navWidth,
        minWidth: theme.navWidth,
        height: '100vh',
        background: `linear-gradient(180deg, ${theme.secondary} 0%, #0F0F1E 100%)`,
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo / Title */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: theme.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            NW
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              Content Check
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 400 }}>
              Analyser
            </div>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div
        style={{
          padding: '16px 20px 8px',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Navigation
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 12px',
                border: 'none',
                borderRadius: 8,
                background: isActive
                  ? `linear-gradient(135deg, ${theme.primary}40, ${theme.primary}20)`
                  : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    borderRadius: 2,
                    background: theme.primary,
                  }}
                />
              )}
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ lineHeight: 1.3 }}>{item.label}</div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                    marginTop: 1,
                  }}
                >
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center',
        }}
      >
        Newsweek Editorial
        <br />
        v{version}
      </div>
    </nav>
  );
}
