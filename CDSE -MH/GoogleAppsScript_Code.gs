/**
 * CDSE Dynamic Form — Google Drive backend
 * ==========================================
 * Paste this ENTIRE file into your Apps Script project (replacing whatever
 * is there now), then redeploy (Deploy > Manage deployments > Edit > New
 * version). Keep the same Web App URL so CDSE_Dynamic_Form.html doesn't
 * need to change its DRIVE_SCRIPT_URL.
 *
 * What it does:
 *  - One Drive folder per dam (named by PIC), inside a single root folder
 *    called "CDSE Reports".
 *  - Submitting again for a PIC that already has a folder does NOT
 *    silently overwrite it — it replies {status:'exists'} and the form
 *    will ask the user to confirm before replacing.
 *  - "Load Saved Report" (by PIC) reads the saved form data back so the
 *    whole form can be restored exactly as it was submitted.
 */

const ROOT_FOLDER_NAME = 'CDSE Reports';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const root = getOrCreateRootFolder();

    if (payload.action === 'save') return handleSave(payload, root);
    if (payload.action === 'load') return handleLoad(payload, root);
    if (payload.action === 'list') return handleList(root);

    return jsonResponse({ error: 'Unknown action: ' + payload.action });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function getOrCreateRootFolder() {
  const it = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function safeFolderName(pic, damName) {
  const base = (pic && pic.trim()) ? pic.trim() : (damName || 'UNKNOWN_PIC');
  return base.replace(/[\/\\:*?"<>|]/g, '_');
}

function getDamFolder(root, name) {
  const it = root.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return null;
}

function handleSave(payload, root) {
  const folderName = safeFolderName(payload.pic, payload.damName);
  const existing = getDamFolder(root, folderName);

  // Block silent overwrite — the client must resend with overwrite:true
  // after the user confirms.
  if (existing && !payload.overwrite) {
    return jsonResponse({ status: 'exists', message: 'A report for this PIC already exists on Drive.' });
  }

  let damFolder;
  if (existing) {
    // Replace: trash every file currently in the folder, then refill it.
    const files = existing.getFiles();
    while (files.hasNext()) files.next().setTrashed(true);
    damFolder = existing;
  } else {
    damFolder = root.createFolder(folderName);
  }

  // 1. Raw field data (used to restore the form exactly — this is what
  //    "Load Saved Report" reads back).
  damFolder.createFile(
    Utilities.newBlob(JSON.stringify(payload.data || {}), 'application/json', 'form_data.json')
  );

  // 2. Human-readable version (label -> value), handy for someone browsing
  //    Drive directly without opening the tool.
  if (payload.labeledData) {
    damFolder.createFile(
      Utilities.newBlob(JSON.stringify(payload.labeledData, null, 2), 'application/json', 'readable_data.json')
    );
  }

  // 3. Every attached annexure file (and the bundled Excel/CSV export).
  (payload.files || []).forEach(function (f) {
    try {
      const bytes = Utilities.base64Decode(f.base64);
      const blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', f.fileName || 'file');
      damFolder.createFile(blob);
    } catch (fileErr) {
      // Skip a single bad file rather than failing the whole submission.
    }
  });

  // 4. Small metadata file — used by "Load Saved Report" to show the
  //    last-saved timestamp, and useful for anyone browsing Drive.
  const meta = {
    pic: payload.pic || '',
    damName: payload.damName || '',
    reportId: payload.reportId || '',
    timestamp: payload.timestamp || new Date().toISOString()
  };
  damFolder.createFile(
    Utilities.newBlob(JSON.stringify(meta), 'application/json', '_meta.json')
  );

  return jsonResponse({ status: 'saved', folderUrl: damFolder.getUrl() });
}

function handleLoad(payload, root) {
  const folderName = safeFolderName(payload.pic, '');
  const damFolder = getDamFolder(root, folderName);
  if (!damFolder) return jsonResponse({ found: false });

  const dataFiles = damFolder.getFilesByName('form_data.json');
  if (!dataFiles.hasNext()) return jsonResponse({ found: false });

  const data = JSON.parse(dataFiles.next().getBlob().getDataAsString());

  let timestamp = '';
  const metaFiles = damFolder.getFilesByName('_meta.json');
  if (metaFiles.hasNext()) {
    try {
      timestamp = JSON.parse(metaFiles.next().getBlob().getDataAsString()).timestamp || '';
    } catch (metaErr) { /* ignore */ }
  }

  return jsonResponse({ found: true, data: data, timestamp: timestamp });
}

// Lists every dam that has a saved report, for the "Load Saved Report"
// dropdown — reads each subfolder's _meta.json (fast; doesn't touch the
// full form_data.json) and returns {pic, damName, timestamp} per dam.
function handleList(root) {
  const items = [];
  const folders = root.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    let pic = folder.getName();
    let damName = '';
    let timestamp = '';
    const metaFiles = folder.getFilesByName('_meta.json');
    if (metaFiles.hasNext()) {
      try {
        const meta = JSON.parse(metaFiles.next().getBlob().getDataAsString());
        pic = meta.pic || pic;
        damName = meta.damName || '';
        timestamp = meta.timestamp || '';
      } catch (metaErr) { /* ignore, fall back to folder name only */ }
    }
    items.push({ pic: pic, damName: damName, timestamp: timestamp });
  }
  // Most recently saved first.
  items.sort(function (a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  return jsonResponse({ items: items });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
