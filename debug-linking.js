// Debug script to test the linking logic
import prisma from './lib/prisma.js';
import { applyFieldTransformation } from './lib/field-transformations.js';

const organizationId = 'cmfroy6570000pldk0c00apwg';

async function debugLinking() {
  try {
    // Get the field mapping
    const mapping = await prisma.fieldMapping.findFirst({
      where: {
        organizationId,
        isActive: true
      }
    });
    
    console.log('Field mapping:', mapping);
    
    // Get source records (Zendesk)
    const sourceRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId,
        sourceSystem: mapping.sourceSystem.toLowerCase()
      },
      take: 3
    });
    
    console.log(`\nFound ${sourceRecords.length} source records (${mapping.sourceSystem.toLowerCase()})`);
    
    // Get target records (Jira)  
    const targetRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId,
        sourceSystem: mapping.targetSystem.toLowerCase()
      },
      take: 5
    });
    
    console.log(`Found ${targetRecords.length} target records (${mapping.targetSystem.toLowerCase()})`);
    
    // Test field extraction and transformation
    console.log('\n--- Testing field extraction ---');
    for (let i = 0; i < Math.min(3, sourceRecords.length); i++) {
      const record = sourceRecords[i];
      console.log(`\nSource record ${record.id} (${record.sourceId}):`);
      
      // Extract field value
      let fieldValue = null;
      if (mapping.sourceField.startsWith('custom_')) {
        if (record.customFields) {
          const customFields = JSON.parse(record.customFields);
          fieldValue = customFields[mapping.sourceField.replace('custom_', '')];
        }
      }
      
      console.log(`  Field value (${mapping.sourceField}):`, fieldValue);
      
      if (fieldValue && mapping.transformationType) {
        const transformed = applyFieldTransformation(fieldValue, mapping.transformationType, {});
        console.log(`  Transformed value:`, transformed);
      }
    }
    
    console.log('\n--- Testing target records ---');
    for (let i = 0; i < Math.min(5, targetRecords.length); i++) {
      const record = targetRecords[i];
      console.log(`Target record ${record.id}: key="${record.sourceId}"`);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLinking();