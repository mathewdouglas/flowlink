// API route to check Zendesk connection status
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
          systemType: 'zendesk'
        }
      }
    });

    if (!credentials || !credentials.isActive) {
      return res.status(200).json({ 
        connected: false, 
        status: 'not_configured',
        message: 'No Zendesk credentials configured'
      });
    }

    // Test the connection quickly
    const { subdomain, email, apiKey } = credentials;
    const auth = Buffer.from(`${email}/token:${apiKey}`).toString('base64');
    
    try {
      const testResponse = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json?page[size]=1`, {
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
          message: 'Zendesk connection active',
          subdomain: subdomain
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
    console.error('Error checking Zendesk connection:', err);
    return res.status(500).json({ error: 'Failed to check connection status' });
  }
}