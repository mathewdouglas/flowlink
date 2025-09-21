const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'admin@flowlink.com' },
    update: {},
    create: {
      id: 'cmfroy65h0001pldk9103iapw', // Match the ID used in the app
      email: 'admin@flowlink.com',
      name: 'FlowLink Admin',
      avatarUrl: null
    }
  });
  console.log('✅ Created/updated user:', user.email);

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'flowlink-demo' },
    update: {},
    create: {
      id: 'cmfroy6570000pldk0c00apwg', // Match the ID used in the app
      name: 'FlowLink Demo Company',
      slug: 'flowlink-demo'
    }
  });
  console.log('✅ Created/updated organization:', organization.name);

  // Link user to organization
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'admin'
    }
  });
  console.log('✅ Linked user to organization');

  // Create integrations
  const zendeskIntegration = await prisma.integration.create({
    data: {
      organizationId: organization.id,
      systemType: 'zendesk',
      systemName: 'Zendesk Support',
      config: JSON.stringify({
        fields: ['id', 'subject', 'status', 'priority', 'assignee']
      }),
      isActive: true
    }
  });

  const jiraIntegration = await prisma.integration.create({
    data: {
      organizationId: organization.id,
      systemType: 'jira',
      systemName: 'Jira Projects',
      config: JSON.stringify({
        fields: ['key', 'summary', 'status', 'assignee', 'priority']
      }),
      isActive: true
    }
  });

  const slackIntegration = await prisma.integration.create({
    data: {
      organizationId: organization.id,
      systemType: 'slack',
      systemName: 'Slack Workspace',
      config: JSON.stringify({
        fields: ['message_id', 'channel', 'user', 'text']
      }),
      isActive: true
    }
  });

  console.log('✅ Created integrations: Zendesk, Jira, Slack');

  // Create dashboard config
  await prisma.dashboardConfig.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      configName: 'default',
      visibleColumns: JSON.stringify([
        'zendesk.subject',
        'zendesk.status',
        'zendesk.priority',
        'zendesk.assignee',
        'zendesk.created_at'
      ]),
      columnOrder: JSON.stringify([
        'zendesk.subject',
        'zendesk.status',
        'zendesk.priority',
        'zendesk.assignee',
        'zendesk.created_at'
      ]),
      isDefault: true
    }
  });

  console.log('✅ Created dashboard configuration');

  // Create sample field mappings
  await prisma.fieldMapping.create({
    data: {
      organizationId: organization.id,
      sourceSystem: 'zendesk',
      sourceField: 'assignee_id',
      targetSystem: 'jira',
      targetField: 'assignee',
      mappingName: 'Zendesk-Jira Assignee Mapping'
    }
  });

  console.log('✅ Created field mappings');

  console.log('🎉 Database seed completed successfully!');
  console.log(`👤 User ID: ${user.id}`);
  console.log(`🏢 Organization ID: ${organization.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
