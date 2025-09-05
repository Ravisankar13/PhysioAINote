import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Cache token to avoid excessive API calls
let tokenCache: {
  token: string | null;
  expiresAt: number;
} = {
  token: null,
  expiresAt: 0
};

// Get BioDigital access token
router.post('/api/biodigital/token', async (req, res) => {
  try {
    // Check if we have a valid cached token
    if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
      return res.json({ access_token: tokenCache.token });
    }

    // Get new token from BioDigital
    const clientId = process.env.BIODIGITAL_CLIENT_ID;
    const clientSecret = process.env.BIODIGITAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('BioDigital credentials not configured');
      return res.status(500).json({ 
        error: 'BioDigital API credentials not configured' 
      });
    }

    // BioDigital OAuth2 token endpoint
    // BioDigital uses form-encoded data and Basic auth for client credentials
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://apis.biodigital.com/oauth2/v2/token',
      'grant_type=client_credentials&scope=contentapi',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );

    const { access_token, expires_in } = tokenResponse.data;

    // Cache the token (expire 5 minutes before actual expiry for safety)
    tokenCache = {
      token: access_token,
      expiresAt: Date.now() + ((expires_in - 300) * 1000)
    };

    res.json({ access_token });
  } catch (error) {
    console.error('Error getting BioDigital token:', error);
    res.status(500).json({ 
      error: 'Failed to authenticate with BioDigital API' 
    });
  }
});

// Get available models
router.get('/api/biodigital/models', async (req, res) => {
  try {
    // Get token first
    if (!tokenCache.token || Date.now() >= tokenCache.expiresAt) {
      const clientId = process.env.BIODIGITAL_CLIENT_ID;
      const clientSecret = process.env.BIODIGITAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ 
          error: 'BioDigital API credentials not configured' 
        });
      }

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const tokenResponse = await axios.post(
        'https://apis.biodigital.com/oauth2/v2/token',
        'grant_type=client_credentials&scope=contentapi',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
          }
        }
      );

      tokenCache = {
        token: tokenResponse.data.access_token,
        expiresAt: Date.now() + ((tokenResponse.data.expires_in - 300) * 1000)
      };
    }

    // Search for skeletal models
    const modelsResponse = await axios.get(
      'https://apis.biodigital.com/services/v2/content/collections/myhuman',
      {
        headers: {
          'Authorization': `Bearer ${tokenCache.token}`
        },
        params: {
          type: 'model',
          query: 'skeletal system'
        }
      }
    );

    res.json(modelsResponse.data);
  } catch (error) {
    console.error('Error fetching BioDigital models:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models from BioDigital' 
    });
  }
});

export default router;