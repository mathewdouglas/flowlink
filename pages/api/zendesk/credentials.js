// API route to get current Zendesk credentials
import prisma from '../../../lib/prisma';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current credentials
    const credentials = await prisma.integrationCredentials.findUnique({
      where: {
        organizationId_systemType: {
          organizationId: CURRENT_ORG_ID,
          systemType: 'zendesk'
        }
      }
    });

    if (!credentials) {
      return res.status(200).json({
        configured: false,
        message: 'No Zendesk credentials configured'
      });
    }

    // Return credentials (excluding sensitive data like API key for security)
    return res.status(200).json({
      configured: true,
      subdomain: credentials.subdomain,
      email: credentials.email,
      apiKey: credentials.apiKey, // Include for internal API calls
      isActive: credentials.isActive,
      customConfig: credentials.customConfig ? JSON.parse(credentials.customConfig) : {},
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt
    });

  } catch (err) {
    console.error('Error getting Zendesk credentials:', err);
    return res.status(500).json({ error: 'Failed to get credentials' });
  }
}