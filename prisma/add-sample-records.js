import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleRecords() {
  // Get the organization and integrations
  const org = await prisma.organization.findFirst();
  const zendeskIntegration = await prisma.integration.findFirst({ 
    where: { systemType: 'zendesk' } 
  });
  const jiraIntegration = await prisma.integration.findFirst({ 
    where: { systemType: 'jira' } 
  });

  if (!org || !zendeskIntegration || !jiraIntegration) {
    console.error('Required data not found. Run seed.js first.');
    return;
  }

  // Add sample Zendesk tickets
  await prisma.flowRecord.createMany({
    data: [
      {
        organizationId: org.id,
        sourceIntegrationId: zendeskIntegration.id,
        sourceSystem: 'zendesk',
        sourceId: '12345',
        recordType: 'ticket',
        title: 'Login issues with mobile app',
        description: 'User cannot log into the mobile application',
        status: 'open',
        priority: 'high',
        assigneeEmail: 'john@company.com',
        assigneeName: 'John Smith',
        reporterEmail: 'customer@example.com',
        reporterName: 'Jane Customer',
        labels: JSON.stringify(['mobile', 'login', 'urgent']),
        customFields: JSON.stringify({
          satisfaction_rating: null,
          via: 'email',
          external_id: null
        }),
        sourceUrl: 'https://company.zendesk.com/tickets/12345',
        sourceCreatedAt: new Date('2025-09-18T10:00:00Z'),
        sourceUpdatedAt: new Date('2025-09-19T15:30:00Z')
      },
      {
        organizationId: org.id,
        sourceIntegrationId: zendeskIntegration.id,
        sourceSystem: 'zendesk',
        sourceId: '12346',
        recordType: 'ticket',
        title: 'Feature request: Dark mode',
        description: 'Please add dark mode support to the application',
        status: 'pending',
        priority: 'medium',
        assigneeEmail: 'sarah@company.com',
        assigneeName: 'Sarah Johnson',
        reporterEmail: 'power-user@example.com',
        reporterName: 'Power User',
        labels: JSON.stringify(['feature-request', 'ui']),
        customFields: JSON.stringify({
          satisfaction_rating: 'good',
          via: 'web',
          external_id: 'FR-001'
        }),
        sourceUrl: 'https://company.zendesk.com/tickets/12346',
        sourceCreatedAt: new Date('2025-09-17T14:20:00Z'),
        sourceUpdatedAt: new Date('2025-09-18T09:45:00Z')
      }
    ]
  });

  // Add sample Jira issues
  await prisma.flowRecord.createMany({
    data: [
      {
        organizationId: org.id,
        sourceIntegrationId: jiraIntegration.id,
        sourceSystem: 'jira',
        sourceId: 'PROJ-123',
        recordType: 'issue',
        title: 'Fix authentication bug in API',
        description: 'Token validation fails for certain edge cases',
        status: 'In Progress',
        priority: 'High',
        assigneeEmail: 'dev@company.com',
        assigneeName: 'Dev Team Lead',
        reporterEmail: 'qa@company.com',
        reporterName: 'QA Engineer',
        labels: JSON.stringify(['bug', 'api', 'security']),
        customFields: JSON.stringify({
          issueType: 'Bug',
          project: 'PROJ',
          storyPoints: 5
        }),
        sourceUrl: 'https://company.atlassian.net/browse/PROJ-123',
        sourceCreatedAt: new Date('2025-09-19T08:00:00Z'),
        sourceUpdatedAt: new Date('2025-09-20T11:30:00Z')
      },
      {
        organizationId: org.id,
        sourceIntegrationId: jiraIntegration.id,
        sourceSystem: 'jira',
        sourceId: 'PROJ-124',
        recordType: 'issue',
        title: 'Implement user dashboard analytics',
        description: 'Add analytics widgets to user dashboard',
        status: 'To Do',
        priority: 'Medium',
        assigneeEmail: 'frontend@company.com',
        assigneeName: 'Frontend Dev',
        reporterEmail: 'product@company.com',
        reporterName: 'Product Manager',
        labels: JSON.stringify(['feature', 'dashboard', 'analytics']),
        customFields: JSON.stringify({
          issueType: 'Story',
          project: 'PROJ',
          storyPoints: 8
        }),
        sourceUrl: 'https://company.atlassian.net/browse/PROJ-124',
        sourceCreatedAt: new Date('2025-09-16T13:15:00Z'),
        sourceUpdatedAt: new Date('2025-09-17T16:20:00Z')
      }
    ]
  });

  console.log('Sample records added successfully!');
}

addSampleRecords()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
