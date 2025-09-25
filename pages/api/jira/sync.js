// API route to trigger manual Jira sync
const jiraSyncService = require('../../../lib/jira-sync-service');
import prisma from '../../../lib/prisma';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Jira credentials exist
    const credentials = await prisma.integrationCredentials.findUnique({
      where: {
        organizationId_systemType: {
          organizationId: CURRENT_ORG_ID,
          systemType: 'jira'
        }
      }
    });

    if (!credentials || !credentials.isActive) {
      return res.status(400).json({
        error: 'Jira integration not configured or disabled'
      });
    }

    // Add organization to sync service if not already running
    await jiraSyncService.addOrganization(CURRENT_ORG_ID);

    // Get sync status
    const syncStatus = jiraSyncService.getSyncStatus(CURRENT_ORG_ID);

    return res.status(200).json({
      message: 'Jira sync triggered successfully',
      syncStatus
    });

  } catch (error) {
    console.error('Error triggering Jira sync:', error);
    return res.status(500).json({
      error: 'Failed to trigger Jira sync',
      message: error.message
    });
  }
}