import { useState, useCallback, useRef, useEffect } from 'react';
import { NavRail } from './components/NavRail';
import type { Screen } from './components/NavRail';
import { OverviewScreen } from './components/OverviewScreen';
import { ComparisonScreen } from './components/ComparisonScreen';
import { DiscrepancyScreen } from './components/DiscrepancyScreen';
import { ArticleScreen } from './components/ArticleScreen';
import { TrendsScreen } from './components/TrendsScreen';
import { DrillDownScreen } from './components/DrillDownScreen';
import { useContentChecks } from './hooks/useDataverse';
import { theme } from './theme';
import type { ContentCheck } from './types/dataverse';
import { trackNavigation, trackStoryClick, trackBackClick, identifyUser, setTag } from './services/clarity';
import { fetchCurrentUser } from './services/api';

interface DrillContext {
  title: string;
  records: ContentCheck[];
  returnScreen: Screen;
}

interface HistoryEntry {
  screen: Screen;
  scrollTop: number;
  highlightId: string | null; // storyId that was clicked
  drillContext: DrillContext | null;
}

function App() {
  const [screen, setScreen] = useState<Screen>('overview');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [drillContext, setDrillContext] = useState<DrillContext | null>(null);
  const [, setHighlightStoryId] = useState<string | null>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const mainRef = useRef<HTMLElement>(null);

  const data = useContentChecks();

  // Identify user in Clarity via Dataverse WhoAmI
  useEffect(() => {
    console.log('[Clarity] Starting user identification...');
    fetchCurrentUser().then((user) => {
      console.log('[Clarity] fetchCurrentUser returned:', user);
      if (user && user.userId) {
        identifyUser(user.userId, undefined, undefined, user.fullName || user.userId);
        if (user.fullName) setTag('user_name', user.fullName);
        if (user.email) setTag('user_email', user.email);
        setTag('user_id', user.userId);
        console.log(`[Clarity] Identified user: ${user.fullName} (${user.email}) [${user.userId}]`);
      } else {
        console.warn('[Clarity] No user data returned — user tags will not be set');
      }
    }).catch((e) => {
      console.error('[Clarity] User identification failed:', e);
    });
  }, []);

  const getScrollTop = useCallback(() => {
    // Find the scrollable container inside main
    const main = mainRef.current;
    if (!main) return 0;
    const scrollable = main.querySelector('[data-scroll-container]') as HTMLElement | null;
    return scrollable?.scrollTop ?? 0;
  }, []);

  const pushScreen = useCallback((next: Screen, clickedStoryId?: string | null) => {
    setScreen((prev) => {
      if (prev !== next) {
        historyRef.current.push({
          screen: prev,
          scrollTop: getScrollTop(),
          highlightId: clickedStoryId ?? null,
          drillContext: drillContext,
        });
      }
      return next;
    });
    setHighlightStoryId(null);
  }, [getScrollTop, drillContext]);

  const handleBack = useCallback(() => {
    trackBackClick();
    const entry = historyRef.current.pop();
    if (entry) {
      setScreen(entry.screen);
      setHighlightStoryId(entry.highlightId);
      if (entry.screen !== 'article') setSelectedStoryId(null);
      if (entry.drillContext) {
        setDrillContext(entry.drillContext);
      } else if (entry.screen !== 'drill') {
        setDrillContext(null);
      }
      // Restore scroll position after render
      requestAnimationFrame(() => {
        const main = mainRef.current;
        if (!main) return;
        const scrollable = main.querySelector('[data-scroll-container]') as HTMLElement | null;
        if (scrollable) {
          scrollable.scrollTop = entry.scrollTop;
        }
        // Scroll the highlighted element into view and flash it
        if (entry.highlightId) {
          requestAnimationFrame(() => {
            const el = document.querySelector(`[data-story-id="${entry.highlightId}"]`) as HTMLElement | null;
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'smooth' });
              el.style.transition = 'box-shadow 0.3s';
              el.style.boxShadow = `0 0 0 3px ${theme.primary}60`;
              setTimeout(() => {
                el.style.boxShadow = '';
              }, 2000);
            }
          });
        }
      });
    }
  }, []);

  const handleSelectStory = useCallback(
    (storyId: string) => {
      setSelectedStoryId(storyId);
      pushScreen('article', storyId);
      trackStoryClick(storyId, screen);
    },
    [pushScreen, screen]
  );

  const handleDrill = useCallback((title: string, records: ContentCheck[], returnScreen: Screen) => {
    setDrillContext({ title, records, returnScreen });
    pushScreen('drill');
  }, [pushScreen]);

  const handleDrillBack = useCallback(() => {
    handleBack();
  }, [handleBack]);

  const handleNavigate = useCallback((s: Screen) => {
    trackNavigation(s);
    pushScreen(s);
    if (s !== 'article') {
      setSelectedStoryId(null);
    }
    if (s !== 'drill') {
      setDrillContext(null);
    }
  }, [pushScreen]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: theme.background,
        fontFamily:
          "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        overflow: 'hidden',
      }}
    >
      <NavRail active={screen} onNavigate={handleNavigate} canGoBack={historyRef.current.length > 0} onBack={handleBack} />

      <main ref={mainRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Status banner */}
        <div
          style={{
            padding: '6px 24px',
            background: data.loading ? '#FEF3C7' : data.error ? '#FEE2E2' : '#D1FAE5',
            color: data.loading ? '#92400E' : data.error ? theme.danger : '#065F46',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {data.loading
              ? 'Loading data from Dataverse...'
              : data.error
              ? `Error: ${data.error}`
              : `${data.totalChecks} checks | ${data.uniqueArticles} articles | ${data.humanReviewedCount} human reviews | ${data.discrepancyCount} discrepancies`}
          </span>
          <span>
            {data.dateFrom.toLocaleDateString()} — {data.dateTo.toLocaleDateString()}
          </span>
        </div>

        {screen === 'overview' && (
          <OverviewScreen
            dateFrom={data.dateFrom}
            dateTo={data.dateTo}
            onApplyDate={data.applyDateFilter}
            totalChecks={data.totalChecks}
            aiReviewedCount={data.aiReviewedCount}
            aiCoverage={data.aiCoverage}
            uniqueArticles={data.uniqueArticles}
            humanCoverage={data.humanCoverage}
            humanReviewedCount={data.humanReviewedCount}
            agreementRate={data.agreementRate}
            discrepancyCount={data.discrepancyCount}
            bothReviewedCount={data.bothReviewedCount}
            categorySummaries={data.categorySummaries}
            checks={data.checks}
            loading={data.loading}
            onSelectStory={handleSelectStory}
            onDrill={(title, records) => handleDrill(title, records, 'overview')}
          />
        )}

        {screen === 'comparison' && (
          <ComparisonScreen
            catalogue={data.catalogue}
            categorySummaries={data.categorySummaries}
            checks={data.checks}
            onSelectStory={handleSelectStory}
          />
        )}

        {screen === 'discrepancies' && (
          <DiscrepancyScreen
            discrepancies={data.discrepancies}
            catalogue={data.catalogue}
            onSelectStory={handleSelectStory}
          />
        )}

        {screen === 'article' && (
          <ArticleScreen initialStoryId={selectedStoryId} onBack={historyRef.current.length > 0 ? handleBack : undefined} />
        )}

        {screen === 'trends' && (
          <TrendsScreen
            dateFrom={data.dateFrom}
            dateTo={data.dateTo}
            onApplyDate={data.applyDateFilter}
            weeklyBuckets={data.weeklyBuckets}
            checks={data.checks}
            loading={data.loading}
            onSelectStory={handleSelectStory}
            onDrill={(title, records) => handleDrill(title, records, 'trends')}
          />
        )}

        {screen === 'drill' && drillContext && (
          <DrillDownScreen
            title={drillContext.title}
            records={drillContext.records}
            onBack={handleDrillBack}
            onSelectStory={handleSelectStory}
          />
        )}
      </main>
    </div>
  );
}

export default App;
