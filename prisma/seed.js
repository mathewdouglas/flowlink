import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a sample organization
  const org = await prisma.organization.create({
    data: {
      name: 'Sample Organization',
      slug: 'sample-org'
    }
  });

  // Create a sample user
  const user = await prisma.user.create({
    data: {
      email: 'admin@flowlink.com',
      name: 'Admin User'
    }
  });

  // Link user to organization
  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'admin'
    }
  });

  // Create sample integrations
  const zendeskIntegration = await prisma.integration.create({
    data: {
      organizationId: org.id,
      systemType: 'zendesk',
      systemName: 'Main Zendesk',
      config: JSON.stringify({
        subdomain: 'your-subdomain',
        apiKey: 'your-api-key',
        email: 'admin@flowlink.com'
      })
    }
  });

  const jiraIntegration = await prisma.integration.create({
    data: {
      organizationId: org.id,
      systemType: 'jira',
      systemName: 'Main Jira',
      config: JSON.stringify({
        baseUrl: 'https://your-domain.atlassian.net',
        apiToken: 'your-api-token',
        email: 'admin@flowlink.com'
      })
    }
  });

  console.log('Seeded data:', { org, user, zendeskIntegration, jiraIntegration });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
