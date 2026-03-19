/**
 * Microsoft Clarity analytics integration.
 *
 * Provides:
 * - Clarity script initialization
 * - User identification (username + email)
 * - Custom event tracking for buttons, navigation, feedback, etc.
 * - Custom tags for filtering in Clarity dashboard
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Dev: vy7owg41w9   |   Prod: vxqbidl42b
// Power Apps play URL contains the environment ID — use it to pick the right project
function getClarityProjectId(): string {
  const DEV_ENV_ID = 'cea67299-6d6a-ec0f-8104-18c5691d8211';
  const href = window.location.href;
  // Local dev or Dev environment → Dev Clarity project
  if (href.includes('localhost') || href.includes(DEV_ENV_ID)) {
    return 'vy7owg41w9';
  }
  return 'vxqbidl42b';
}

// ── Clarity global type ──

declare global {
  interface Window {
    clarity: (...args: any[]) => void;
  }
}

// ── Initialization ──

let _initialized = false;

export function initClarity(): void {
  if (_initialized) return;
  _initialized = true;

  const projectId = getClarityProjectId();
  console.log(`[Clarity] Initializing with project ID: ${projectId}`);

  // Clarity bootstrap snippet
  (function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode!.insertBefore(t, y);
  })(window, document, 'clarity', 'script', projectId);
}

// ── User identification ──

/**
 * Identify the current user in Clarity so sessions can be filtered by user.
 * Call once after you know who the user is.
 *
 * @see https://learn.microsoft.com/en-us/clarity/setup-and-installation/identify-api
 */
export function identifyUser(
  userId: string,
  sessionId?: string,
  pageName?: string,
  friendlyName?: string
): void {
  if (typeof window.clarity !== 'function') return;
  window.clarity('identify', userId, sessionId, pageName, friendlyName);
}

/**
 * Set a custom tag (key-value pair) that appears as a filter in Clarity.
 */
export function setTag(key: string, value: string): void {
  if (typeof window.clarity !== 'function') return;
  window.clarity('set', key, value);
}

// ── Custom event tracking ──

/**
 * Fire a Clarity custom event.
 * Events appear in the Clarity dashboard under "Custom events" and can be used
 * as filters on session recordings + heatmaps.
 */
export function trackEvent(eventName: string): void {
  if (typeof window.clarity !== 'function') return;
  window.clarity('event', eventName);
}

// ── Convenience wrappers (one per tracked action) ──

/** User navigated to a screen via the nav rail */
export function trackNavigation(screen: string): void {
  trackEvent(`nav_${screen}`);
  setTag('current_screen', screen);
}

/** User clicked "View Full Article" / story headline to visit an article */
export function trackArticleVisit(headline?: string): void {
  trackEvent('article_visit');
  if (headline) setTag('last_article', headline.slice(0, 100));
}

/** User clicked a story row from any list (overview, discrepancies, comparison, drill-down) */
export function trackStoryClick(storyId: string, source: string): void {
  trackEvent('story_click');
  setTag('story_click_source', source);
  setTag('last_story_id', storyId);
}

/** User submitted feedback on a content check */
export function trackFeedbackSubmit(checkName: string): void {
  trackEvent('feedback_submit');
  setTag('feedback_check', checkName.slice(0, 100));
}

/** User clicked the "Open in Dataverse" link */
export function trackDataverseClick(source: string): void {
  trackEvent('dataverse_click');
  setTag('dataverse_click_source', source);
}

/** User clicked the "Newsweek.com" / "View Story" external link */
export function trackViewStoryClick(): void {
  trackEvent('view_story_external');
}

/** User expanded a check card to view details */
export function trackCheckExpand(checkName: string): void {
  trackEvent('check_expand');
  setTag('expanded_check', checkName.slice(0, 100));
}

/** User applied a date filter */
export function trackDateFilter(): void {
  trackEvent('date_filter_apply');
}

/** User used the article search */
export function trackArticleSearch(query: string): void {
  trackEvent('article_search');
  setTag('search_query', query.slice(0, 100));
}

/** User clicked a KPI card to drill down */
export function trackKPIDrill(label: string): void {
  trackEvent('kpi_drill');
  setTag('kpi_label', label);
}

/** User clicked a discrepancy type filter card */
export function trackDiscrepancyFilter(filterType: string): void {
  trackEvent('discrepancy_filter');
  setTag('discrepancy_filter_type', filterType);
}

/** User toggled a chart mode in Trends */
export function trackChartModeToggle(mode: string): void {
  trackEvent('chart_mode_toggle');
  setTag('chart_mode', mode);
}

/** User clicked a weekly bar in Trends */
export function trackWeekDrill(weekLabel: string): void {
  trackEvent('week_drill');
  setTag('week_label', weekLabel);
}

/** User selected a category in Comparison screen */
export function trackCategorySelect(categoryName: string): void {
  trackEvent('category_select');
  setTag('selected_category', categoryName);
}

/** User clicked the Back button */
export function trackBackClick(): void {
  trackEvent('back_click');
}

/** User selected a filter chip in DrillDown */
export function trackDrillFilter(filterMode: string): void {
  trackEvent('drill_filter');
  setTag('drill_filter_mode', filterMode);
}
