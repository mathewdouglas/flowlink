// API route to check Jira connection status
import prisma from '../../../lib/prisma';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if credentials exist and are active
    const credentials = await prisma.integrationCredentials.findUnique({
      where: {
        organizationId_systemType: {
          organizationId: CURRENT_ORG_ID,
          systemType: 'jira'
        }
      }
    });

    if (!credentials || !credentials.isActive) {
      return res.status(200).json({
        connected: false,
        status: 'not_configured',
        message: 'No Jira credentials configured'
      });
    }

    // Test the connection quickly
    const { email: username, apiKey } = credentials;
    const customConfig = credentials.customConfig ? JSON.parse(credentials.customConfig) : {};
    const url = customConfig.url; // Get URL from customConfig
    
    const auth = Buffer.from(`${username}:${apiKey}`).toString('base64');

    try {
      const testResponse = await fetch(`${url}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });

      if (testResponse.ok) {
        return res.status(200).json({
          connected: true,
          status: 'connected',
          message: 'Jira connection active',
          url: url
        });
      } else {
        return res.status(200).json({
          connected: false,
          status: 'error',
          message: `Connection failed: ${testResponse.status === 401 ? 'Invalid credentials' : 'Unable to connect'}`
        });
      }
    } catch (error) {
      return res.status(200).json({
        connected: false,
        status: 'error',
        message: 'Connection timeout or network error'
      });
    }

  } catch (err) {
    console.error('Error checking Jira connection:', err);
    return res.status(500).json({ error: 'Failed to check connection status' });
  }
}