// Background job service for Zendesk sync
// This service runs independently of user browser sessions

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

// Create a new Prisma client instance for this service
const prisma = new PrismaClient();

class ZendeskSyncService {
  constructor() {
    this.jobs = new Map();
    this.defaultInterval = '*/15 * * * *'; // Every 15 minutes
    this.isRunning = false;
  }

  // Start the background sync service
  async start() {
    if (this.isRunning) {
      console.log('Zendesk sync service is already running');
      return;
    }

    console.log('Starting Zendesk background sync service...');
    
    try {
      this.isRunning = true;

      // Load all active organizations and start their sync jobs
      await this.loadAndStartJobs();
      
      console.log('Zendesk sync service started successfully');
    } catch (error) {
      console.error('Error starting Zendesk sync service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop the background sync service
  stop() {
    console.log('Stopping Zendesk sync service...');
    
    // Stop all cron jobs
    this.jobs.forEach((job) => {
      job.destroy();
    });
    
    this.jobs.clear();
    this.isRunning = false;
    
    console.log('Zendesk sync service stopped');
  }

  // Load organizations and start sync jobs for each
  async loadAndStartJobs() {
    try {
      // Get all organizations with active Zendesk credentials
      const orgsWithZendesk = await prisma.integrationCredentials.findMany({
        where: {
          systemType: 'zendesk',
          isActive: true
        },
        include: {
          organization: true
        }
      });

      console.log(`Found ${orgsWithZendesk.length} organizations with active Zendesk integrations`);

      // Start sync job for each organization
      for (const credential of orgsWithZendesk) {
        await this.startSyncJob(credential.organizationId);
      }
    } catch (error) {
      console.error('Error loading sync jobs:', error);
    }
  }

  // Start sync job for a specific organization
  async startSyncJob(organizationId, interval = null) {
    console.log(`startSyncJob called for org: ${organizationId}`);
    
    const jobId = `zendesk-sync-${organizationId}`;
    
    // Ensure the service is marked as running
    if (!this.isRunning) {
      this.isRunning = true;
      console.log('Background sync service auto-started');
    }
    
    // Stop existing job if running
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).destroy();
      console.log(`Destroyed existing job for org: ${organizationId}`);
    }

    const cronInterval = interval || this.defaultInterval;
    console.log(`Starting sync job for org ${organizationId} with interval: ${cronInterval}`);

    // Create cron job
    const job = cron.schedule(cronInterval, async () => {
      await this.syncZendeskTickets(organizationId);
    }, {
      scheduled: true,
      timezone: "America/New_York" // Configure as needed
    });

    this.jobs.set(jobId, job);
    console.log(`Job created and stored. Total jobs: ${this.jobs.size}`);
    
    // Also run initial sync immediately
    await this.syncZendeskTickets(organizationId);
  }

  // Stop sync job for a specific organization
  stopSyncJob(organizationId) {
    const jobId = `zendesk-sync-${organizationId}`;
    
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).destroy();
      this.jobs.delete(jobId);
      console.log(`Stopped sync job for org ${organizationId}`);
      
      // If no jobs are left, mark service as not running
      if (this.jobs.size === 0) {
        this.isRunning = false;
        console.log('No active jobs remaining, service marked as inactive');
      }
    }
  }

  // Main sync function for Zendesk tickets
  async syncZendeskTickets(organizationId) {
    console.log(`Starting Zendesk sync for organization: ${organizationId}`);
    
    try {
      // Get Zendesk credentials
      const credentials = await prisma.integrationCredentials.findUnique({
        where: {
          organizationId_systemType: {
            organizationId,
            systemType: 'zendesk'
          }
        }
      });

      if (!credentials || !credentials.isActive) {
        console.log(`No active Zendesk credentials found for org ${organizationId}`);
        return;
      }

      // Get or create Zendesk integration record
      let integration = await prisma.integration.findFirst({
        where: {
          organizationId,
          systemType: 'zendesk'
        }
      });

      if (!integration) {
        integration = await prisma.integration.create({
          data: {
            organizationId,
            systemType: 'zendesk',
            systemName: 'Zendesk',
            config: JSON.stringify({}),
            isActive: true
          }
        });
      }

      // Fetch tickets from Zendesk
      const tickets = await this.fetchZendeskTickets(credentials);
      
      if (!tickets || tickets.length === 0) {
        console.log(`No tickets found for org ${organizationId}`);
        await this.updateSyncStatus(integration.id, 'success', 'No tickets found');
        return;
      }

      // Process and save tickets
      const processedCount = await this.processTickets(tickets, integration, organizationId);
      
      // Update sync status
      await this.updateSyncStatus(integration.id, 'success', `Processed ${processedCount} tickets`);
      
      console.log(`Successfully synced ${processedCount} tickets for org ${organizationId}`);
      
    } catch (error) {
      console.error(`Error syncing Zendesk tickets for org ${organizationId}:`, error);
      
      // Log error to database if integration exists
      try {
        const integration = await prisma.integration.findFirst({
          where: { organizationId, systemType: 'zendesk' }
        });
        
        if (integration) {
          await this.updateSyncStatus(integration.id, 'error', error.message);
        }
      } catch (logError) {
        console.error('Error logging sync failure:', logError);
      }
    }
  }

  // Fetch tickets from Zendesk API
  async fetchZendeskTickets(credentials) {
    const { subdomain, email, apiKey, customConfig } = credentials;
    const config = customConfig ? JSON.parse(customConfig) : {};
    const searchQuery = config.searchQuery || '';
    
    const auth = Buffer.from(`${email}/token:${apiKey}`).toString('base64');
    
    let url;
    if (searchQuery && searchQuery.trim()) {
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=${encodedQuery}`;
    } else {
      // Fetch recent tickets (last 7 days)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      url = `https://${subdomain}.zendesk.com/api/v2/tickets.json?since=${oneWeekAgo}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Zendesk API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.tickets || data.results || [];
  }

  // Process tickets and save to database
  async processTickets(tickets, integration, organizationId) {
    let processedCount = 0;
    
    for (const ticket of tickets) {
      try {
        // Map Zendesk ticket to FlowRecord format
        const recordData = {
          organizationId,
          sourceIntegrationId: integration.id,
          sourceSystem: 'zendesk',
          sourceId: ticket.id.toString(),
          recordType: 'ticket',
          title: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          assigneeEmail: ticket.assignee_email,
          assigneeName: ticket.assignee_name,
          reporterEmail: ticket.requester_email,
          reporterName: ticket.requester_name,
          labels: ticket.tags ? JSON.stringify(ticket.tags) : null,
          customFields: JSON.stringify({
            via: ticket.via,
            channel: ticket.via?.channel,
            satisfaction_rating: ticket.satisfaction_rating,
            ticket_form_id: ticket.ticket_form_id,
            brand_id: ticket.brand_id,
            group_id: ticket.group_id,
            organization_id: ticket.organization_id,
            forum_topic_id: ticket.forum_topic_id,
            problem_id: ticket.problem_id,
            has_incidents: ticket.has_incidents,
            is_public: ticket.is_public,
            due_at: ticket.due_at,
            collaborator_ids: ticket.collaborator_ids,
            follower_ids: ticket.follower_ids,
            email_cc_ids: ticket.email_cc_ids
          }),
          sourceUrl: ticket.url,
          sourceCreatedAt: ticket.created_at ? new Date(ticket.created_at) : null,
          sourceUpdatedAt: ticket.updated_at ? new Date(ticket.updated_at) : null
        };

        // Upsert the record
        await prisma.flowRecord.upsert({
          where: {
            sourceIntegrationId_sourceId: {
              sourceIntegrationId: integration.id,
              sourceId: ticket.id.toString()
            }
          },
          update: {
            title: recordData.title,
            description: recordData.description,
            status: recordData.status,
            priority: recordData.priority,
            assigneeEmail: recordData.assigneeEmail,
            assigneeName: recordData.assigneeName,
            reporterEmail: recordData.reporterEmail,
            reporterName: recordData.reporterName,
            labels: recordData.labels,
            customFields: recordData.customFields,
            sourceUrl: recordData.sourceUrl,
            sourceUpdatedAt: recordData.sourceUpdatedAt,
            updatedAt: new Date()
          },
          create: recordData
        });

        processedCount++;
      } catch (error) {
        console.error(`Error processing ticket ${ticket.id}:`, error);
      }
    }
    
    return processedCount;
  }

  // Update sync status in database
  async updateSyncStatus(integrationId, status, message) {
    try {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Log sync result
      await prisma.syncLog.create({
        data: {
          integrationId,
          status,
          message,
          syncedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  // Get sync status for an organization
  async getSyncStatus(organizationId) {
    try {
      const integration = await prisma.integration.findFirst({
        where: {
          organizationId,
          systemType: 'zendesk'
        },
        include: {
          syncLogs: {
            orderBy: { syncedAt: 'desc' },
            take: 5
          }
        }
      });

      const jobId = `zendesk-sync-${organizationId}`;
      const isJobRunning = this.jobs.has(jobId);

      const result = {
        integration,
        isJobRunning: this.isRunning && isJobRunning,
        lastSync: integration?.lastSyncAt,
        recentLogs: integration?.syncLogs || [],
        serviceRunning: this.isRunning,
        totalJobs: this.jobs.size
      };
      
      console.log(`Sync status for org ${organizationId}:`, {
        serviceRunning: this.isRunning,
        jobExists: isJobRunning,
        finalStatus: result.isJobRunning,
        totalJobs: this.jobs.size
      });

      return result;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  // Check if service is running
  isServiceRunning() {
    return this.isRunning;
  }

  // Get number of active jobs
  getActiveJobCount() {
    return this.jobs.size;
  }

  // Manual trigger for immediate sync
  async triggerManualSync(organizationId) {
    console.log(`Manual sync triggered for organization: ${organizationId}`);
    await this.syncZendeskTickets(organizationId);
  }

  // Update sync interval for an organization
  async updateSyncInterval(organizationId, newInterval) {
    console.log(`Updating sync interval for org ${organizationId} to: ${newInterval}`);
    await this.startSyncJob(organizationId, newInterval);
  }
}

// Export singleton instance
const zendeskSyncService = new ZendeskSyncService();

export default zendeskSyncService;