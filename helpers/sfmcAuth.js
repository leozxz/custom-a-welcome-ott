const axios = require('axios');

// Cache tokens per MID for multi-BU support
const tokenCache = {};
const refreshPromises = {};

async function getAccessToken(mid) {
  const cacheKey = mid || '_default';
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (tokenCache[cacheKey] && now < tokenCache[cacheKey].expiresAt - 60000) {
    return tokenCache[cacheKey].token;
  }

  // Mutex: if a refresh is already in progress for this MID, wait for it
  if (refreshPromises[cacheKey]) {
    return refreshPromises[cacheKey];
  }

  refreshPromises[cacheKey] = (async () => {
    try {
      const body = {
        grant_type: 'client_credentials',
        client_id: process.env.SFMC_CLIENT_ID,
        client_secret: process.env.SFMC_CLIENT_SECRET
      };

      // Scope token to specific BU
      if (mid) {
        body.account_id = mid;
      }

      const response = await axios.post(`${process.env.SFMC_AUTH_URL}/v2/token`, body);

      tokenCache[cacheKey] = {
        token: response.data.access_token,
        expiresAt: now + response.data.expires_in * 1000
      };

      return tokenCache[cacheKey].token;
    } catch (err) {
      delete tokenCache[cacheKey];
      throw new Error(`SFMC Auth failed: ${err.response?.data?.message || err.message}`);
    } finally {
      delete refreshPromises[cacheKey];
    }
  })();

  return refreshPromises[cacheKey];
}

module.exports = { getAccessToken };
