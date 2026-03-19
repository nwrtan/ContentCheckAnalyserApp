import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService';
import { EnvironmentvariabledefinitionsService } from '../generated/services/EnvironmentvariabledefinitionsService';
import { setOrgUrl } from './orgUrl';
import type {
  ContentCheck,
  ContentCheckCatalogue,
  DigitalEditorialStory,
} from '../types/dataverse';

const STORY_SELECT =
  'nw_digitaleditorialstoryid,nw_cmsheadline,nw_nodeid,nw_storyurl,createdon';

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ── Org URL from nw_environmenturl (native Dataverse, current environment) ──

let _orgUrl: string | null = null;

async function getOrgUrl(): Promise<string> {
  if (_orgUrl) return _orgUrl;

  try {
    console.log('[Dataverse] Reading nw_environmenturl via native Dataverse service...');
    const result = await EnvironmentvariabledefinitionsService.getAll({
      select: ['schemaname', 'defaultvalue'],
      filter: "schemaname eq 'nw_environmenturl'",
      top: 1,
    });

    const rows = result.data ?? [];
    console.log(`[Dataverse] Environment variable rows: ${rows.length}`);

    if (rows.length > 0 && rows[0].defaultvalue) {
      const envUrl = rows[0].defaultvalue;
      console.log(`[Dataverse] nw_environmenturl = "${envUrl}"`);
      if (envUrl.startsWith('https://')) {
        _orgUrl = envUrl.replace(/\/$/, '') + '/';
        setOrgUrl(_orgUrl);
        console.log(`[Dataverse] ✅ Org URL: ${_orgUrl}`);
        return _orgUrl;
      }
    }
  } catch (e) {
    console.error('[Dataverse] ❌ Failed to read nw_environmenturl:', e);
  }

  console.warn('[Dataverse] ⚠️ Falling back to default org URL');
  _orgUrl = 'https://editorialworkflow.crm.dynamics.com/';
  return _orgUrl;
}

// ── Helpers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows<T>(result: any): T[] {
  const rows = result.data?.value ?? result?.value ?? [];
  console.log(`[Dataverse] Fetched ${rows.length} rows`);
  return rows as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRecord<T>(result: any): T | null {
  return (result.data ?? null) as T | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRowsWithAnnotations(result: any): ContentCheck[] {
  const rows = result.data?.value ?? result?.value ?? [];
  console.log(`[Dataverse] Fetched ${rows.length} rows (with annotations)`);
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    _nw_checkedbyid_formatted:
      r['_nw_checkedbyid_value@OData.Community.Display.V1.FormattedValue'] ?? null,
    _nw_contentcheck_formatted:
      r['_nw_contentcheck_value@OData.Community.Display.V1.FormattedValue'] ?? null,
    _nw_relatedstory_formatted:
      r['_nw_relatedstory_value@OData.Community.Display.V1.FormattedValue'] ?? null,
    _nw_feedbackbyid_formatted:
      r['_nw_feedbackbyid_value@OData.Community.Display.V1.FormattedValue'] ?? null,
    _nw_relatedstory_storyurl: null,
    _nw_relatedstory_nodeid: null,
  })) as ContentCheck[];
}

// ──────────────────────────────────────────────
// Content Checks
// ──────────────────────────────────────────────

export async function fetchContentChecks(
  dateFrom: Date,
  dateTo: Date,
  additionalFilter?: string
): Promise<ContentCheck[]> {
  const orgUrl = await getOrgUrl();
  const dateToPlus1 = new Date(dateTo);
  dateToPlus1.setDate(dateToPlus1.getDate() + 1);

  let filter = `createdon ge ${toISODate(dateFrom)} and createdon lt ${toISODate(dateToPlus1)} and nw_relatedstory/nw_publishingeditorialoutcome eq 125050000`;
  if (additionalFilter) {
    filter += ` and ${additionalFilter}`;
  }

  console.log(`[Dataverse] fetchContentChecks orgUrl: ${orgUrl}`);

  try {
    const result = await MicrosoftDataverseService.ListRecordsWithOrganization(
      orgUrl,
      'nw_contentchecks',
      'odata.include-annotations="*",odata.maxpagesize=5000',
      undefined,
      undefined,
      undefined,
      undefined,
      filter,
      'createdon desc',
      undefined,
      undefined,
      5000
    );
    return extractRowsWithAnnotations(result);
  } catch (e) {
    console.error('[Dataverse] fetchContentChecks error:', e);
    return [];
  }
}

export async function debugFetchAllColumns(): Promise<void> {
  // No-op in production
}

export async function fetchChecksForStory(storyId: string): Promise<ContentCheck[]> {
  const orgUrl = await getOrgUrl();
  console.log(`[Dataverse] fetchChecksForStory: ${storyId}`);

  try {
    const result = await MicrosoftDataverseService.ListRecordsWithOrganization(
      orgUrl,
      'nw_contentchecks',
      'odata.include-annotations="*"',
      undefined,
      undefined,
      undefined,
      undefined,
      `_nw_relatedstory_value eq ${storyId}`,
      'nw_name asc'
    );
    return extractRowsWithAnnotations(result);
  } catch (e) {
    console.error('[Dataverse] fetchChecksForStory error:', e);
    return [];
  }
}

// ──────────────────────────────────────────────
// Catalogue
// ──────────────────────────────────────────────

export async function fetchCatalogue(): Promise<ContentCheckCatalogue[]> {
  const orgUrl = await getOrgUrl();
  console.log('[Dataverse] fetchCatalogue');
  try {
    const result = await MicrosoftDataverseService.ListRecordsWithOrganization(
      orgUrl,
      'nw_contentcheckcatalogues',
      undefined,
      undefined,
      undefined,
      undefined,
      'nw_contentcheckcatalogueid,nw_name,nw_contentcheckdescription',
      undefined,
      'nw_name asc'
    );
    return extractRows<ContentCheckCatalogue>(result);
  } catch (e) {
    console.error('[Dataverse] fetchCatalogue error:', e);
    return [];
  }
}

// ──────────────────────────────────────────────
// Stories
// ──────────────────────────────────────────────

export async function fetchStory(storyId: string): Promise<DigitalEditorialStory | null> {
  const orgUrl = await getOrgUrl();
  console.log(`[Dataverse] fetchStory: ${storyId}`);
  try {
    const result = await MicrosoftDataverseService.GetItemWithOrganization(
      'return=representation',
      'application/json',
      orgUrl,
      'nw_digitaleditorialstories',
      storyId,
      undefined,
      undefined,
      STORY_SELECT
    );
    return extractRecord<DigitalEditorialStory>(result);
  } catch (e) {
    console.error('[Dataverse] fetchStory error:', e);
    return null;
  }
}

export async function searchStories(query: string): Promise<DigitalEditorialStory[]> {
  if (query.length < 3) return [];
  const orgUrl = await getOrgUrl();
  console.log(`[Dataverse] searchStories: ${query}`);

  try {
    const result = await MicrosoftDataverseService.ListRecordsWithOrganization(
      orgUrl,
      'nw_digitaleditorialstories',
      undefined,
      undefined,
      undefined,
      undefined,
      STORY_SELECT,
      `contains(nw_cmsheadline,'${query.replace(/'/g, "''")}')`,
      'createdon desc',
      undefined,
      undefined,
      20
    );
    return extractRows<DigitalEditorialStory>(result);
  } catch (e) {
    console.error('[Dataverse] searchStories error:', e);
    return [];
  }
}

export async function submitFeedback(
  contentCheckId: string,
  feedback: string
): Promise<void> {
  const orgUrl = await getOrgUrl();
  try {
    await MicrosoftDataverseService.UpdateRecordWithOrganization(
      'return=representation',
      'application/json',
      orgUrl,
      'nw_contentchecks',
      contentCheckId,
      {
        nw_reviewfeedback: feedback,
        nw_feedbackon: new Date().toISOString(),
      }
    );
    console.log(`[Dataverse] Feedback submitted for ${contentCheckId}`);
  } catch (e) {
    console.error('[Dataverse] submitFeedback error:', e);
    throw e;
  }
}

// ──────────────────────────────────────────────
// Current User (WhoAmI)
// ──────────────────────────────────────────────

export async function fetchCurrentUser(): Promise<{ userId: string; fullName: string; email: string } | null> {
  try {
    // Use the Power Apps SDK context — provides user info directly, no API call needed
    const { getContext } = await import('@microsoft/power-apps/app');
    const ctx = await getContext();
    console.log('[Dataverse] Power Apps context user:', JSON.stringify(ctx.user));

    const user = ctx.user;
    if (!user?.objectId) {
      console.warn('[Dataverse] No user objectId in Power Apps context');
      return null;
    }

    const result = {
      userId: user.objectId,
      fullName: user.fullName ?? '',
      email: user.userPrincipalName ?? '',
    };
    console.log('[Dataverse] fetchCurrentUser result:', JSON.stringify(result));
    return result;
  } catch (e) {
    console.error('[Dataverse] fetchCurrentUser error:', e);
    return null;
  }
}
