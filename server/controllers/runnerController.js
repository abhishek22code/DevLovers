// Lightweight code runner controller using Judge0 (optional).
// Requires env: JUDGE0_URL (e.g., https://ce.judge0.com) and optional JUDGE0_KEY

const MAX_SOURCE = 200000; // 200 KB
const MAX_STDIN = 50000; // 50 KB
const RUN_TIMEOUT_MS = 12000; // total request timeout budget

// Map languages to Judge0 language IDs
const LANGUAGE_MAP = {
  cpp: 54, // C++ (GCC 9.2.0) - common Judge0 ID; may vary by instance
  java: 62 // Java (OpenJDK 13.0.1)
};

function sanitizeString(input, max) {
  if (typeof input !== 'string') return '';
  if (input.length > max) return input.slice(0, max);
  return input;
}

exports.compileAndRun = async (req, res) => {
  try {
    const { language, sourceCode, stdin } = req.body || {};

    if (!language || !['cpp', 'java'].includes(language)) {
      return res.status(400).json({ message: 'Invalid language. Use cpp or java.' });
    }
    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      return res.status(400).json({ message: 'sourceCode is required' });
    }

    const JUDGE0_URL = process.env.JUDGE0_URL;
    const JUDGE0_KEY = process.env.JUDGE0_KEY;
    if (!JUDGE0_URL) {
      return res.status(501).json({
        message: 'Runner not configured. Set JUDGE0_URL to enable code execution.'
      });
    }

    const langId = LANGUAGE_MAP[language];
    const payload = {
      language_id: langId,
      source_code: sanitizeString(sourceCode, MAX_SOURCE),
      stdin: sanitizeString(stdin || '', MAX_STDIN),
      redirect_stderr_to_stdout: false
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);

    // Submit
    const submitResp = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(JUDGE0_KEY ? { 'X-Auth-Token': JUDGE0_KEY } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!submitResp.ok) {
      clearTimeout(timer);
      const text = await submitResp.text().catch(() => '');
      return res.status(502).json({ message: 'Runner submission failed', details: text });
    }
    const submitJson = await submitResp.json();
    const token = submitJson.token;
    if (!token) {
      clearTimeout(timer);
      return res.status(502).json({ message: 'Runner did not return a token' });
    }

    // Poll result
    const started = Date.now();
    let result = null;
    while (Date.now() - started < RUN_TIMEOUT_MS - 250) {
      const poll = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=false`, {
        headers: {
          ...(JUDGE0_KEY ? { 'X-Auth-Token': JUDGE0_KEY } : {})
        },
        signal: controller.signal
      });
      if (!poll.ok) {
        break;
      }
      const data = await poll.json();
      if (data && data.status && data.status.id >= 3) { // 1:In Queue, 2:Processing, >=3 finished
        result = data;
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    clearTimeout(timer);

    if (!result) {
      return res.status(504).json({ message: 'Runner timeout' });
    }

    const timeMs = Math.round((parseFloat(result.time) || 0) * 1000);
    const exitCode = typeof result.exit_code === 'number' ? result.exit_code : (result.status?.id === 3 ? 0 : 1);
    const stdout = result.stdout || '';
    const stderr = result.stderr || result.compile_output || '';

    return res.json({
      stdout,
      stderr,
      exitCode,
      timeMs,
      truncated: Boolean(result.message?.includes('Truncated')) || false,
      status: result.status
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Runner timeout' });
    }
    console.error('compileAndRun error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


