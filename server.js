import os from 'os';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { createApiRouter } from './src/api.js';
import { initSockets } from './src/sockets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.socket.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: wss: http: https:; media-src 'self' blob: data:;"
  );
  next();
});

app.use(express.static(join(__dirname, 'public')));

// Secure Host Route with strict Password Requirement
app.use('/host', (req, res, next) => {
  const hostPassword = process.env.HOST_PASSWORD;
  
  // Strict requirement: Refuse to load the dashboard if in Docker (production) without a password
  if (process.env.NODE_ENV === 'production' && (!hostPassword || hostPassword.trim() === '')) {
    return res.status(500).send('FATAL ERROR: HOST_PASSWORD environment variable is not set. For security, you must define a password when running via Docker.');
  }
  
  // Local Development: If no password is set, just allow access
  if (!hostPassword || hostPassword.trim() === '') {
    return next();
  }
  
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (password === hostPassword && password.trim() !== '') {
    return next(); // Password matched and is not blank
  }
  
  res.set('WWW-Authenticate', 'Basic realm="Host Authentication Required"');
  res.status(401).send('Authentication required to access Host Dashboard.');
});

app.get('/host', (req, res) => res.sendFile(join(__dirname, 'public/host.html')));
app.get('/theater', (req, res) => res.sendFile(join(__dirname, 'public/guest.html')));
app.get('/settings', (req, res) => res.sendFile(join(__dirname, 'public/settings.html')));

app.use('/api', createApiRouter(io));

initSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`[P2PTheater] WebRTC Streaming Environment is Running!`);
  console.log(`> Host Control Dashboard: http://localhost:${PORT}/host`);
  console.log(`> Guest Cinema Theater:   http://localhost:${PORT}/theater`);
  console.log(`===================================================`);
});