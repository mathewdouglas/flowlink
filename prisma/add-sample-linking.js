const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleLinkingData() {
  try {
    // Get existing organization and records
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      console.log('No organization found. Please run the seed script first.');
      return;
    }

    const records = await prisma.flowRecord.findMany({
      where: { organizationId: organization.id }
    });

    if (records.length < 2) {
      console.log('Need at least 2 records to create links. Please run the seed script first.');
      return;
    }

    // Create field mappings
    const fieldMappings = [
      {
        organizationId: organization.id,
        sourceSystem: 'zendesk',
        sourceField: 'id',
        targetSystem: 'jira',
        targetField: 'key',
        mappingName: 'Zendesk-Jira Escalation'
      },
      {
        organizationId: organization.id,
        sourceSystem: 'jira',
        sourceField: 'summary',
        targetSystem: 'slack',
        targetField: 'message',
        mappingName: 'Jira-Slack Notification'
      }
    ];

    console.log('Creating field mappings...');
    for (const mapping of fieldMappings) {
      try {
        await prisma.fieldMapping.create({ data: mapping });
        console.log(`✓ Created field mapping: ${mapping.mappingName}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`- Field mapping already exists: ${mapping.mappingName}`);
        } else {
          console.error(`Error creating field mapping ${mapping.mappingName}:`, error.message);
        }
      }
    }

    // Create record links between different systems
    const zendeskRecords = records.filter(r => r.sourceSystem === 'zendesk');
    const jiraRecords = records.filter(r => r.sourceSystem === 'jira');

    if (zendeskRecords.length > 0 && jiraRecords.length > 0) {
      const recordLinks = [
        {
          organizationId: organization.id,
          sourceRecordId: zendeskRecords[0].id,
          targetRecordId: jiraRecords[0].id,
          linkType: 'escalation',
          linkName: 'Escalated to Development'
        }
      ];

      if (jiraRecords.length > 1) {
        recordLinks.push({
          organizationId: organization.id,
          sourceRecordId: zendeskRecords[0].id,
          targetRecordId: jiraRecords[1].id,
          linkType: 'related',
          linkName: 'Related Issue'
        });
      }

      console.log('Creating record links...');
      for (const link of recordLinks) {
        try {
          await prisma.recordLink.create({ data: link });
          console.log(`✓ Created record link: ${link.linkName}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`- Record link already exists: ${link.linkName}`);
          } else {
            console.error(`Error creating record link ${link.linkName}:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Sample linking data added successfully!');
    
    // Display summary
    const totalMappings = await prisma.fieldMapping.count({
      where: { organizationId: organization.id, isActive: true }
    });
    const totalLinks = await prisma.recordLink.count({
      where: { organizationId: organization.id, isActive: true }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Field Mappings: ${totalMappings}`);
    console.log(`   Record Links: ${totalLinks}`);

  } catch (error) {
    console.error('Error adding sample linking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleLinkingData();
