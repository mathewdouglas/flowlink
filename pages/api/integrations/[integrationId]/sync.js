import { prisma } from '../../../../lib/prisma';
import { IntegrationService } from '../../../../lib/integrations';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { integrationId } = req.query;

    // Get the integration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        integrationId: integration.id,
        syncType: 'incremental',
        status: 'running'
      }
    });

    try {
      // Create integration service
      const service = IntegrationService.create(integration);
      
      // Fetch records since last sync
      const records = await service.fetchRecords(integration.lastSyncAt);
      
      let recordsCreated = 0;
      let recordsUpdated = 0;

      // Process each record
      for (const recordData of records) {
        const existingRecord = await prisma.flowRecord.findUnique({
          where: {
            sourceIntegrationId_sourceId: {
              sourceIntegrationId: integration.id,
              sourceId: recordData.sourceId
            }
          }
        });

        const recordPayload = {
          organizationId: integration.organizationId,
          sourceIntegrationId: integration.id,
          sourceSystem: integration.systemType,
          ...recordData
        };

        if (existingRecord) {
          await prisma.flowRecord.update({
            where: { id: existingRecord.id },
            data: recordPayload
          });
          recordsUpdated++;
        } else {
          await prisma.flowRecord.create({
            data: recordPayload
          });
          recordsCreated++;
        }
      }

      // Update integration last sync time
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      });

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'completed',
          recordsProcessed: records.length,
          recordsCreated,
          recordsUpdated,
          completedAt: new Date()
        }
      });

      res.status(200).json({
        message: 'Sync completed successfully',
        recordsProcessed: records.length,
        recordsCreated,
        recordsUpdated
      });

    } catch (syncError) {
      // Update sync log with error
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          errorMessage: syncError.message,
          completedAt: new Date()
        }
      });

      throw syncError;
    }

  } catch (error) {
    console.error('Error syncing integration:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
