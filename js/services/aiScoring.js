/**
 * LLM-assisted scoring helpers.
 *
 * API choice (budget-friendly defaults):
 * - OpenAI `gpt-4o-mini`: strong quality/cost for short JSON-ish tasks (~$0.15/1M input, ~$0.60/1M output as of typical public pricing charts).
 * - Google Gemini 1.5 Flash: generous free quota for experimentation; slight integration differences.
 * - Anthropic Claude Haiku: fast/cheap tier if you prefer Anthropic.
 *
 * Security: exposing API keys in the browser is risky. For anything public, proxy calls through your own server or a serverless endpoint and keep keys server-side only.
 */

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * @typedef {object} ScoreResult
 * @property {number} score Numeric score (typically 0–100 unless your rubric says otherwise).
 * @property {string} [reason] Optional short rationale from the model.
 */

function getApiKeyFromEnv() {
    if (typeof import.meta !== 'undefined' && import.meta.env?.OPENAI_API_KEY)
        return import.meta.env.OPENAI_API_KEY;
    if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY)
        return process.env.OPENAI_API_KEY;
    return '';
}

/**
 * Ask the LLM for a numeric score (+ optional reason) parsed from strict JSON output.
 *
 * @param {string} userPrompt What you want scored (instructions, gameplay text, transcript, etc.).
 * @param {object} [options]
 * @param {string} [options.systemInstructions] Overrides the built-in scorer system prompt (include JSON shape requirement if you change it).
 * @param {number} [options.minScore]
 * @param {number} [options.maxScore]
 * @returns {Promise<ScoreResult>}
 */
export async function scoreFromPrompt(userPrompt, options = {}) {
    const apiKey = getApiKeyFromEnv().trim();
    if (!apiKey) throw new Error('Missing API key (set OPENAI_API_KEY or OPENAI_API_KEY).');

    const min = options.minScore ?? 0;
    const max = options.maxScore ?? 100;

    let systemInstructions =
        options.systemInstructions ??
        [
            `You are a deterministic scorer.`,
            `Respond ONLY with a JSON object: {"score": number, "reason": string}.`,
            `Use "reason" as a very concise sentence (≤ 140 chars).`,
            `"score" must be a single number between ${min} and ${max} inclusive (floats ok if justified).`,
        ].join(' ');

    // OpenAI requires the word "json" somewhere in messages when using response_format json_object.
    if (!/json/i.test(systemInstructions) && !/json/i.test(userPrompt)) {
        systemInstructions += ' Respond using json only matching the requested shape.';
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            temperature: 0.25,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemInstructions },
                { role: 'user', content: userPrompt },
            ],
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenAI HTTP ${res.status}: ${errText || res.statusText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Unexpected OpenAI response shape: missing choices[0].message.content');

    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error(`Expected JSON output from model, got: ${content.slice(0, 280)}`);
    }

    const score = Number(parsed.score);
    if (!Number.isFinite(score)) throw new Error(`Invalid numeric "score" in model JSON: ${JSON.stringify(parsed)}`);

    /** @type {ScoreResult} */
    const result = {
        score,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    };

    return result;
}

// Dev-only smoke test: waits for the API response before logging (imports are async-aware).
// Remove or gate with `RUN_AI_SMOKE_TEST` below if this module should stay silent outside dev.
// const RUN_AI_SMOKE_TEST = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;

// if (RUN_AI_SMOKE_TEST) {
//     (async () => {
//         try {
//             const result = await scoreFromPrompt(
//                 `shoot I don't know what to say.`,
//                 {
//                     systemInstructions: `You are a deterministic scorer that scores how likely you would listen to a podcast based on this snippet of text. The score should be a number between 0 and 100.`,
//                 },
//             );
//             console.log('[aiScoring dev test]', result);
//         } catch (err) {
//             console.error('[aiScoring dev test] failed:', err);
//         }
//     })();
// }

async function podcastScore(userResponse, topic) {
    return scoreFromPrompt(
        userResponse,
        {
            systemInstructions: `You are a deterministic scorer that scores how likely you would listen to a podcast about ${topic} based on this snippet of text. The score should be a number between 0 and 100.`,
        },
    );
}

async function insultScore(userResponse, insultTopic) {
    return scoreFromPrompt(
        userResponse,
        {
            systemInstructions: `You are a deterministic scorer that scores how mean of an insult this response is that is supposed to be about ${insultTopic} based on this snippet of text. The score should be a number between 0 and 100.`,
        },
    );
}

async function linkedInScore(userResponse) {
    return scoreFromPrompt(
        userResponse,
        {
            systemInstructions: `You are a deterministic scorer that scores how highly you would think of a person that posts this on LinkedIn based on this snippet of text. The score should be a number between 0 and 100.`,
        },
    );
}

export {podcastScore, insultScore, linkedInScore };