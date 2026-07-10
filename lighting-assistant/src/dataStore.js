const STORAGE_KEY = 'lighting-assistant-submissions-v1';

export function saveSubmission(submission) {
  try {
    const sanitized = sanitizeJsonValue(submission);
    if (!sanitized?.submissionId) {
      return { ok: false, error: 'submissionId is required.', submissions: loadSubmissions() };
    }
    const submissions = loadSubmissions();
    const index = submissions.findIndex((item) => item.submissionId === sanitized.submissionId);
    if (index >= 0) {
      submissions[index] = sanitized;
    } else {
      submissions.push(sanitized);
    }
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
    const parsed = JSON.parse(raw);
    return normalizeSubmissionArray(parsed);
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
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const submissions = normalizeSubmissionArray(parsed);
    writeSubmissions(submissions);
    return { ok: true, submissions };
  } catch (error) {
    return { ok: false, error: storageErrorMessage(error), submissions: loadSubmissions() };
  }
}

function writeSubmissions(submissions) {
  const target = storage();
  if (!target) throw new Error('ブラウザ内保存を利用できません。JSON保存で退避してください。');
  target.setItem(STORAGE_KEY, JSON.stringify(normalizeSubmissionArray(submissions)));
}

function normalizeSubmissionArray(value) {
  const source = Array.isArray(value) ? value : value?.submissions;
  if (!Array.isArray(source)) return [];
  const seen = new Set();
  return source
    .map((item) => sanitizeJsonValue(item))
    .filter((item) => item && typeof item === 'object' && item.submissionId)
    .filter((item) => {
      if (seen.has(item.submissionId)) return false;
      seen.add(item.submissionId);
      return true;
    });
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

function storage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function storageErrorMessage(error) {
  if (error?.name === 'QuotaExceededError') {
    return 'ブラウザ内保存の容量を超えました。全件JSONエクスポートまたは1件JSON保存で退避してください。';
  }
  return error?.message || 'ブラウザ内保存に失敗しました。JSON保存で退避してください。';
}
