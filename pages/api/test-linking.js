import prisma from '../../../lib/prisma';
import { applyFieldTransformation } from '../../../lib/field-transformations';

export default async function handler(req, res) {
  try {
    const organizationId = 'cmfroy6570000pldk0c00apwg';
    
    // Get field mapping
    const mapping = await prisma.fieldMapping.findFirst({
      where: { organizationId, isActive: true }
    });
    
    if (!mapping) {
      return res.json({ error: 'No field mapping found' });
    }
    
    // Get some sample records
    const sourceRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId,
        sourceSystem: mapping.sourceSystem.toLowerCase()
      },
      include: { sourceIntegration: true },
      take: 5
    });
    
    const targetRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId,
        sourceSystem: mapping.targetSystem.toLowerCase()
      },
      include: { sourceIntegration: true },
      take: 5
    });
    
    const results = [];
    
    for (const record of sourceRecords) {
      const fieldValue = getFieldValue(record, mapping.sourceField);
      let transformed = null;
      
      if (fieldValue && mapping.transformationType) {
        transformed = applyFieldTransformation(fieldValue, mapping.transformationType, {});
      }
      
      results.push({
        recordId: record.id,
        sourceId: record.sourceId,
        fieldValue,
        transformed,
        mapping: {
          sourceField: mapping.sourceField,
          transformationType: mapping.transformationType
        }
      });
    }
    
    res.json({
      mapping,
      sourceRecordCount: sourceRecords.length,
      targetRecordCount: targetRecords.length,
      results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function getFieldValue(record, fieldName) {
  if (fieldName.startsWith('custom_')) {
    if (record.customFields) {
      try {
        const customFields = typeof record.customFields === 'string' 
          ? JSON.parse(record.customFields) 
          : record.customFields;
        const actualFieldName = fieldName.replace('custom_', '');
        return customFields[actualFieldName];
      } catch (error) {
        console.error(`Error parsing custom fields:`, error);
      }
    }
    return null;
  }

  if (record[fieldName] !== undefined && record[fieldName] !== null) {
    return record[fieldName];
  }

  return null;
}