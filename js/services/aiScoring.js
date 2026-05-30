/**
 * LLM-assisted scoring via POST /api/score (OpenAI proxy on Vercel or local Express).
 */

/**
 * Production: same-origin `/api/score`. Optional absolute API origin for uncommon setups:
 * `VITE_SCORE_API_ORIGIN=https://your-project.vercel.app`
 */
function scoreApiBase() {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SCORE_API_ORIGIN) {
        return String(import.meta.env.VITE_SCORE_API_ORIGIN).replace(/\/$/, '');
    }
    return '';
}

/**
 * @typedef {object} ScoreResult
 * @property {number} score Numeric score (typically 0–100 unless your rubric says otherwise).
 * @property {string} [reason] Optional short rationale from the model.
 */

/**
 * @param {string} task
 * @param {Record<string, string>} payload
 * @returns {Promise<ScoreResult>}
 */
async function scoreViaProxy(task, payload) {
    const url = `${scoreApiBase()}/api/score`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, ...payload }),
    });

    const raw = await res.text();
    let data = {};
    try {
        data = raw ? JSON.parse(raw) : {};
    } catch {
        const hint =
            res.status === 500 && /ECONNREFUSED|proxy error/i.test(raw)
                ? ' — is the API server running? Restart with npm run dev (or run npm start in another terminal).'
                : '';
        throw new Error(`Scoring service returned invalid JSON (${res.status})${hint}`);
    }

    if (!res.ok) {
        const detail = typeof data.error === 'string' ? data.error : res.statusText;
        throw new Error(detail || `Scoring HTTP ${res.status}`);
    }

    const score = Number(data.score);
    if (!Number.isFinite(score)) {
        throw new Error(`Invalid score in scoring response: ${JSON.stringify(data)}`);
    }

    return {
        score,
        ...(typeof data.reason === 'string' ? { reason: data.reason } : {}),
    };
}

async function podcastScore(userResponse, topic) {
    return scoreViaProxy('podcast', { text: userResponse, topic });
}

async function musicTasteScore(userResponse, musician) {
    return scoreViaProxy('musictaste', { text: userResponse, musician });
}

async function insultScore(userResponse, insultTopic) {
    return scoreViaProxy('insult', { text: userResponse, insultTopic });
}

async function linkedInScore(userResponse) {
    return scoreViaProxy('linkedin', { text: userResponse });
}

export { podcastScore, insultScore, linkedInScore, musicTasteScore };
