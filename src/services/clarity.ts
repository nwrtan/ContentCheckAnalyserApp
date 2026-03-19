/**
 * Microsoft Clarity analytics integration.
 *
 * Initialisation follows the same pattern as the Editorial Workflow app:
 * 1. getContext() fetches user info from the Power Apps host
 * 2. initClarity() injects the script AND identifies the user in one call
 * 3. trackEvent / setTag helpers fire custom events throughout the app
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ──

export interface UserInfo {
  fullName: string;
  userPrincipalName: string;
  objectId: string;
}

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

// ── Clarity tracking IDs per environment ──

const CLARITY_IDS: Record<string, string> = {
  dev: 'vy7owg41w9',
  prod: 'vxqbidl42b',
};

function getEnvKey(): string {
  const DEV_ENV_ID = 'cea67299-6d6a-ec0f-8104-18c5691d8211';
  const href = window.location.href;
  if (href.includes('localhost') || href.includes(DEV_ENV_ID)) {
    return 'dev';
  }
  return 'prod';
}

// ── Get user info from Power Apps context ──

export async function getUserInfo(): Promise<UserInfo | null> {
  try {
    console.log('[clarity] getUserInfo: calling getContext()...');
    const { getContext } = await import('@microsoft/power-apps/app');
    const ctx = await getContext();
    console.log('[clarity] getContext() returned:', JSON.stringify(ctx.user));

    const user = ctx.user;
    if (!user?.userPrincipalName && !user?.fullName) {
      console.warn('[clarity] getContext() returned empty user');
      return null;
    }

    return {
      fullName: user.fullName ?? '',
      userPrincipalName: user.userPrincipalName ?? '',
      objectId: user.objectId ?? '',
    };
  } catch (err) {
    console.warn('[clarity] getUserInfo failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Initialization ──

let _initialized = false;

/**
 * Initialise Clarity and (optionally) identify the current user.
 *
 * @param user - User info to attach to the Clarity session.
 */
export function initClarity(user?: UserInfo | null): void {
  if (_initialized) return;
  _initialized = true;

  try {
    const env = getEnvKey();
    const trackingId = CLARITY_IDS[env] ?? CLARITY_IDS['dev'];

    if (!trackingId) {
      console.warn('[clarity] No tracking ID for env:', env);
      return;
    }

    injectClarityScript(trackingId);
    console.log('[clarity] Loaded with tracking ID:', trackingId, `(${env})`);

    if (user) {
      identifyUser(user, env);
    }
  } catch (err) {
    console.warn('[clarity] Failed to load:', err instanceof Error ? err.message : err);
  }
}

// ── Private helpers ──

function identifyUser(user: UserInfo, env: string): void {
  if (!window.clarity) return;

  try {
    // identify(customUserId, customSessionId?, customPageId?, friendlyName?)
    window.clarity('identify', user.userPrincipalName, undefined, undefined, user.fullName);

    // Custom session-level tags (appear under Filters → Custom tags)
    window.clarity('set', 'userName', user.fullName);
    window.clarity('set', 'userEmail', user.userPrincipalName);
    window.clarity('set', 'userId', user.objectId);
    window.clarity('set', 'environment', env);

    console.log('[clarity] User identified:', user.fullName, `(${user.userPrincipalName})`);
  } catch (err) {
    console.warn('[clarity] Failed to identify user:', err instanceof Error ? err.message : err);
  }
}

function injectClarityScript(trackingId: string): void {
  if (window.clarity) return;

  // Initialize the clarity command queue
  window.clarity = function (...args: unknown[]) {
    (window.clarity as unknown as { q: unknown[][] }).q =
      (window.clarity as unknown as { q: unknown[][] }).q || [];
    (window.clarity as unknown as { q: unknown[][] }).q.push(args);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${trackingId}`;
  document.head.appendChild(script);
}

// ── Custom event tracking ──

/**
 * Fire a Clarity custom event.
 */
export function trackEvent(eventName: string): void {
  if (!window.clarity) return;
  window.clarity('event', eventName);
}

/**
 * Set a custom tag (key-value pair) that appears as a filter in Clarity.
 */
export function setTag(key: string, value: string): void {
  if (!window.clarity) return;
  window.clarity('set', key, value);
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
