const STORAGE_KEY = 'lighting-assistant-submissions-v1';

export function saveSubmission(submission) {
  try {
    const sanitized = sanitizeJsonValue(submission);
    if (!isSubmissionRecord(sanitized)) {
      return { ok: false, error: 'submissionId is required.', submissions: loadSubmissions() };
    }
    const submissions = mergeSubmissions(loadSubmissions(), [sanitized]);
    writeSubmissions(submissions);
    return { ok: true, submission: sanitized, submissions };
  } catch (error) {
    return {
      ok: false,
      error: storageErrorMessage(error),
      submission: sanitizeJsonValue(submission),
      submissions: loadSubmissions(),
    };
  }
}

export function loadSubmissions() {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeSubmissionArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function getSubmissionById(submissionId) {
  return loadSubmissions().find((item) => item.submissionId === submissionId) || null;
}

export function deleteSubmission(submissionId) {
  try {
    const submissions = loadSubmissions().filter((item) => item.submissionId !== submissionId);
    writeSubmissions(submissions);
    return { ok: true, submissions };
  } catch (error) {
    return { ok: false, error: storageErrorMessage(error), submissions: loadSubmissions() };
  }
}

export function clearSubmissions() {
  try {
    storage()?.removeItem(STORAGE_KEY);
    return { ok: true, submissions: [] };
  } catch (error) {
    return { ok: false, error: storageErrorMessage(error), submissions: loadSubmissions() };
  }
}

export function exportSubmissionsJson() {
  return JSON.stringify(loadSubmissions(), null, 2);
}

export function importSubmissionsJson(json) {
  try {
    if (typeof json === 'string') {
      const trimmed = json.trim();
      if (!trimmed) {
        return { ok: false, importedCount: 0, error: 'JSON本文またはJSONファイルを指定してください。', submissions: loadSubmissions() };
      }
      if (looksLikeJsonFilename(trimmed)) {
        return {
          ok: false,
          importedCount: 0,
          error: 'ファイル名ではなくJSON本文を貼り付けるか、JSONファイルを選択してください。',
          submissions: loadSubmissions(),
        };
      }
    }
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const imported = normalizeSubmissionArray(parsed);
    // Imported records replace existing records with the same submissionId.
    const submissions = mergeSubmissions(loadSubmissions(), imported);
    writeSubmissions(submissions);
    return { ok: true, importedCount: imported.length, submissions };
  } catch (error) {
    return { ok: false, importedCount: 0, error: storageErrorMessage(error), submissions: loadSubmissions() };
  }
}

export function isSubmissionRecord(value) {
  return value && typeof value === 'object' && typeof value.submissionId === 'string';
}

function writeSubmissions(submissions) {
  const target = storage();
  if (!target) throw new Error('ブラウザ内保存を利用できません。JSON保存で退避してください。');
  target.setItem(STORAGE_KEY, JSON.stringify(normalizeSubmissionArray(submissions)));
}

function normalizeSubmissionArray(value) {
  const source = isSubmissionRecord(value) ? [value] : Array.isArray(value) ? value : value?.submissions;
  if (!Array.isArray(source)) return [];
  const seen = new Set();
  return source
    .map((item) => sanitizeJsonValue(item))
    .filter((item) => isSubmissionRecord(item))
    .filter((item) => {
      if (seen.has(item.submissionId)) return false;
      seen.add(item.submissionId);
      return true;
    });
}

function mergeSubmissions(existing, imported) {
  const merged = new Map();
  [...existing, ...imported].forEach((submission) => {
    if (isSubmissionRecord(submission)) merged.set(submission.submissionId, sanitizeJsonValue(submission));
  });
  return [...merged.values()];
}

function sanitizeJsonValue(value) {
  if (value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeJsonValue(item)]));
  }
  return value;
}

function looksLikeJsonFilename(value) {
  return /^[^{}\[\]\n\r]+\.json$/i.test(value);
}

function storage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function storageErrorMessage(error) {
  if (error instanceof SyntaxError) {
    return 'JSONとして読み込めませんでした。JSON本文を確認してください。';
  }
  if (error?.name === 'QuotaExceededError') {
    return 'ブラウザ内保存の容量を超えました。全件JSONエクスポートまたは1件JSON保存で退避してください。';
  }
  return error?.message || 'ブラウザ内保存に失敗しました。JSON保存で退避してください。';
}
