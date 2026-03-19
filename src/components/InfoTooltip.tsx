import { useState, useRef, useEffect } from 'react';

interface Props {
  text: string;
}

export function InfoTooltip({ text }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'below' | 'above'>('below');
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (visible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      // If tooltip would go below viewport, show above
      setPosition(rect.bottom + 120 > window.innerHeight ? 'above' : 'below');
    }
  }, [visible]);

  return (
    <span
      ref={iconRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4, cursor: 'help' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#D1D5DB',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        i
      </span>
      {visible && (
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...(position === 'below'
              ? { top: 20 }
              : { bottom: 20 }),
            background: '#1F2937',
            color: '#F9FAFB',
            fontSize: 11,
            lineHeight: 1.5,
            padding: '8px 12px',
            borderRadius: 6,
            width: 220,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            fontWeight: 400,
            whiteSpace: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
