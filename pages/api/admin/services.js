// API route to initialize and manage background services
// This ensures both Zendesk and Jira background sync services start when the server starts

import zendeskSyncService from '../../../lib/zendesk-sync-service';
import jiraSyncService from '../../../lib/jira-sync-service';
import prisma from '../../../lib/prisma';

let isServiceInitialized = false;

// Helper function to get sync status from database
async function getSyncStatusData(organizationId) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get recent logs for both systems
    const recentLogs = await prisma.syncLog.findMany({
      where: {
        integration: {
          organizationId: organizationId
        },
        syncedAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        integration: true
      },
      orderBy: {
        syncedAt: 'desc'
      },
      take: 10
    });

    // Get record counts
    const totalRecords = await prisma.flowRecord.count({
      where: { organizationId: organizationId }
    });

    const recordsToday = await prisma.flowRecord.count({
      where: {
        organizationId: organizationId,
        createdAt: { gte: startOfDay }
      }
    });

    // Count consecutive errors
    const recentErrors = await prisma.syncLog.findMany({
      where: {
        integration: {
          organizationId: organizationId
        },
        status: 'error'
      },
      include: {
        integration: true
      },
      orderBy: {
        syncedAt: 'desc'
      },
      take: 10
    });

    let consecutiveErrors = 0;
    for (const log of recentErrors) {
      if (log.status === 'error') {
        consecutiveErrors++;
      } else {
        break;
      }
    }

    return {
      lastSync: recentLogs.length > 0 ? recentLogs[0].syncedAt : null,
      stats: {
        totalRecords,
        recordsToday,
        consecutiveErrors
      },
      recentLogs: recentLogs.map(log => ({
        ...log,
        system: log.integration?.systemType === 'zendesk' ? 'Zendesk' : 
               log.integration?.systemType === 'jira' ? 'Jira' : 'Unknown'
      }))
    };
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return {
      lastSync: null,
      stats: { totalRecords: 0, recordsToday: 0, consecutiveErrors: 0 },
      recentLogs: []
    };
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action } = req.body;

    try {
      switch (action) {
        case 'start':
          if (!isServiceInitialized) {
            await zendeskSyncService.start();
            await jiraSyncService.start();
            isServiceInitialized = true;
          }
          return res.status(200).json({ 
            success: true, 
            message: 'Background services (Zendesk & Jira) started',
            isRunning: isServiceInitialized
          });

        case 'stop':
          if (isServiceInitialized) {
            zendeskSyncService.stop();
            jiraSyncService.stop();
            isServiceInitialized = false;
          }
          return res.status(200).json({ 
            success: true, 
            message: 'Background services (Zendesk & Jira) stopped',
            isRunning: isServiceInitialized
          });

        case 'restart':
          if (isServiceInitialized) {
            zendeskSyncService.stop();
            jiraSyncService.stop();
          }
          await zendeskSyncService.start();
          await jiraSyncService.start();
          isServiceInitialized = true;
          return res.status(200).json({ 
            success: true, 
            message: 'Background services (Zendesk & Jira) restarted',
            isRunning: isServiceInitialized
          });

        case 'trigger':
          // Trigger manual sync for both systems
          try {
            const orgId = req.query.organizationId || req.body.organizationId;
            if (!orgId) {
              return res.status(400).json({ error: 'Organization ID is required' });
            }
            
            // Trigger Zendesk manual sync
            const zendeskResult = await zendeskSyncService.triggerManualSync(orgId);
            
                        // For Jira, we need to get credentials first and then sync
            const jiraCredentials = await prisma.integrationCredentials.findFirst({
              where: {
                organizationId: orgId,
                systemType: 'jira'
              }
            });
            
            let jiraResult = 'No Jira credentials found';
            if (jiraCredentials) {
              if (jiraCredentials.email && jiraCredentials.apiKey) {
                const jiraConfig = jiraCredentials.customConfig ? JSON.parse(jiraCredentials.customConfig) : {};
                const baseUrl = jiraConfig.url || `https://${jiraConfig.subdomain}.atlassian.net`;
                
                try {
                  jiraResult = await jiraSyncService.syncJiraIssues(orgId, {
                    baseUrl: baseUrl,
                    email: jiraCredentials.email,
                    apiToken: jiraCredentials.apiKey
                  });
                } catch (error) {
                  jiraResult = `Jira sync failed: ${error.message}`;
                }
              } else {
                jiraResult = 'Jira credentials incomplete (missing email or API key)';
              }
            }
            
            return res.status(200).json({ 
              success: true, 
              message: 'Manual sync triggered for both systems',
              results: {
                zendesk: zendeskResult,
                jira: jiraResult
              }
            });
          } catch (error) {
            console.error('Error triggering manual sync:', error);
            return res.status(500).json({ 
              error: 'Failed to trigger manual sync: ' + error.message 
            });
          }

        default:
          return res.status(400).json({ error: 'Invalid action. Use: start, stop, restart, trigger' });
      }
    } catch (error) {
      console.error('Error managing background services:', error);
      return res.status(500).json({ 
        error: 'Failed to manage services: ' + error.message 
      });
    }
  }

  if (req.method === 'GET') {
    // Get service status for both systems
    const orgId = req.query.organizationId;
    
    try {
      let statusData = {
        lastSync: null,
        stats: { totalRecords: 0, recordsToday: 0, consecutiveErrors: 0 },
        recentLogs: []
      };

      if (orgId) {
        statusData = await getSyncStatusData(orgId);
      }

      return res.status(200).json({
        success: true,
        isRunning: isServiceInitialized,
        message: isServiceInitialized ? 'Background services (Zendesk & Jira) are running' : 'Background services are not running',
        data: statusData
      });
    } catch (error) {
      console.error('Error fetching combined status:', error);
      return res.status(200).json({
        success: true,
        isRunning: isServiceInitialized,
        message: isServiceInitialized ? 'Background services are running' : 'Background services are not running',
        data: {
          lastSync: null,
          stats: { totalRecords: 0, recordsToday: 0, consecutiveErrors: 0 },
          recentLogs: []
        }
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

// Auto-start both services when this module loads
if (typeof window === 'undefined' && !isServiceInitialized) {
  // Only run on server side
  setTimeout(async () => {
    try {
      console.log('Auto-starting background sync services (Zendesk & Jira)...');
      await zendeskSyncService.start();
      await jiraSyncService.start();
      isServiceInitialized = true;
      console.log('Background sync services auto-started successfully');
    } catch (error) {
      console.error('Failed to auto-start background sync services:', error);
    }
  }, 2000); // Wait 2 seconds after server start
}