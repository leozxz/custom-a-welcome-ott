const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getAccessToken } = require('../helpers/sfmcAuth');

// Helper: merge JB inArguments array into a flat object
function mergeInArguments(inArguments) {
  if (!Array.isArray(inArguments)) return {};
  return inArguments.reduce((acc, obj) => {
    const key = Object.keys(obj)[0];
    acc[key] = obj[key];
    return acc;
  }, {});
}

// POST /activity/create-definition
router.post('/create-definition', async (req, res) => {
  try {
    const { definitionKey, name, senderId, description, customerKey, mid } = req.body;

    if (!definitionKey || !name || !senderId || !customerKey) {
      return res.status(400).json({
        error: 'Missing required fields: definitionKey, name, senderId, customerKey'
      });
    }

    const token = await getAccessToken(mid);

    const payload = {
      definitionKey,
      name,
      senderType: 'WhatsApp',
      senderId,
      status: 'Active',
      description: description || '',
      content: {
        customerKey
      }
    };

    const response = await axios.post(
      `${process.env.SFMC_API_BASE}/messaging/v1/ott/definitions/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Create definition error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

// GET /activity/definitions?mid=XXXXXX
// Lists all OTT definitions for a given BU
router.get('/definitions', async (req, res) => {
  try {
    const { mid } = req.query;
    const token = await getAccessToken(mid);

    const response = await axios.get(
      `${process.env.SFMC_API_BASE}/messaging/v1/ott/definitions/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const definitions = response.data.definitions || response.data.items || [];
    res.json({ definitions });
  } catch (err) {
    console.error('List definitions error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

// POST /activity/execute
router.post('/execute', async (req, res) => {
  try {
    const { inArguments } = req.body;
    const args = mergeInArguments(inArguments);

    const { contactKey, to, definitionKey, mid } = args;

    if (!contactKey || !to || !definitionKey) {
      console.error('Execute missing fields:', { contactKey, to, definitionKey });
      return res.status(400).json({ error: 'Missing contactKey, to, or definitionKey' });
    }

    const token = await getAccessToken(mid);

    const payload = {
      definitionKey,
      recipients: [
        {
          contactKey,
          to,
          messageKey: uuidv4()
        }
      ]
    };

    const response = await axios.post(
      `${process.env.SFMC_API_BASE}/messaging/v1/ott/messages/`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data);
  } catch (err) {
    console.error('Execute error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message
    });
  }
});

// POST /activity/save
router.post('/save', (req, res) => {
  console.log('[save] headers:', JSON.stringify(req.headers, null, 2));
  console.log('[save] body:', JSON.stringify(req.body, null, 2));
  // Return the payload back to JB
  res.status(200).json(req.body);
});

// POST /activity/validate
router.post('/validate', (req, res) => {
  console.log('[validate] headers:', JSON.stringify(req.headers, null, 2));
  console.log('[validate] body:', JSON.stringify(req.body, null, 2));
  // Must return 200 with the payload — JB blocks activation on non-200
  res.status(200).json(req.body);
});

// POST /activity/publish
router.post('/publish', (req, res) => {
  console.log('[publish] headers:', JSON.stringify(req.headers, null, 2));
  console.log('[publish] body:', JSON.stringify(req.body, null, 2));
  res.status(200).json(req.body);
});

// POST /activity/stop
router.post('/stop', (req, res) => {
  console.log('[stop] headers:', JSON.stringify(req.headers, null, 2));
  console.log('[stop] body:', JSON.stringify(req.body, null, 2));
  res.status(200).json(req.body);
});

module.exports = router;
