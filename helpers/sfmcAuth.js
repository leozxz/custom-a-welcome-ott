const axios = require('axios');

let cachedToken = null;
let tokenExpiresAt = 0;
let refreshPromise = null;

async function getAccessToken() {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  // Mutex: if a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const body = {
        grant_type: 'client_credentials',
        client_id: process.env.SFMC_CLIENT_ID,
        client_secret: process.env.SFMC_CLIENT_SECRET
      };

      // Scope token to specific BU if MID is provided
      if (process.env.SFMC_MID) {
        body.account_id = process.env.SFMC_MID;
      }

      const response = await axios.post(`${process.env.SFMC_AUTH_URL}/v2/token`, body);

      cachedToken = response.data.access_token;
      tokenExpiresAt = now + response.data.expires_in * 1000;

      return cachedToken;
    } catch (err) {
      cachedToken = null;
      tokenExpiresAt = 0;
      throw new Error(`SFMC Auth failed: ${err.response?.data?.message || err.message}`);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

module.exports = { getAccessToken };
