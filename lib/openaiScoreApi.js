/**
 * Shared OpenAI scoring logic for POST /api/score (Express + Vercel).
 * Prompts stay server-side; client only sends { task, text, topic?, insultTopic? }.
 */

const DEFAULT_MODEL = 'gpt-4o-mini';
/** Voice / iframe snippets; keeps input tokens bounded. */
const MAX_USER_TEXT = 1200;
const MAX_TOPIC = 120;

const JSON_SCORE_ONLY = 'JSON only: {"score":0-100}.';
const JSON_SCORE_WITH_REASON = 'JSON only: {"score":0-100,"reason":"≤60 chars"}.';

/** @typedef {{ score: number, reason?: string }} ScoreResult */

/**
 * @param {string} apiKey
 * @param {string} systemInstructions
 * @param {string} userPrompt
 * @returns {Promise<ScoreResult>}
 */
/**
 * @param {number} [maxTokens]
 */
async function invokeOpenAi(apiKey, systemInstructions, userPrompt, maxTokens = 16) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            temperature: 0,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemInstructions },
                { role: 'user', content: userPrompt },
            ],
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err = new Error(`OpenAI HTTP ${res.status}: ${errText || res.statusText}`);
        /** @type {any} */ (err).statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
        throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error('Unexpected OpenAI response shape: missing choices[0].message.content');
    }

    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error(`Expected JSON output from model, got: ${content.slice(0, 280)}`);
    }

    const score = Number(parsed.score);
    if (!Number.isFinite(score)) {
        throw new Error(`Invalid numeric "score" in model JSON: ${JSON.stringify(parsed)}`);
    }

    return {
        score,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    };
}

/** @typedef {{ ok: false, status: number, message: string } | { ok: true } & ScoreResult } BuildResult */

/**
 * @param {string | undefined} task
 * @param {Record<string, unknown>} body
 * @returns {BuildResult | { ok: false, status: number, message: string, systemInstructions: string, userPrompt: string }}
 */
function buildScoreRequest(task, body) {
    const trimmed =
        typeof body.text === 'string'
            ? body.text.trim()
            : typeof body.userResponse === 'string'
              ? body.userResponse.trim()
              : '';

    if (!trimmed) {
        return { ok: false, status: 400, message: 'Missing text (or userResponse)' };
    }
    if (trimmed.length > MAX_USER_TEXT) {
        return { ok: false, status: 413, message: 'Text too long' };
    }

    if (task === 'linkedin') {
        return {
            ok: true,
            systemInstructions: `LinkedIn corporate impressiveness. ${JSON_SCORE_WITH_REASON}`,
            userPrompt: trimmed,
            maxTokens: 64,
        };
    }

    if (task === 'podcast') {
        const topic =
            typeof body.topic === 'string' ? body.topic.trim().slice(0, MAX_TOPIC) : '';
        if (!topic) {
            return { ok: false, status: 400, message: 'Missing topic for podcast task' };
        }
        return {
            ok: true,
            systemInstructions: `Podcast appeal (topic: ${topic}). ${JSON_SCORE_ONLY}`,
            userPrompt: trimmed,
            maxTokens: 12,
        };
    }

    if (task === 'musictaste') {
        const musician =
            typeof body.musician === 'string' ? body.musician.trim().slice(0, MAX_TOPIC) : '';
        if (!musician) {
            return { ok: false, status: 400, message: 'Missing musician for musictaste task' };
        }
        return {
            ok: true,
            systemInstructions: `Family disappointment if child loves ${musician}. ${JSON_SCORE_ONLY}`,
            userPrompt: trimmed,
            maxTokens: 12,
        };
    }

    if (task === 'insult') {
        const insultTopic =
            typeof body.insultTopic === 'string'
                ? body.insultTopic.trim().slice(0, MAX_TOPIC)
                : typeof body.insult_topic === 'string'
                  ? body.insult_topic.trim().slice(0, MAX_TOPIC)
                  : '';

        if (!insultTopic) {
            return { ok: false, status: 400, message: 'Missing insultTopic for insult task' };
        }
        return {
            ok: true,
            systemInstructions: `Insult meanness vs ${insultTopic}. ${JSON_SCORE_ONLY}`,
            userPrompt: trimmed,
            maxTokens: 12,
        };
    }

    return { ok: false, status: 400, message: 'Unknown task' };
}

/**
 * Express may set req.body; Vercel IncomingMessage streams.
 *
 * @param {import('http').IncomingMessage} req
 */
async function parseJsonBody(req) {
    /** @type {any} */
    const r = req;
    if (r.body != null && typeof r.body === 'object' && !Buffer.isBuffer(r.body)) {
        return r.body;
    }
    if (typeof r.body === 'string' && r.body.length) {
        return JSON.parse(r.body);
    }

    const chunks = [];
    for await (const chunk of /** @type {AsyncIterable<Buffer>} */ (r)) {
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
}

/** @typedef {ScoreResult | { ok: false, status?: number, error: string }} ScoreWire */

/**
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} body
 */
function jsonResponse(res, statusCode, body) {
    const payload = JSON.stringify(body);
    if (typeof res.status === 'function') {
        res.status(statusCode).json(body);
        return;
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(payload);
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {Record<string, string>} [headers]
 */
function emptyResponse(res, statusCode, headers = {}) {
    if (typeof res.status === 'function') {
        for (const [key, value] of Object.entries(headers)) {
            res.setHeader(key, value);
        }
        res.status(statusCode).end();
        return;
    }
    res.statusCode = statusCode;
    for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
    }
    res.end();
}

/**
 * @param {import('http').ServerResponse} res
 * @param {ScoreResult | { message: string, status?: number }} out
 */
function sendJson(res, out) {
    if ('score' in out && Number.isFinite(out.score)) {
        /** @type {ScoreWire} */
        const wire = {
            score: out.score,
            ...(typeof out.reason === 'string' ? { reason: out.reason } : {}),
        };
        jsonResponse(res, 200, wire);
        return;
    }
    const msg = 'message' in out ? out.message : 'Error';
    const status = ('statusCode' in out && typeof out.statusCode === 'number' && out.statusCode) ||
        ('status' in out && typeof out.status === 'number' && out.status) ||
        500;
    jsonResponse(res, status >= 400 && status < 600 ? status : 500, {
        ok: false,
        error: String(msg || 'Unknown error').slice(0, 280),
    });
}

async function serveScore(req, res) {
    if (req.method === 'OPTIONS') {
        return emptyResponse(res, 204, { Allow: 'POST, OPTIONS' });
    }
    if (req.method !== 'POST') {
        return sendJson(res, { message: 'Method not allowed', status: 405 });
    }

    const apiKey = process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim();
    if (!apiKey) {
        return sendJson(res, { message: 'Scoring unavailable (missing OPENAI_API_KEY)', status: 503 });
    }

    let body = {};
    try {
        body = await parseJsonBody(req);
    } catch {
        return sendJson(res, { message: 'Invalid JSON body', status: 400 });
    }

    const task = typeof body.task === 'string' ? body.task.trim().toLowerCase() : '';

    /** @type {any} */
    const builtAny = buildScoreRequest(task, body);
    if (!builtAny.ok) {
        return sendJson(res, { message: builtAny.message, status: builtAny.status });
    }

    const { userPrompt, systemInstructions, maxTokens } = builtAny;

    try {
        const result = await invokeOpenAi(apiKey, systemInstructions, userPrompt, maxTokens);
        return sendJson(res, result);
    } catch (err) {
        const status =
            err && typeof err === 'object' && 'statusCode' in err
                ? /** @type {any} */ (err).statusCode
                : 502;
        const message =
            err instanceof Error ? err.message : typeof err === 'string' ? err : 'Upstream error';
        return sendJson(res, { message, status: status || 502 });
    }
}

module.exports = {
    serveScore,
    parseJsonBody,
    buildScoreRequest,
    invokeOpenAi,
};
