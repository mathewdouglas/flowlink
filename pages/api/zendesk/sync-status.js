// API endpoint for monitoring Zendesk sync status
// /api/zendesk/sync-status

import zendeskSyncService from '../../../lib/zendesk-sync-service';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const { organizationId, action } = req.query;
  
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  // Handle POST requests for service control
  if (req.method === 'POST') {
    const { action } = req.body;
    
    try {
      switch (action) {
        case 'start-service':
          await zendeskSyncService.start();
          return res.status(200).json({
            success: true,
            message: 'Background sync service started'
          });
          
        case 'stop-service':
          zendeskSyncService.stop();
          return res.status(200).json({
            success: true,
            message: 'Background sync service stopped'
          });
          
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error controlling sync service:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get detailed sync status including recent activity
    const syncStatus = await zendeskSyncService.getSyncStatus(organizationId);
    
    if (!syncStatus) {
      return res.status(404).json({ 
        error: 'No Zendesk integration found for this organization' 
      });
    }

    // Get additional statistics
    const integration = syncStatus.integration;
    const stats = await getIntegrationStats(integration?.id);

    return res.status(200).json({
      success: true,
      data: {
        // Job status
        isRunning: syncStatus.isJobRunning,
        lastSync: syncStatus.lastSync,
        
        // Integration details
        integration: integration ? {
          id: integration.id,
          systemName: integration.systemName,
          isActive: integration.isActive,
          lastSyncAt: integration.lastSyncAt,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt
        } : null,
        
        // Recent sync logs
        recentLogs: syncStatus.recentLogs.map(log => ({
          id: log.id,
          status: log.status,
          message: log.message,
          syncedAt: log.syncedAt,
          recordsProcessed: log.recordsProcessed,
          recordsUpdated: log.recordsUpdated,
          recordsCreated: log.recordsCreated,
          errorMessage: log.errorMessage
        })),
        
        // Statistics
        stats: {
          totalRecords: stats.totalRecords,
          recordsToday: stats.recordsToday,
          recordsThisWeek: stats.recordsThisWeek,
          lastSuccessfulSync: stats.lastSuccessfulSync,
          consecutiveErrors: stats.consecutiveErrors
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting detailed sync status:', error);
    return res.status(500).json({ 
      error: 'Failed to get sync status: ' + error.message 
    });
  }
}

// Helper function to get integration statistics
async function getIntegrationStats(integrationId) {
  if (!integrationId) {
    return {
      totalRecords: 0,
      recordsToday: 0,
      recordsThisWeek: 0,
      lastSuccessfulSync: null,
      consecutiveErrors: 0
    };
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay.getTime() - (7 * 24 * 60 * 60 * 1000));

    // Get total records for this integration
    const totalRecords = await prisma.flowRecord.count({
      where: { sourceIntegrationId: integrationId }
    });

    // Get records created today
    const recordsToday = await prisma.flowRecord.count({
      where: {
        sourceIntegrationId: integrationId,
        createdAt: { gte: startOfDay }
      }
    });

    // Get records created this week
    const recordsThisWeek = await prisma.flowRecord.count({
      where: {
        sourceIntegrationId: integrationId,
        createdAt: { gte: startOfWeek }
      }
    });

    // Get last successful sync
    const lastSuccessfulSync = await prisma.syncLog.findFirst({
      where: {
        integrationId,
        status: 'success'
      },
      orderBy: { syncedAt: 'desc' }
    });

    // Count consecutive errors
    const recentLogs = await prisma.syncLog.findMany({
      where: { integrationId },
      orderBy: { syncedAt: 'desc' },
      take: 10
    });

    let consecutiveErrors = 0;
    for (const log of recentLogs) {
      if (log.status === 'error') {
        consecutiveErrors++;
      } else {
        break;
      }
    }

    return {
      totalRecords,
      recordsToday,
      recordsThisWeek,
      lastSuccessfulSync: lastSuccessfulSync?.syncedAt || null,
      consecutiveErrors
    };
    
  } catch (error) {
    console.error('Error calculating integration stats:', error);
    return {
      totalRecords: 0,
      recordsToday: 0,
      recordsThisWeek: 0,
      lastSuccessfulSync: null,
      consecutiveErrors: 0
    };
  }
}