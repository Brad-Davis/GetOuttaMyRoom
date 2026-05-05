const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');
const { serveScore } = require('./lib/openaiScoreApi');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware setup
app.use(express.json({ limit: '64kb' }));

app.post('/api/score', serveScore);

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// Routes
// const userRoutes = require('./src/routes/userRoutes');
// app.use('/users', userRoutes);

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected');
  // Handle socket events here
});

// Start server
server.listen(3000, () => {
  console.log('Server running on port 3000');
});
