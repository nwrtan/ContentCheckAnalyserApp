/**
 * API module switcher.
 *
 * - In local dev (`npm run dev:local`): uses direct HTTP calls through the Vite proxy.
 * - In production / Power Apps local play (`npm run dev`): uses the Power Apps SDK client.
 *
 * All other modules should import from here instead of dataverseApi or dataverseDirectApi.
 *
 * NOTE: We use lazy loading (import on first call) instead of top-level await
 * because top-level await can stall module evaluation in the Power Apps iframe.
 */

import type {
  ContentCheck,
  ContentCheckCatalogue,
  DigitalEditorialStory,
} from '../types/dataverse';

const isLocalDev = import.meta.env.DEV && import.meta.env.VITE_LOCAL_DEV === 'true';

console.log(`[API] Mode: ${isLocalDev ? 'LOCAL DEV (direct HTTP)' : 'POWER APPS (SDK client)'}`);

// Lazy-loaded module reference
let _api: typeof import('./dataverseApi') | typeof import('./dataverseDirectApi') | null = null;

async function getApi() {
  if (!_api) {
    _api = isLocalDev
      ? await import('./dataverseDirectApi')
      : await import('./dataverseApi');
  }
  return _api;
}

export async function fetchContentChecks(
  dateFrom: Date,
  dateTo: Date,
  additionalFilter?: string
): Promise<ContentCheck[]> {
  const api = await getApi();
  return api.fetchContentChecks(dateFrom, dateTo, additionalFilter);
}

export async function fetchChecksForStory(storyId: string): Promise<ContentCheck[]> {
  const api = await getApi();
  return api.fetchChecksForStory(storyId);
}

export async function fetchCatalogue(): Promise<ContentCheckCatalogue[]> {
  const api = await getApi();
  return api.fetchCatalogue();
}

export async function fetchStory(storyId: string): Promise<DigitalEditorialStory | null> {
  const api = await getApi();
  return api.fetchStory(storyId);
}

export async function searchStories(query: string): Promise<DigitalEditorialStory[]> {
  const api = await getApi();
  return api.searchStories(query);
}

export async function submitFeedback(contentCheckId: string, feedback: string): Promise<void> {
  const api = await getApi();
  return api.submitFeedback(contentCheckId, feedback);
}

export async function fetchCurrentUser(): Promise<{ userId: string; fullName: string; email: string } | null> {
  const api = await getApi();
  return api.fetchCurrentUser();
}

export async function debugFetchAllColumns(): Promise<void> {
  const api = await getApi();
  return api.debugFetchAllColumns();
}
