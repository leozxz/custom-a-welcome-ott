require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const activityRoutes = require('./routes/activity');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for all requests
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-sfmc-activity-key');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Normalize double slashes in URL before anything else
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/\/+/g, '/');
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve config.json dynamically with BASE_URL replacement (BEFORE static)
app.get('/config.json', (req, res) => {
  const configPath = path.join(__dirname, 'public', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
  const config = raw.replace(/\{\{BASE_URL\}\}/g, baseUrl);
  res.type('application/json').send(config);
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/activity', activityRoutes);
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', baseUrl: process.env.BASE_URL, timestamp: new Date().toISOString() });
});

// Catch-all: log any unmatched requests
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url} — no route matched`);
  res.status(404).json({ error: 'Not found', path: req.url });
});

app.listen(PORT, () => {
  console.log(`Custom Activity server running on port ${PORT}`);
  console.log(`BASE_URL: ${process.env.BASE_URL}`);
});
