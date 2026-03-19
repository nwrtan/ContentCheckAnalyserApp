import { useState } from 'react';
import { theme } from '../theme';
import { submitFeedback } from '../services/api';
import { trackFeedbackSubmit } from '../services/clarity';
import type { ContentCheck } from '../types/dataverse';

interface Props {
  check: ContentCheck;
  onSubmitted?: (feedback: string) => void;
}

export function FeedbackPanel({ check, onSubmitted }: Props) {
  const [feedback, setFeedback] = useState(check.nw_reviewfeedback ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPrevious = !!check.nw_reviewfeedback;
  const hasChanged = feedback.trim() !== (check.nw_reviewfeedback ?? '').trim();

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await submitFeedback(check.nw_contentcheckid, feedback.trim());
      trackFeedbackSubmit(check.nw_name);
      setSuccess(true);
      onSubmitted?.(feedback.trim());
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 6,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
          Human Feedback
        </div>
        {hasPrevious && !hasChanged && (
          <span style={{ fontSize: 10, color: '#92400E', opacity: 0.6 }}>
            Submitted {check.nw_feedbackon ? new Date(check.nw_feedbackon).toLocaleDateString() : ''}
            {check._nw_feedbackbyid_formatted ? ` by ${check._nw_feedbackbyid_formatted}` : ''}
          </span>
        )}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => { setFeedback(e.target.value); setSuccess(false); setError(null); }}
        placeholder="Explain why AI and human results differ, or provide additional context for this check..."
        rows={3}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: `1px solid #FDE68A`,
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 1.5,
          resize: 'vertical',
          fontFamily: 'inherit',
          background: '#fff',
          boxSizing: 'border-box',
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#F59E0B'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#FDE68A'; }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting || !feedback.trim() || !hasChanged}
          style={{
            padding: '6px 16px',
            background: submitting || !feedback.trim() || !hasChanged ? '#D1D5DB' : '#F59E0B',
            color: submitting || !feedback.trim() || !hasChanged ? '#9CA3AF' : '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: submitting || !feedback.trim() || !hasChanged ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting...' : hasPrevious ? 'Update Feedback' : 'Submit Feedback'}
        </button>

        {success && (
          <span style={{ fontSize: 11, color: theme.success, fontWeight: 600 }}>
            Feedback saved
          </span>
        )}
        {error && (
          <span style={{ fontSize: 11, color: theme.danger, fontWeight: 600 }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
