// Quick test of the getFieldValue function
import prisma from './lib/prisma.js';
import { applyFieldTransformation } from './lib/field-transformations.js';

async function testFieldExtraction() {
  try {
    const organizationId = 'cmfroy6570000pldk0c00apwg';
    
    // Get a Zendesk record with a Jira URL
    const record = await prisma.flowRecord.findFirst({
      where: {
        organizationId,
        sourceSystem: 'zendesk',
        customFields: {
          contains: '12935793317775'
        }
      }
    });
    
    console.log('Found record:', record?.id);
    
    if (record) {
      // Test the getFieldValue function
      const fieldValue = getFieldValue(record, 'custom_12935793317775');
      console.log('Field value:', fieldValue);
      
      if (fieldValue) {
        const transformed = applyFieldTransformation(fieldValue, 'extract_jira_key', {});
        console.log('Transformed:', transformed);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getFieldValue(record, fieldName) {
  // Handle custom fields (stored as JSON in the customFields field)
  if (fieldName.startsWith('custom_')) {
    if (record.customFields) {
      try {
        const customFields = typeof record.customFields === 'string' 
          ? JSON.parse(record.customFields) 
          : record.customFields;
        const actualFieldName = fieldName.replace('custom_', '');
        return customFields[actualFieldName];
      } catch (error) {
        console.error(`Error parsing custom fields for record ${record.id}:`, error);
      }
    }
    return null;
  }

  // Handle standard fields
  if (record[fieldName] !== undefined && record[fieldName] !== null) {
    return record[fieldName];
  }

  return null;
}

testFieldExtraction();