// API endpoint for managing Zendesk background sync jobs
// /api/zendesk/sync-config

import zendeskSyncService from '../../../lib/zendesk-sync-service';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const { organizationId } = req.query;
  
  console.log(`sync-config API called: ${req.method} for org: ${organizationId}`);
  
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  if (req.method === 'GET') {
    // Get current sync configuration and status
    try {
      const syncStatus = await zendeskSyncService.getSyncStatus(organizationId);
      
      if (!syncStatus) {
        return res.status(404).json({ error: 'No sync configuration found' });
      }

      return res.status(200).json({
        success: true,
        data: {
          isEnabled: syncStatus.isJobRunning,
          lastSync: syncStatus.lastSync,
          integration: {
            id: syncStatus.integration?.id,
            isActive: syncStatus.integration?.isActive,
            lastSyncAt: syncStatus.integration?.lastSyncAt
          },
          recentLogs: syncStatus.recentLogs.map(log => ({
            id: log.id,
            status: log.status,
            message: log.message,
            syncedAt: log.syncedAt,
            recordsProcessed: log.recordsProcessed,
            errorMessage: log.errorMessage
          }))
        }
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      return res.status(500).json({ error: 'Failed to get sync status' });
    }
  }

  if (req.method === 'POST') {
    // Start or configure sync job
    const { action, interval } = req.body;
    
    console.log(`POST action: ${action} for org: ${organizationId}`);
    
    try {
      switch (action) {
        case 'start':
          console.log('Calling startSyncJob...');
          await zendeskSyncService.startSyncJob(organizationId, interval);
          console.log('startSyncJob completed successfully');
          return res.status(200).json({ 
            success: true, 
            message: 'Sync job started successfully' 
          });
          
        case 'stop':
          zendeskSyncService.stopSyncJob(organizationId);
          return res.status(200).json({ 
            success: true, 
            message: 'Sync job stopped successfully' 
          });
          
        case 'trigger':
          await zendeskSyncService.triggerManualSync(organizationId);
          return res.status(200).json({ 
            success: true, 
            message: 'Manual sync triggered successfully' 
          });
          
        case 'update-interval':
          if (!interval) {
            return res.status(400).json({ error: 'Interval is required for update-interval action' });
          }
          await zendeskSyncService.updateSyncInterval(organizationId, interval);
          return res.status(200).json({ 
            success: true, 
            message: 'Sync interval updated successfully' 
          });
          
        default:
          return res.status(400).json({ error: 'Invalid action. Supported actions: start, stop, trigger, update-interval' });
      }
    } catch (error) {
      console.error('Error managing sync job:', error);
      return res.status(500).json({ error: 'Failed to manage sync job: ' + error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}