require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const activityRoutes = require('./routes/activity');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve config.json dynamically with BASE_URL replacement
app.get('/config.json', (req, res) => {
  const configPath = path.join(__dirname, 'public', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = raw.replace(/\{\{BASE_URL\}\}/g, process.env.BASE_URL);
  res.type('application/json').send(config);
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/activity', activityRoutes);
app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Custom Activity server running on port ${PORT}`);
});
