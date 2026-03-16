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
// Creates an OTT (WhatsApp) send definition in SFMC
router.post('/create-definition', async (req, res) => {
  try {
    const { definitionKey, name, senderId, description, customerKey } = req.body;

    if (!definitionKey || !name || !senderId || !customerKey) {
      return res.status(400).json({
        error: 'Missing required fields: definitionKey, name, senderId, customerKey'
      });
    }

    const token = await getAccessToken();

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

// POST /activity/execute
// Called by JB for each contact entering the activity
router.post('/execute', async (req, res) => {
  try {
    const { inArguments } = req.body;
    const args = mergeInArguments(inArguments);

    const { contactKey, to, definitionKey } = args;

    if (!contactKey || !to || !definitionKey) {
      console.error('Execute missing fields:', { contactKey, to, definitionKey });
      return res.status(400).json({ error: 'Missing contactKey, to, or definitionKey' });
    }

    const token = await getAccessToken();

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
  res.json({ status: 'ok' });
});

// POST /activity/validate
router.post('/validate', (req, res) => {
  const { inArguments } = req.body;
  const args = mergeInArguments(inArguments);

  const errors = [];
  if (!args.definitionKey) errors.push('definitionKey is required');
  if (!args.contactKey) errors.push('contactKey is required');
  if (!args.to) errors.push('to is required');

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  res.json({ status: 'ok' });
});

// POST /activity/publish
router.post('/publish', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /activity/stop
router.post('/stop', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
