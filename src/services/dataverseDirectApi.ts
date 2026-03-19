/**
 * Direct Dataverse API client for local development.
 *
 * This bypasses the Power Apps SDK and calls the Dataverse OData API
 * directly through a Vite dev proxy (which attaches the auth token).
 *
 * Used automatically when running locally (`npm run dev`).
 * In production (Power Apps), the standard SDK client is used instead.
 */

import type {
  ContentCheck,
  ContentCheckCatalogue,
  DigitalEditorialStory,
} from '../types/dataverse';

// In local dev, requests go through the Vite proxy at /api/dataverse/*
// The proxy rewrites to the real Dataverse org URL and injects the bearer token.
const BASE = '/api/dataverse';

// Omit $select to fetch all columns — avoids 400 errors when columns differ between environments
// Omit $select to fetch all columns — avoids 400 errors when columns differ between environments
const CONTENT_CHECK_SELECT = '';

const STORY_SELECT =
  'nw_digitaleditorialstoryid,nw_cmsheadline,nw_nodeid,nw_storyurl,createdon';

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAnnotations(rows: any[]): ContentCheck[] {
  return rows.map((r: Record<string, unknown>) => {
    const story = r['nw_relatedstory'] as Record<string, unknown> | null;
    return {
      ...r,
      _nw_checkedbyid_formatted:
        r['_nw_checkedbyid_value@OData.Community.Display.V1.FormattedValue'] ?? null,
      _nw_contentcheck_formatted:
        r['_nw_contentcheck_value@OData.Community.Display.V1.FormattedValue'] ?? null,
      _nw_relatedstory_formatted:
        r['_nw_relatedstory_value@OData.Community.Display.V1.FormattedValue'] ?? null,
      _nw_feedbackbyid_formatted:
        r['_nw_feedbackbyid_value@OData.Community.Display.V1.FormattedValue'] ?? null,
      _nw_relatedstory_storyurl: (story?.['nw_storyurl'] as string) ?? null,
      _nw_relatedstory_nodeid: (story?.['nw_nodeid'] as string) ?? null,
    };
  }) as ContentCheck[];
}

async function odataGet<T>(entity: string, params: Record<string, string> = {}, withAnnotations = false): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE}/${entity}${query ? '?' + query : ''}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  };
  if (withAnnotations) {
    headers['Prefer'] = 'odata.include-annotations="*"';
  }

  console.log(`[Dataverse-Direct] GET ${url}`);
  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Dataverse API ${resp.status}: ${text}`);
  }
  return resp.json();
}

// ── Content Checks ──

export async function fetchContentChecks(
  dateFrom: Date,
  dateTo: Date,
  additionalFilter?: string
): Promise<ContentCheck[]> {
  const dateToPlus1 = new Date(dateTo);
  dateToPlus1.setDate(dateToPlus1.getDate() + 1);

  let filter = `createdon ge ${toISODate(dateFrom)} and createdon lt ${toISODate(dateToPlus1)} and nw_relatedstory/nw_publishingeditorialoutcome eq 125050000`;
  if (additionalFilter) filter += ` and ${additionalFilter}`;

  console.log(`[Dataverse-Direct] fetchContentChecks filter: ${filter}`);

  const allRows: Record<string, unknown>[] = [];
  let url: string | null = null;

  // First request
  const params: Record<string, string> = {
    '$expand': 'nw_relatedstory($select=nw_nodeid,nw_storyurl)',
    '$filter': filter,
    '$orderby': 'createdon desc',
    '$count': 'true',
  };
  if (CONTENT_CHECK_SELECT) params['$select'] = CONTENT_CHECK_SELECT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data = await odataGet<any>('nw_contentchecks', params, true);

  allRows.push(...(data.value ?? []));
  url = data['@odata.nextLink'] ?? null;
  const totalCount = data['@odata.count'] ?? '?';
  console.log(`[Dataverse-Direct] Page 1: ${allRows.length} rows (total: ${totalCount})`);

  // Follow pagination links
  while (url) {
    // nextLink is an absolute URL; rewrite to go through the proxy
    const proxyUrl = url.replace(/https:\/\/[^/]+\/api\/data\/v9\.2\//, `${BASE}/`);
    console.log(`[Dataverse-Direct] Fetching next page...`);
    const resp = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'odata.include-annotations="*"',
      },
    });
    if (!resp.ok) break;
    data = await resp.json();
    allRows.push(...(data.value ?? []));
    url = data['@odata.nextLink'] ?? null;
    console.log(`[Dataverse-Direct] Fetched ${allRows.length} rows so far...`);
  }

  console.log(`[Dataverse-Direct] Total content checks fetched: ${allRows.length}`);
  return extractAnnotations(allRows);
}

export async function fetchChecksForStory(storyId: string): Promise<ContentCheck[]> {
  console.log(`[Dataverse-Direct] fetchChecksForStory: ${storyId}`);

  const storyParams: Record<string, string> = {
    '$expand': 'nw_relatedstory($select=nw_nodeid,nw_storyurl)',
    '$filter': `_nw_relatedstory_value eq ${storyId}`,
    '$orderby': 'nw_name asc',
  };
  if (CONTENT_CHECK_SELECT) storyParams['$select'] = CONTENT_CHECK_SELECT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await odataGet<any>('nw_contentchecks', storyParams, true);

  const rows = data.value ?? [];
  console.log(`[Dataverse-Direct] Fetched ${rows.length} checks for story`);
  return extractAnnotations(rows);
}

// ── Catalogue ──

export async function fetchCatalogue(): Promise<ContentCheckCatalogue[]> {
  console.log('[Dataverse-Direct] fetchCatalogue');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await odataGet<any>('nw_contentcheckcatalogues', {
    '$select': 'nw_contentcheckcatalogueid,nw_name,nw_contentcheckdescription',
    '$orderby': 'nw_name asc',
  });

  const rows = data.value ?? [];
  console.log(`[Dataverse-Direct] Fetched ${rows.length} catalogue items`);
  return rows as ContentCheckCatalogue[];
}

// ── Stories ──

export async function fetchStory(storyId: string): Promise<DigitalEditorialStory | null> {
  console.log(`[Dataverse-Direct] fetchStory: ${storyId}`);

  try {
    const data = await odataGet<DigitalEditorialStory>(
      `nw_digitaleditorialstories(${storyId})`,
      { '$select': STORY_SELECT }
    );
    return data;
  } catch {
    console.error(`[Dataverse-Direct] fetchStory failed for ${storyId}`);
    return null;
  }
}

export async function searchStories(query: string): Promise<DigitalEditorialStory[]> {
  if (query.length < 3) return [];
  console.log(`[Dataverse-Direct] searchStories: ${query}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await odataGet<any>('nw_digitaleditorialstories', {
    '$select': STORY_SELECT,
    '$filter': `contains(nw_cmsheadline,'${query.replace(/'/g, "''")}')`,
    '$orderby': 'createdon desc',
    '$top': '20',
  });

  const rows = data.value ?? [];
  console.log(`[Dataverse-Direct] Found ${rows.length} stories`);
  return rows as DigitalEditorialStory[];
}

// ── Update Content Check (feedback) ──

export async function submitFeedback(
  contentCheckId: string,
  feedback: string
): Promise<void> {
  const url = `${BASE}/nw_contentchecks(${contentCheckId})`;
  console.log(`[Dataverse-Direct] PATCH ${url}`);

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    body: JSON.stringify({
      nw_reviewfeedback: feedback,
      nw_feedbackon: new Date().toISOString(),
    }),
  });

  if (!resp.ok && resp.status !== 204) {
    const text = await resp.text();
    throw new Error(`Failed to submit feedback: ${resp.status} ${text}`);
  }
  console.log(`[Dataverse-Direct] Feedback submitted for ${contentCheckId}`);
}

// ── Current User (WhoAmI) ──

export async function fetchCurrentUser(): Promise<{ userId: string; fullName: string; email: string } | null> {
  try {
    const whoResp = await fetch(`${BASE}/WhoAmI`, {
      headers: { 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' },
    });
    if (!whoResp.ok) return null;
    const whoData = await whoResp.json();
    const systemUserId: string = whoData?.UserId ?? '';
    if (!systemUserId) return null;

    const userResp = await fetch(
      `${BASE}/systemusers(${systemUserId})?$select=systemuserid,fullname,internalemailaddress`,
      { headers: { 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' } }
    );
    if (!userResp.ok) return null;
    const user = await userResp.json();
    return {
      userId: systemUserId,
      fullName: user.fullname ?? '',
      email: user.internalemailaddress ?? '',
    };
  } catch (e) {
    console.error('[Dataverse-Direct] fetchCurrentUser error:', e);
    return null;
  }
}

// ── Debug ──

export async function debugFetchAllColumns(): Promise<void> {
  console.log('[Dataverse-Direct] Debug mode — skipping column discovery in local dev');
}
