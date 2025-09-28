// Background job service for Jira sync
// This service runs independently of user browser sessions

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

// Create a new Prisma client instance for this service
const prisma = new PrismaClient();

// Jira utility functions (inline to avoid import issues)
function buildJqlQuery(options = {}) {
  const { projectKey, components, excludeClosedIssues, additionalJql } = options;
  const conditions = [];

  // Project filter
  if (projectKey) {
    conditions.push(`project = "${projectKey}"`);
  }

  // Component filter
  if (components) {
    const componentList = components.split(',').map(c => c.trim()).filter(Boolean);
    if (componentList.length > 0) {
      if (componentList.length === 1) {
        conditions.push(`component = "${componentList[0]}"`);
      } else {
        const componentConditions = componentList.map(c => `"${c}"`).join(', ');
        conditions.push(`component in (${componentConditions})`);
      }
    }
  }

  // Status filter (exclude closed issues)
  if (excludeClosedIssues) {
    conditions.push('status not in (Closed, Resolved, Done, Cancel)');
  }

  // Additional JQL
  if (additionalJql) {
    conditions.push(`(${additionalJql})`);
  }

  return conditions.join(' AND ');
}

function createJiraAuthHeaders(username, apiToken) {
  const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
  
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

async function searchJiraIssues(baseUrl, headers, jql, options = {}) {
  const { startAt = 0, maxResults = 50, fields } = options;
  
  const params = new URLSearchParams({
    jql,
    startAt: startAt.toString(),
    maxResults: maxResults.toString()
  });

  if (fields) {
    params.append('fields', fields);
  }

  const fullUrl = `${baseUrl}/rest/api/3/search/jql?${params}`;
  console.log('Making Jira API call to:', fullUrl);

  const response = await fetch(fullUrl, {
    headers,
    timeout: 10000
  });

  if (!response.ok) {
    console.error('Jira API error response:', {
      status: response.status,
      statusText: response.statusText,
      url: fullUrl
    });
    throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

class JiraSyncService {
  constructor() {
    this.jobs = new Map();
    this.defaultInterval = '*/15 * * * *'; // Every 15 minutes
    this.isRunning = false;
  }

  // Start the background sync service
  async start() {
    if (this.isRunning) {
      console.log('Jira sync service is already running');
      return;
    }

    console.log('Starting Jira background sync service...');
    
    try {
      this.isRunning = true;

      // Load all active organizations and start their sync jobs
      await this.loadAndStartJobs();
      
      console.log(`Jira sync service started successfully with ${this.jobs.size} jobs`);
    } catch (error) {
      console.error('Error starting Jira sync service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop the background sync service
  stop() {
    console.log('Stopping Jira sync service...');
    
    // Stop all cron jobs
    this.jobs.forEach((job) => {
      job.destroy();
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Jira sync service stopped');
  }

  // Load organizations and start sync jobs for each
  async loadAndStartJobs() {
    try {
      // Get all active Jira credentials
      const credentials = await prisma.integrationCredentials.findMany({
        where: {
          systemType: 'jira',
          isActive: true
        },
        include: {
          organization: true
        }
      });

      console.log(`Found ${credentials.length} active Jira integrations`);

      // Start a sync job for each organization with Jira credentials
      for (const cred of credentials) {
        await this.startSyncJob(cred.organizationId, cred);
      }

    } catch (error) {
      console.error('Error loading Jira sync jobs:', error);
      throw error;
    }
  }

  // Start sync job for a specific organization
  async startSyncJob(organizationId, credentials) {
    const jobKey = `jira-sync-${organizationId}`;
    
    // Stop existing job if any
    if (this.jobs.has(jobKey)) {
      this.jobs.get(jobKey).destroy();
      this.jobs.delete(jobKey);
    }

    try {
      // Create and start the cron job with timeout and error handling
      const job = cron.schedule(this.defaultInterval, async () => {
        try {
          // Add timeout to prevent long-running operations from blocking
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync operation timed out after 5 minutes')), 5 * 60 * 1000)
          );
          
          await Promise.race([
            this.syncJiraIssues(organizationId, credentials),
            timeoutPromise
          ]);
        } catch (error) {
          console.error(`Cron job error for org ${organizationId}:`, error);
          // Continue running, don't let one failure stop the cron job
        }
      }, {
        scheduled: true
      });

      this.jobs.set(jobKey, job);
      console.log(`Started Jira sync job for organization: ${organizationId}`);

      // Run initial sync
      await this.syncJiraIssues(organizationId, credentials);

    } catch (error) {
      console.error(`Error starting Jira sync job for ${organizationId}:`, error);
    }
  }

  // Main sync function for Jira issues
  async syncJiraIssues(organizationId, credentials) {
    const startTime = Date.now();
    console.log(`Starting Jira sync for organization: ${organizationId}`);

    try {
      // Parse custom config to get Jira settings
      const customConfig = credentials.customConfig ? JSON.parse(credentials.customConfig) : {};
      const url = customConfig.url;
      
      if (!url) {
        console.error(`No Jira URL configured for organization: ${organizationId}`);
        return;
      }

      // Build JQL query with configured filters
      const jql = buildJqlQuery({
        projectKey: customConfig.projectKey,
        components: customConfig.components,
        excludeClosedIssues: customConfig.excludeClosedIssues
      });

      // Create authentication headers
      const headers = createJiraAuthHeaders(credentials.email, credentials.apiKey);

      console.log(`Fetching Jira issues with JQL: ${jql}`);

      // Fetch issues from Jira API
      let allIssues = [];
      let startAt = 0;
      const maxResults = 100; // Fetch in batches

      while (true) {
        const searchResults = await searchJiraIssues(url, headers, jql, {
          startAt,
          maxResults,
          fields: 'key,summary,status,priority,assignee,reporter,created,updated,components,project,issuetype,description'
        });

        allIssues = allIssues.concat(searchResults.issues);
        
        if (searchResults.issues.length < maxResults) {
          break; // No more issues to fetch
        }
        
        startAt += maxResults;
      }

      console.log(`Fetched ${allIssues.length} issues from Jira for organization: ${organizationId}`);

      // Get or create integration record
      let integration = await prisma.integration.findFirst({
        where: {
          organizationId,
          systemType: 'jira'
        }
      });

      if (!integration) {
        integration = await prisma.integration.create({
          data: {
            organizationId,
            systemType: 'jira',
            systemName: 'Jira',
            config: JSON.stringify(customConfig),
            isActive: true
          }
        });
      }

      // Process and save issues
      const savedCount = await this.saveJiraIssues(organizationId, integration.id, allIssues, url);

      // Update integration last sync time
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      });

      // Log sync completion
      await this.logSyncResult(integration.id, savedCount, allIssues.length, startTime);

      console.log(`Jira sync completed for organization: ${organizationId}. Processed ${allIssues.length} issues, saved/updated ${savedCount}`);

    } catch (error) {
      console.error(`Jira sync failed for organization ${organizationId}:`, error);
      
      // Try to log the error
      try {
        const integration = await prisma.integration.findFirst({
          where: { organizationId, systemType: 'jira' }
        });
        
        if (integration) {
          await this.logSyncError(integration.id, error.message, startTime);
        }
      } catch (logError) {
        console.error('Failed to log sync error:', logError);
      }
    }
  }

  // Save Jira issues to database
  async saveJiraIssues(organizationId, integrationId, issues, baseUrl) {
    let savedCount = 0;

    for (const issue of issues) {
      try {
        const issueData = {
          organizationId,
          sourceIntegrationId: integrationId,
          sourceSystem: 'jira',
          sourceId: issue.key,
          recordType: 'issue',
          title: issue.fields.summary,
          description: issue.fields.description ? this.stripJiraMarkup(issue.fields.description) : null,
          status: issue.fields.status?.name,
          priority: issue.fields.priority?.name,
          assigneeEmail: issue.fields.assignee?.emailAddress,
          assigneeName: issue.fields.assignee?.displayName,
          reporterEmail: issue.fields.reporter?.emailAddress,
          reporterName: issue.fields.reporter?.displayName,
          labels: issue.fields.components?.length ? JSON.stringify(issue.fields.components.map(c => c.name)) : null,
          customFields: JSON.stringify({
            project: {
              key: issue.fields.project?.key,
              name: issue.fields.project?.name
            },
            issueType: {
              name: issue.fields.issuetype?.name,
              iconUrl: issue.fields.issuetype?.iconUrl
            },
            components: issue.fields.components?.map(c => ({
              name: c.name,
              description: c.description
            })) || [],
            statusCategory: issue.fields.status?.statusCategory?.name
          }),
          sourceUrl: `${baseUrl}/browse/${issue.key}`,
          sourceCreatedAt: new Date(issue.fields.created),
          sourceUpdatedAt: new Date(issue.fields.updated)
        };

        // Upsert the record (insert or update if exists)
        await prisma.flowRecord.upsert({
          where: {
            sourceIntegrationId_sourceId: {
              sourceIntegrationId: integrationId,
              sourceId: issue.key
            }
          },
          update: issueData,
          create: issueData
        });

        savedCount++;

      } catch (error) {
        console.error(`Error saving Jira issue ${issue.key}:`, error);
      }
    }

    return savedCount;
  }

  // Strip Jira markup from description text
  stripJiraMarkup(text) {
    if (!text || typeof text !== 'string') return null;
    
    try {
      // Basic Jira markup removal
      return text
        .replace(/\{[^}]+\}/g, '') // Remove {code}, {quote} blocks
        .replace(/\*([^*]+)\*/g, '$1') // Remove *bold*
        .replace(/_([^_]+)_/g, '$1') // Remove _italic_
        .replace(/\[([^\]]+)\|[^\]]+\]/g, '$1') // Convert [text|url] to text
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim()
        .substring(0, 1000); // Limit length
    } catch (error) {
      console.error('Error processing Jira markup:', error);
      return text ? text.toString().substring(0, 1000) : null;
    }
  }

  // Log successful sync
  async logSyncResult(integrationId, savedCount, totalCount, startTime) {
    const completedAt = new Date();
    
    try {
      await prisma.syncLog.create({
        data: {
          integrationId,
          syncType: 'jira_issues',
          status: 'success',
          message: `Processed ${totalCount} issues, saved/updated ${savedCount}`,
          recordsProcessed: totalCount,
          recordsUpdated: savedCount,
          recordsCreated: savedCount, // Assuming upsert creates/updates
          startedAt: new Date(startTime),
          completedAt: completedAt
        }
      });
    } catch (error) {
      console.error('Failed to log sync result:', error);
    }
  }

  // Log sync error
  async logSyncError(integrationId, errorMessage, startTime) {
    const completedAt = new Date();
    
    try {
      await prisma.syncLog.create({
        data: {
          integrationId,
          syncType: 'jira_issues',
          status: 'error',
          message: 'Sync failed',
          errorMessage: errorMessage,
          startedAt: new Date(startTime),
          completedAt: completedAt
        }
      });
    } catch (error) {
      console.error('Failed to log sync error:', error);
    }
  }

  // Add a new organization to sync
  async addOrganization(organizationId) {
    try {
      const credentials = await prisma.integrationCredentials.findUnique({
        where: {
          organizationId_systemType: {
            organizationId,
            systemType: 'jira'
          }
        }
      });

      if (credentials && credentials.isActive) {
        await this.startSyncJob(organizationId, credentials);
        console.log(`Added Jira sync job for organization: ${organizationId}`);
      }
    } catch (error) {
      console.error(`Error adding Jira sync for organization ${organizationId}:`, error);
    }
  }

  // Remove an organization from sync
  removeOrganization(organizationId) {
    const jobKey = `jira-sync-${organizationId}`;
    
    if (this.jobs.has(jobKey)) {
      this.jobs.get(jobKey).destroy();
      this.jobs.delete(jobKey);
      console.log(`Removed Jira sync job for organization: ${organizationId}`);
    }
  }

  // Get sync status for an organization
  getSyncStatus(organizationId) {
    const jobKey = `jira-sync-${organizationId}`;
    return {
      hasJob: this.jobs.has(jobKey),
      isRunning: this.isRunning,
      totalJobs: this.jobs.size
    };
  }
}

// Export singleton instance
module.exports = new JiraSyncService();