const express = require('express');
const router = express.Router();
const { getAccessToken } = require('../helpers/sfmcAuth');

// Proxy endpoint to get a token (for frontend use if needed)
router.get('/token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ accessToken: token });
  } catch (err) {
    console.error('Auth token error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
