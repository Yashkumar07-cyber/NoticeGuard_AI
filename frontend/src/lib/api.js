// API client for NoticeGuard AI backend

// In dev defaults to localhost:8000; in production reads VITE_API_BASE_URL from hosting env
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline or health error:', err);
    return { status: 'offline', mock_mode: true };
  }
}

export async function fetchSamples() {
  try {
    const res = await fetch(`${API_BASE}/api/samples`);
    if (!res.ok) throw new Error('Failed to load samples');
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch samples:', err);
    return [];
  }
}

export async function fetchSampleDetails(sampleId) {
  const res = await fetch(`${API_BASE}/api/samples/${sampleId}`);
  if (!res.ok) throw new Error(`Sample ${sampleId} not found`);
  return await res.json();
}

export async function analyzeNotice({ file, text, signal }) {
  let res;
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    if (text) {
      formData.append('text', text);
    }
    res = await fetch(`${API_BASE}/api/notices/analyze`, {
      method: 'POST',
      body: formData,
      signal
    });
  } else {
    res = await fetch(`${API_BASE}/api/notices/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal
    });
  }

  if (!res.ok) {
    let detail = 'Analysis failed';
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch {}
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  return await res.json();
}

export async function translateNotice(noticeJson, targetLang) {
  const res = await fetch(`${API_BASE}/api/notices/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notice_json: noticeJson,
      target: targetLang
    })
  });

  if (!res.ok) {
    throw new Error('Translation failed');
  }

  return await res.json();
}

export async function askQuestion(noticeJson, question, lang) {
  const res = await fetch(`${API_BASE}/api/notices/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notice_json: noticeJson,
      question,
      lang
    })
  });

  if (!res.ok) {
    throw new Error('Ask query failed');
  }

  return await res.json();
}
