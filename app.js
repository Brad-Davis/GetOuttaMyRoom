const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./lib/loadEnv');
const { serveScore } = require('./lib/openaiScoreApi');

loadEnv();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const DIST_DIR = path.join(__dirname, 'dist');
const RESOURCES_DIR = path.join(__dirname, 'resources');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');

/**
 * Serve the Vite build whenever it exists (after `npm run build`).
 * Do not rely on RENDER / NODE_ENV — Render may not set them the way we expect.
 */
const serveBuiltSite = fs.existsSync(DIST_INDEX);

// Middleware setup
app.use(express.json({ limit: '64kb' }));

app.post('/api/score', serveScore);

if (serveBuiltSite) {
    app.use(express.static(DIST_DIR));
    app.use('/resources', express.static(RESOURCES_DIR));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        if (path.extname(req.path)) return next();
        res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => (err ? next(err) : undefined));
    });
} else {
    app.use(express.static(PUBLIC_DIR));
}

// Routes
// const userRoutes = require('./src/routes/userRoutes');
// app.use('/users', userRoutes);

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected');
  // Handle socket events here
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
    const mode = serveBuiltSite
        ? 'dist + /resources'
        : 'public only (no dist/index.html — run npm run build)';
    console.log(`Server running on port ${PORT} (${mode})`);
});
