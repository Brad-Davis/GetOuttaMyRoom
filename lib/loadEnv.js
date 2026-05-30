const fs = require('fs');
const path = require('path');

/** Load KEY=value pairs from `.env` into process.env (does not override existing vars). */
function loadEnv(envPath = path.join(process.cwd(), '.env')) {
    if (!fs.existsSync(envPath)) return;

    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;

        const key = trimmed.slice(0, eq).trim();
        if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;

        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}

module.exports = { loadEnv };
