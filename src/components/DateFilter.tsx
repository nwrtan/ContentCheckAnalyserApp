import { useState } from 'react';
import { theme } from '../theme';
import { trackDateFilter } from '../services/clarity';

interface DateFilterProps {
  dateFrom: Date;
  dateTo: Date;
  onApply: (from: Date, to: Date) => void;
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function DateFilter({ dateFrom, dateTo, onApply }: DateFilterProps) {
  const [from, setFrom] = useState(toInputDate(dateFrom));
  const [to, setTo] = useState(toInputDate(dateTo));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label style={{ fontSize: 12, color: theme.textSecondary }}>From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        style={{
          padding: '6px 10px',
          border: `1px solid ${theme.borderLight}`,
          borderRadius: 6,
          fontSize: 13,
        }}
      />
      <label style={{ fontSize: 12, color: theme.textSecondary }}>To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        style={{
          padding: '6px 10px',
          border: `1px solid ${theme.borderLight}`,
          borderRadius: 6,
          fontSize: 13,
        }}
      />
      <button
        onClick={() => {
          const fromDate = new Date(from + 'T00:00:00');
          const toDate = new Date(to + 'T23:59:59');
          if (fromDate > toDate) return;
          trackDateFilter();
          onApply(fromDate, toDate);
        }}
        disabled={from > to}
        style={{
          padding: '6px 20px',
          background: from > to ? theme.textSecondary : theme.primary,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 13,
          cursor: from > to ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        Apply
      </button>
      {from > to && (
        <span style={{ fontSize: 11, color: theme.danger }}>"From" must be before "To"</span>
      )}
    </div>
  );
}
