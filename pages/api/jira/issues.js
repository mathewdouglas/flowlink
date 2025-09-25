// API route to fetch Jira issues from database (synced data)
import prisma from '../../../lib/prisma';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get pagination parameters from query
    const startAt = parseInt(req.query.startAt) || 0;
    const maxResults = Math.min(parseInt(req.query.maxResults) || 50, 100);

    // Get Jira integration to check if it exists and get config
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: CURRENT_ORG_ID,
        systemType: 'jira',
        isActive: true
      }
    });

    if (!integration) {
      return res.status(400).json({
        error: 'Jira integration not configured or disabled'
      });
    }

    const config = integration.config ? JSON.parse(integration.config) : {};

    // Get synced Jira issues from database
    const totalCount = await prisma.flowRecord.count({
      where: {
        organizationId: CURRENT_ORG_ID,
        sourceSystem: 'jira'
      }
    });

    const records = await prisma.flowRecord.findMany({
      where: {
        organizationId: CURRENT_ORG_ID,
        sourceSystem: 'jira'
      },
      orderBy: [
        { sourceUpdatedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: startAt,
      take: maxResults
    });

    // Transform database records to match expected Jira issues format
    const transformedIssues = records.map(record => {
      const customFields = record.customFields ? JSON.parse(record.customFields) : {};
      
      return {
        key: record.sourceId,
        summary: record.title,
        status: {
          name: record.status,
          category: customFields.statusCategory
        },
        priority: {
          name: record.priority || 'Normal'
        },
        assignee: record.assigneeName ? {
          displayName: record.assigneeName,
          emailAddress: record.assigneeEmail
        } : null,
        reporter: record.reporterName ? {
          displayName: record.reporterName,
          emailAddress: record.reporterEmail
        } : null,
        project: customFields.project || { key: '', name: 'Unknown Project' },
        issueType: customFields.issueType || { name: 'Task', iconUrl: null },
        components: customFields.components || [],
        created: record.sourceCreatedAt?.toISOString(),
        updated: record.sourceUpdatedAt?.toISOString(),
        description: record.description,
        url: record.sourceUrl
      };
    });

    return res.status(200).json({
      issues: transformedIssues,
      total: totalCount,
      startAt: startAt,
      maxResults: maxResults,
      filters: {
        projectKey: config.projectKey,
        components: config.components,
        excludeClosedIssues: config.excludeClosedIssues
      },
      lastSync: integration.lastSyncAt?.toISOString()
    });

  } catch (error) {
    console.error('Error fetching Jira issues from database:', error);
    return res.status(500).json({
      error: 'Failed to fetch Jira issues',
      message: error.message
    });
  }
}