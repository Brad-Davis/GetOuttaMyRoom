import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadEnv } = require('./lib/loadEnv');
const { serveScore } = require('./lib/openaiScoreApi');

/** Handle POST /api/score during `npm run dev` without a separate Express process. */
function scoreApiDevPlugin() {
    return {
        name: 'score-api-dev',
        configureServer(server) {
            loadEnv();
            server.middlewares.use((req, res, next) => {
                const pathname = req.url?.split('?')[0];
                if (pathname !== '/api/score') return next();
                return serveScore(req, res);
            });
        },
    };
}

export default defineConfig({
    plugins: [scoreApiDevPlugin()],
});
