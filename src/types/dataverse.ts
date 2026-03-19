// Dataverse entity types for Content Check Analyser

export interface ContentCheck {
  nw_contentcheckid: string;
  nw_name: string;
  nw_airesult: number | null; // 125050000=Yes/Pass, 125050001=No/Fail, 125050002=Uncertain, null=Pending
  nw_aicorrect: string | null;    // What the Writer Did Correctly
  nw_aiincorrect: string | null;  // What the Writer Did Incorrectly
  nw_aievidence: string | null;   // Evidence From the Story
  nw_aifixrequired: string | null; // Fix Required
  nw_aireviewedon: string; // ISO datetime
  nw_contentcheckcompletedchoice: number | null; // 125050000=Yes, 125050001=No — Human result
  _nw_checkedbyid_value: string | null; // FK to user (human reviewer)
  nw_checkedon: string | null; // ISO datetime — when human checked
  _nw_relatedstory_value: string; // FK to story
  _nw_contentcheck_value: string; // FK to catalogue
  createdon: string;
  // Feedback fields
  nw_reviewfeedback: string | null;
  _nw_feedbackbyid_value: string | null;
  nw_feedbackon: string | null;
  // Formatted lookup values (populated when odata annotations are requested)
  _nw_checkedbyid_formatted?: string | null;
  _nw_contentcheck_formatted?: string | null;
  _nw_relatedstory_formatted?: string | null;
  _nw_feedbackbyid_formatted?: string | null;
  // Expanded story fields
  _nw_relatedstory_storyurl?: string | null;
  _nw_relatedstory_nodeid?: string | null;
}

export interface ContentCheckCatalogue {
  nw_contentcheckcatalogueid: string;
  nw_name: string;
  nw_prompt?: string;
  nw_contentcheckdescription?: string;
}

export interface DigitalEditorialStory {
  nw_digitaleditorialstoryid: string;
  nw_cmsheadline: string;
  nw_nodeid?: number;
  nw_storyurl?: string;
  nw_publishingeditorialoutcome?: number;
  createdon: string;
}

// AI Result enum
export const AI_RESULT = {
  YES: 125050000,
  NO: 125050001,
  UNCERTAIN: 125050002,
} as const;

// Human Result enum
export const HUMAN_RESULT = {
  YES: 125050000,
  NO: 125050001,
} as const;

export type AIResultValue = (typeof AI_RESULT)[keyof typeof AI_RESULT];

export function getResultLabel(value: number | null): string {
  switch (value) {
    case AI_RESULT.YES: return 'Pass';
    case AI_RESULT.NO: return 'Fail';
    case AI_RESULT.UNCERTAIN: return 'Uncertain';
    case null: return 'Pending';
    default: return 'Unknown';
  }
}

export function getHumanResultLabel(value: number | null): string {
  switch (value) {
    case HUMAN_RESULT.YES: return 'Pass';
    case HUMAN_RESULT.NO: return 'Fail';
    case null: return 'Not Reviewed';
    default: return 'Unknown';
  }
}

export function getResultColor(value: number | null): string {
  switch (value) {
    case AI_RESULT.YES: return '#10B981';
    case AI_RESULT.NO: return '#EF4444';
    case AI_RESULT.UNCERTAIN: return '#F59E0B';
    case null: return '#9CA3AF';
    default: return '#6B7280';
  }
}

export function getHumanResultColor(value: number | null): string {
  switch (value) {
    case HUMAN_RESULT.YES: return '#10B981';
    case HUMAN_RESULT.NO: return '#EF4444';
    case null: return '#9CA3AF';
    default: return '#6B7280';
  }
}

// Weekly trend bucket
export interface WeekBucket {
  weekLabel: string;
  weekStart: Date;
  total: number;
  passCount: number;
  failCount: number;
  uncertainCount: number;
  passRate: number;
  aiReviewedCount: number;
  humanReviewedCount: number;
  bothReviewedCount: number;
  agreementCount: number;
  discrepancyCount: number;
  agreementRate: number;
}

// Category summary
export interface CategorySummary {
  catalogueId: string;
  name: string;
  total: number;
  passCount: number;
  failCount: number;
  uncertainCount: number;
  passRate: number;
  humanReviewedCount: number;
  agreementCount: number;
  discrepancyCount: number;
  agreementRate: number;
}

// Discrepancy types
export type DiscrepancyType = 'ai_yes_human_no' | 'ai_no_human_yes' | 'ai_uncertain_human_yes' | 'ai_uncertain_human_no';

export interface DiscrepancyCheck extends ContentCheck {
  discrepancyType: DiscrepancyType;
}
