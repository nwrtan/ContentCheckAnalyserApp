import { useState, useEffect, useCallback } from 'react';
import {
  fetchContentChecks,
  fetchCatalogue,
  fetchChecksForStory,
  fetchStory,
  searchStories,
  debugFetchAllColumns,
} from '../services/api';
import type {
  ContentCheck,
  ContentCheckCatalogue,
  DigitalEditorialStory,
  CategorySummary,
  WeekBucket,
  DiscrepancyCheck,
  DiscrepancyType,
} from '../types/dataverse';
import { AI_RESULT, HUMAN_RESULT } from '../types/dataverse';

// ── helpers ──

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isHumanReviewed(c: ContentCheck): boolean {
  return c._nw_checkedbyid_value != null;
}

function isBothReviewed(c: ContentCheck): boolean {
  return c.nw_airesult != null && isHumanReviewed(c);
}

function isAgreement(c: ContentCheck): boolean {
  if (!isBothReviewed(c)) return false;
  const aiYes = c.nw_airesult === AI_RESULT.YES;
  const humanYes = c.nw_contentcheckcompletedchoice === HUMAN_RESULT.YES;
  return (aiYes && humanYes) || (!aiYes && !humanYes);
}

function getDiscrepancyType(c: ContentCheck): DiscrepancyType | null {
  if (!isBothReviewed(c)) return null;
  const ai = c.nw_airesult;
  const human = c.nw_contentcheckcompletedchoice;
  if (ai === AI_RESULT.YES && human === HUMAN_RESULT.NO) return 'ai_yes_human_no';
  if (ai === AI_RESULT.NO && human === HUMAN_RESULT.YES) return 'ai_no_human_yes';
  if (ai === AI_RESULT.UNCERTAIN && human === HUMAN_RESULT.YES) return 'ai_uncertain_human_yes';
  if (ai === AI_RESULT.UNCERTAIN && human === HUMAN_RESULT.NO) return 'ai_uncertain_human_no';
  return null;
}

function buildCategorySummaries(
  checks: ContentCheck[],
  catalogue: ContentCheckCatalogue[]
): CategorySummary[] {
  return catalogue.map((cat) => {
    const catChecks = checks.filter(
      (c) => c._nw_contentcheck_value === cat.nw_contentcheckcatalogueid
    );
    const total = catChecks.length;
    const passCount = catChecks.filter((c) => c.nw_airesult === AI_RESULT.YES).length;
    const failCount = catChecks.filter((c) => c.nw_airesult === AI_RESULT.NO).length;
    const uncertainCount = catChecks.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN).length;
    const humanReviewedCount = catChecks.filter(isHumanReviewed).length;
    const bothReviewed = catChecks.filter(isBothReviewed);
    const agreementCount = bothReviewed.filter(isAgreement).length;
    const discrepancyCount = bothReviewed.length - agreementCount;
    return {
      catalogueId: cat.nw_contentcheckcatalogueid,
      name: cat.nw_name,
      total,
      passCount,
      failCount,
      uncertainCount,
      passRate: total > 0 ? Math.round((passCount / total) * 100) : 0,
      humanReviewedCount,
      agreementCount,
      discrepancyCount,
      agreementRate: bothReviewed.length > 0 ? Math.round((agreementCount / bothReviewed.length) * 100) : 0,
    };
  });
}

function getCheckDate(c: ContentCheck): Date {
  return new Date(c.nw_aireviewedon || c.createdon);
}

function buildWeeklyBuckets(checks: ContentCheck[], dateFrom: Date, dateTo: Date): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  let start = new Date(dateFrom);

  while (start < dateTo) {
    const end = new Date(start.getTime() + weekMs);
    const weekChecks = checks.filter((c) => {
      const d = getCheckDate(c);
      return d >= start && d < end;
    });
    const total = weekChecks.length;
    const passCount = weekChecks.filter((c) => c.nw_airesult === AI_RESULT.YES).length;
    const failCount = weekChecks.filter((c) => c.nw_airesult === AI_RESULT.NO).length;
    const uncertainCount = weekChecks.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN).length;
    const aiReviewedCount = weekChecks.filter((c) => c.nw_airesult != null).length;
    const humanReviewedCount = weekChecks.filter(isHumanReviewed).length;
    const bothReviewed = weekChecks.filter(isBothReviewed);
    const agreementCount = bothReviewed.filter(isAgreement).length;
    const discrepancyCount = bothReviewed.length - agreementCount;

    buckets.push({
      weekLabel: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekStart: new Date(start),
      total,
      passCount,
      failCount,
      uncertainCount,
      passRate: total > 0 ? Math.round((passCount / total) * 100) : 0,
      aiReviewedCount,
      humanReviewedCount,
      bothReviewedCount: bothReviewed.length,
      agreementCount,
      discrepancyCount,
      agreementRate: bothReviewed.length > 0 ? Math.round((agreementCount / bothReviewed.length) * 100) : 0,
    });

    start = end;
  }
  return buckets;
}

// ── main hook ──

export function useContentChecks() {
  const [checks, setChecks] = useState<ContentCheck[]>([]);
  const [catalogue, setCatalogue] = useState<ContentCheckCatalogue[]>([]);
  const [dateFrom, setDateFrom] = useState<Date>(daysAgo(7));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    setError(null);
    try {
      const [checksData, catalogueData] = await Promise.all([
        fetchContentChecks(from, to),
        fetchCatalogue(),
      ]);
      setChecks(checksData);
      setCatalogue(catalogueData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(dateFrom, dateTo);
    debugFetchAllColumns(); // DEBUG: log all available columns
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyDateFilter = useCallback(
    (from: Date, to: Date) => {
      setDateFrom(from);
      setDateTo(to);
      loadData(from, to);
    },
    [loadData]
  );

  // Derived data
  const totalChecks = checks.length;
  const aiReviewedChecks = checks.filter((c) => c.nw_airesult != null);
  const aiReviewedCount = aiReviewedChecks.length;
  const passCount = checks.filter((c) => c.nw_airesult === AI_RESULT.YES).length;
  const failCount = checks.filter((c) => c.nw_airesult === AI_RESULT.NO).length;
  const uncertainCount = checks.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN).length;
  const uniqueArticles = new Set(checks.map((c) => c._nw_relatedstory_value)).size;
  // Pass rate based on AI-reviewed checks only (excludes pending/null)
  const passRate = aiReviewedCount > 0 ? Math.round((passCount / aiReviewedCount) * 1000) / 10 : 0;
  const flaggedRate =
    aiReviewedCount > 0
      ? Math.round(((failCount + uncertainCount) / aiReviewedCount) * 1000) / 10
      : 0;
  const aiCoverage = totalChecks > 0 ? Math.round((aiReviewedCount / totalChecks) * 1000) / 10 : 0;

  // Human review stats
  const humanReviewedCount = checks.filter(isHumanReviewed).length;
  const humanCoverage = totalChecks > 0 ? Math.round((humanReviewedCount / totalChecks) * 1000) / 10 : 0;

  // AI vs Human comparison
  const bothReviewed = checks.filter(isBothReviewed);
  const agreementCount = bothReviewed.filter(isAgreement).length;
  const discrepancyCount = bothReviewed.length - agreementCount;
  const agreementRate = bothReviewed.length > 0 ? Math.round((agreementCount / bothReviewed.length) * 1000) / 10 : 0;

  // Discrepancies with type
  const discrepancies: DiscrepancyCheck[] = checks
    .map((c) => {
      const dt = getDiscrepancyType(c);
      return dt ? { ...c, discrepancyType: dt } : null;
    })
    .filter((c): c is DiscrepancyCheck => c !== null);

  const categorySummaries = buildCategorySummaries(checks, catalogue);
  const weeklyBuckets = buildWeeklyBuckets(checks, dateFrom, dateTo);

  const flaggedChecks = checks.filter(
    (c) => c.nw_airesult !== AI_RESULT.YES
  );

  return {
    checks,
    catalogue,
    dateFrom,
    dateTo,
    loading,
    error,
    applyDateFilter,
    totalChecks,
    aiReviewedCount,
    aiCoverage,
    passCount,
    failCount,
    uncertainCount,
    uniqueArticles,
    passRate,
    flaggedRate,
    humanReviewedCount,
    humanCoverage,
    agreementCount,
    discrepancyCount,
    agreementRate,
    bothReviewedCount: bothReviewed.length,
    discrepancies,
    categorySummaries,
    weeklyBuckets,
    flaggedChecks,
  };
}

// ── article drill-down hook ──

export function useArticleDrillDown() {
  const [storyChecks, setStoryChecks] = useState<ContentCheck[]>([]);
  const [story, setStory] = useState<DigitalEditorialStory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStory = useCallback(async (storyId: string) => {
    setLoading(true);
    setError(null);
    console.log(`[DrillDown] Loading story: ${storyId}`);
    try {
      const [storyData, checksData] = await Promise.all([
        fetchStory(storyId),
        fetchChecksForStory(storyId),
      ]);
      console.log(`[DrillDown] Story: ${storyData?.nw_cmsheadline}, Checks: ${checksData.length}`);
      setStory(storyData);
      setStoryChecks(checksData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[DrillDown] Error for storyId=${storyId}:`, e);
      setError(`Failed to load checks (storyId: ${storyId.slice(0, 8)}...): ${msg}`);
      setStory(null);
      setStoryChecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const passCount = storyChecks.filter((c) => c.nw_airesult === AI_RESULT.YES).length;
  const failCount = storyChecks.filter((c) => c.nw_airesult === AI_RESULT.NO).length;
  const uncertainCount = storyChecks.filter((c) => c.nw_airesult === AI_RESULT.UNCERTAIN).length;
  const humanReviewedCount = storyChecks.filter(isHumanReviewed).length;
  const bothReviewed = storyChecks.filter(isBothReviewed);
  const agreementCount = bothReviewed.filter(isAgreement).length;
  const discrepancyCount = bothReviewed.length - agreementCount;

  return {
    story,
    storyChecks,
    loading,
    error,
    loadStory,
    passCount,
    failCount,
    uncertainCount,
    humanReviewedCount,
    agreementCount,
    discrepancyCount,
  };
}

// ── search hook ──

export function useStorySearch() {
  const [results, setResults] = useState<DigitalEditorialStory[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchStories(query);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, searching, search, clear };
}
