/**
 * Org URL helper for Dataverse record links.
 *
 * In Power Apps: the SDK uses the current environment automatically (no org URL needed).
 * This module is only used for building Dataverse record URLs (links to open records in browser).
 * In local dev: reads from VITE_ORG_URL or nw_environmenturl env var.
 */

const isLocalDev = import.meta.env.DEV && import.meta.env.VITE_LOCAL_DEV === 'true';

let _orgUrl: string | null = null;

/** Set the org URL (called during init) */
export function setOrgUrl(url: string) {
  _orgUrl = url.replace(/\/$/, '');
  console.log(`[OrgUrl] Set to: ${_orgUrl}`);
}

/** Get the org URL synchronously for building links */
export function getOrgUrlSync(): string {
  if (_orgUrl) return _orgUrl;
  if (isLocalDev) {
    return (import.meta.env.VITE_ORG_URL || '').replace(/\/$/, '');
  }
  return '';
}

/** Initialize org URL — reads from Dataverse env var in local dev */
export async function initOrgUrl(): Promise<void> {
  if (isLocalDev) {
    try {
      const resp = await fetch(
        "/api/dataverse/environmentvariabledefinitions?$select=defaultvalue&$filter=schemaname eq 'nw_environmenturl'",
        { headers: { 'Accept': 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        const rows = data.value ?? [];
        if (rows.length > 0 && rows[0].defaultvalue) {
          setOrgUrl(rows[0].defaultvalue);
          return;
        }
      }
    } catch { /* ignore */ }
    setOrgUrl(import.meta.env.VITE_ORG_URL || '');
  }
}

/**
 * Build a Dataverse record URL for a given entity and record ID.
 */
export function dataverseRecordUrl(entityName: string, recordId: string): string {
  const base = getOrgUrlSync();
  if (!base) return '#'; // No org URL available in Power Apps — link disabled
  return `${base}/main.aspx?etn=${entityName}&id=${recordId}&pagetype=entityrecord`;
}
