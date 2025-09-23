// API endpoint for managing Zendesk configuration settings
import prisma from '../../../lib/prisma';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get current configuration
      const credentials = await prisma.integrationCredentials.findUnique({
        where: {
          organizationId_systemType: {
            organizationId: CURRENT_ORG_ID,
            systemType: 'zendesk'
          }
        }
      });

      if (!credentials) {
        return res.status(404).json({ error: 'Zendesk credentials not found' });
      }

      const config = credentials.customConfig ? JSON.parse(credentials.customConfig) : {};
      
      return res.status(200).json({
        success: true,
        config: {
          autoSolveMissingTickets: config.autoSolveMissingTickets !== false, // Default to true
          searchQuery: config.searchQuery || '',
          ...config
        }
      });
    }

    if (req.method === 'POST') {
      // Update configuration
      const { autoSolveMissingTickets, searchQuery } = req.body;

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
        return res.status(404).json({ error: 'Zendesk credentials not found' });
      }

      // Parse existing config
      const existingConfig = credentials.customConfig ? JSON.parse(credentials.customConfig) : {};
      
      // Update config with new values
      const updatedConfig = {
        ...existingConfig,
        ...(autoSolveMissingTickets !== undefined && { autoSolveMissingTickets }),
        ...(searchQuery !== undefined && { searchQuery })
      };

      // Save updated config
      await prisma.integrationCredentials.update({
        where: {
          organizationId_systemType: {
            organizationId: CURRENT_ORG_ID,
            systemType: 'zendesk'
          }
        },
        data: {
          customConfig: JSON.stringify(updatedConfig),
          updatedAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        config: updatedConfig
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Error managing Zendesk config:', error);
    res.status(500).json({ error: 'Failed to manage configuration: ' + error.message });
  }
}