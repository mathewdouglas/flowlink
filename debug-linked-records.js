// Debug script for linked-records API logic
import prisma from './lib/prisma.js';
import { applyFieldTransformation } from './lib/field-transformations.js';

const organizationId = 'cmfroy6570000pldk0c00apwg';

async function debugLinkedRecords() {
  try {
    // Get the field mapping
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: {
        organizationId,
        isActive: true
      }
    });
    
    console.log('Field mappings:', fieldMappings);
    
    if (fieldMappings.length === 0) {
      console.log('No field mappings found');
      return;
    }
    
    const mapping = fieldMappings[0];
    
    // Get all records
    const allRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId
      },
      include: {
        sourceIntegration: {
          select: {
            systemName: true,
            systemType: true
          }
        }
      }
    });
    
    // Group records by system type
    const recordsBySystem = {};
    allRecords.forEach(record => {
      const systemType = record.sourceIntegration.systemType;
      if (!recordsBySystem[systemType]) {
        recordsBySystem[systemType] = [];
      }
      recordsBySystem[systemType].push(record);
    });
    
    console.log('Records by system:', Object.keys(recordsBySystem).map(sys => 
      `${sys}: ${recordsBySystem[sys].length} records`
    ).join(', '));
    
    // Test field access with case-insensitive system names
    const sourceRecords = recordsBySystem[mapping.sourceSystem.toLowerCase()] || [];
    const targetRecords = recordsBySystem[mapping.targetSystem.toLowerCase()] || [];
    
    console.log(`\nUsing case-insensitive access:`);
    console.log(`Source records (${mapping.sourceSystem.toLowerCase()}): ${sourceRecords.length}`);
    console.log(`Target records (${mapping.targetSystem.toLowerCase()}): ${targetRecords.length}`);
    
    // Test field extraction on a sample record
    console.log('\n--- Testing field extraction ---');
    const sampleSourceRecords = sourceRecords.slice(0, 3);
    
    for (let i = 0; i < sampleSourceRecords.length; i++) {
      const record = sampleSourceRecords[i];
      console.log(`\nSource record ${record.id} (${record.sourceId}):`);
      
      // Extract field value using the same logic as the API
      let fieldValue = getFieldValue(record, mapping.sourceField);
      console.log(`  Raw field value (${mapping.sourceField}):`, fieldValue);
      
      if (fieldValue && mapping.transformationType) {
        const transformed = applyTransformation(fieldValue, mapping.sourceTransform, mapping.transformationType);
        console.log(`  Transformed value:`, transformed);
        
        // Check if this matches any target records
        const matches = targetRecords.filter(targetRecord => {
          const targetValue = getFieldValue(targetRecord, mapping.targetField);
          if (!targetValue) return false;
          
          const transformedTargetValue = applyTransformation(targetValue, mapping.targetTransform, mapping.transformationType);
          return transformed && areValuesEqual(transformed, transformedTargetValue);
        });
        
        console.log(`  Matching target records: ${matches.length}`);
        if (matches.length > 0) {
          matches.forEach(match => {
            console.log(`    - ${match.id} (${match.sourceId})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions (copied from the API)
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

  // Handle standard fields like 'key' for Jira
  if (fieldName === 'key' && record.sourceId) {
    return record.sourceId;
  }

  // Try to get from the main record fields first
  if (record[fieldName] !== undefined && record[fieldName] !== null) {
    return record[fieldName];
  }

  return null;
}

function applyTransformation(value, transformConfig, transformationType) {
  if (!value) return value;

  // If we have a transformationType, use it directly
  if (transformationType) {
    try {
      return applyFieldTransformation(value, transformationType, {});
    } catch (error) {
      console.error('Error applying transformation:', error);
      return value;
    }
  }

  return value;
}

function areValuesEqual(value1, value2) {
  if (value1 === value2) return true;
  
  // Convert to strings and compare (handles number/string comparison)
  return String(value1).toLowerCase() === String(value2).toLowerCase();
}

debugLinkedRecords();