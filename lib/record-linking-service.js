// Record linking service - automatically creates links based on field mappings
import prisma from './prisma.js';
import { applyFieldTransformation } from './field-transformations.js';

export class RecordLinkingService {
  constructor(organizationId) {
    this.organizationId = organizationId;
  }

  /**
   * Main method to process all field mappings and create record links
   */
  async processAllMappings() {
    try {
      console.log(`Starting record linking for organization ${this.organizationId}`);
      
      // Get all active field mappings
      const mappings = await prisma.fieldMapping.findMany({
        where: {
          organizationId: this.organizationId,
          isActive: true
        }
      });

      if (mappings.length === 0) {
        console.log('No active field mappings found');
        return { linksCreated: 0, mappingsProcessed: 0 };
      }

      console.log(`Found ${mappings.length} active field mappings`);
      
      let totalLinksCreated = 0;
      let mappingsProcessed = 0;

      // Process each mapping
      for (const mapping of mappings) {
        try {
          const linksCreated = await this.processSingleMapping(mapping);
          totalLinksCreated += linksCreated;
          mappingsProcessed++;
          
          console.log(`✓ Processed mapping "${mapping.mappingName}": ${linksCreated} links created`);
        } catch (error) {
          console.error(`Error processing mapping "${mapping.mappingName}":`, error);
        }
      }

      console.log(`Completed record linking: ${totalLinksCreated} total links created from ${mappingsProcessed} mappings`);
      
      return { 
        linksCreated: totalLinksCreated, 
        mappingsProcessed 
      };
    } catch (error) {
      console.error('Error in processAllMappings:', error);
      throw error;
    }
  }

  /**
   * Process a single field mapping to create record links
   */
  async processSingleMapping(mapping) {
    console.log(`Processing mapping: ${mapping.sourceSystem}.${mapping.sourceField} → ${mapping.targetSystem}.${mapping.targetField}`);
    
    // Get all records for source system
    const sourceRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId: this.organizationId,
        sourceSystem: mapping.sourceSystem.toLowerCase()
      }
    });

    // Get all records for target system  
    const targetRecords = await prisma.flowRecord.findMany({
      where: {
        organizationId: this.organizationId,
        sourceSystem: mapping.targetSystem.toLowerCase()
      }
    });

    console.log(`Found ${sourceRecords.length} ${mapping.sourceSystem} records and ${targetRecords.length} ${mapping.targetSystem} records`);

    if (sourceRecords.length === 0 || targetRecords.length === 0) {
      console.log('Insufficient records for linking');
      return 0;
    }

    // Create index of target records by their field values
    const targetIndex = await this.buildTargetIndex(targetRecords, mapping);
    console.log(`Built target index with ${Object.keys(targetIndex).length} entries`);

    let linksCreated = 0;

    // Process each source record
    for (const sourceRecord of sourceRecords) {
      try {
        // Extract and transform source field value
        const sourceValue = this.extractFieldValue(sourceRecord, mapping.sourceField);
        if (!sourceValue) continue;

        console.log(`Processing source record ${sourceRecord.id}, source value: "${sourceValue}"`);

        // Apply source transformation if configured
        let transformedSourceValue = sourceValue;
        if (mapping.sourceTransform || mapping.transformationType) {
          try {
            transformedSourceValue = await this.applyTransformation(
              sourceValue, 
              mapping.sourceTransform, 
              mapping.transformationType
            );
            console.log(`  Transformed to: "${transformedSourceValue}"`);
          } catch (transformError) {
            console.error(`  Transformation failed:`, transformError);
            continue;
          }
        }

        if (!transformedSourceValue) {
          console.log(`  No transformed value, skipping`);
          continue;
        }

        // Find matching target records
        const matchingTargetIds = targetIndex[transformedSourceValue.toLowerCase()] || [];
        console.log(`  Found ${matchingTargetIds.length} matching target records`);

        // Create links with matching target records
        for (const targetId of matchingTargetIds) {
          try {
            const linkCreated = await this.createRecordLink(
              sourceRecord.id,
              targetId,
              mapping
            );
            if (linkCreated) {
              linksCreated++;
              console.log(`  ✓ Created link with target record ${targetId}`);
            }
          } catch (linkError) {
            console.error(`  Error creating link with target ${targetId}:`, linkError);
          }
        }
      } catch (recordError) {
        console.error(`Error processing source record ${sourceRecord.id}:`, recordError);
      }
    }

    return linksCreated;
  }

  /**
   * Build an index of target records by their field values for fast lookup
   */
  async buildTargetIndex(targetRecords, mapping) {
    const index = {};

    for (const record of targetRecords) {
      try {
        // Extract target field value
        const targetValue = this.extractFieldValue(record, mapping.targetField);
        if (!targetValue) continue;

        // Apply target transformation if configured
        let transformedTargetValue = targetValue;
        if (mapping.targetTransform || mapping.transformationType) {
          try {
            transformedTargetValue = await this.applyTransformation(
              targetValue,
              mapping.targetTransform,
              mapping.transformationType
            );
          } catch (transformError) {
            console.error(`Target transformation failed for record ${record.id}:`, transformError);
            continue;
          }
        }

        if (transformedTargetValue) {
          const key = transformedTargetValue.toLowerCase();
          if (!index[key]) {
            index[key] = [];
          }
          index[key].push(record.id);
        }
      } catch (error) {
        console.error(`Error indexing target record ${record.id}:`, error);
      }
    }

    return index;
  }

  /**
   * Extract field value from a record
   */
  extractFieldValue(record, fieldName) {
    // Handle custom fields (stored as JSON)
    if (fieldName.startsWith('custom_')) {
      if (record.customFields) {
        try {
          const customFields = JSON.parse(record.customFields);
          const actualFieldName = fieldName.replace('custom_', '');
          return customFields[actualFieldName];
        } catch (error) {
          console.error(`Error parsing custom fields for record ${record.id}:`, error);
          return null;
        }
      }
      return null;
    }

    // Handle standard fields
    switch (fieldName) {
      case 'id':
        return record.sourceId;
      case 'key':
        return record.sourceId; // For Jira, key is stored in sourceId
      case 'title':
      case 'subject':
      case 'summary':
        return record.title;
      case 'description':
        return record.description;
      case 'status':
        return record.status;
      case 'priority':
        return record.priority;
      case 'assignee':
        return record.assigneeName || record.assigneeEmail;
      case 'reporter':
        return record.reporterName || record.reporterEmail;
      default:
        return record[fieldName];
    }
  }

  /**
   * Apply field transformation to a value
   */
  async applyTransformation(value, transformConfig, transformationType) {
    if (!value) return null;

    // If we have a transformation type, use it
    if (transformationType) {
      return applyFieldTransformation(value, transformationType, {});
    }

    // If we have transform config, parse and apply it
    if (transformConfig) {
      try {
        const config = typeof transformConfig === 'string' 
          ? JSON.parse(transformConfig) 
          : transformConfig;
        
        if (config.type) {
          return applyFieldTransformation(value, config.type, config);
        }
      } catch (error) {
        console.error('Error parsing transformation config:', error);
      }
    }

    return value;
  }

  /**
   * Create a record link between two records
   */
  async createRecordLink(sourceRecordId, targetRecordId, mapping) {
    try {
      // Check if link already exists
      const existingLink = await prisma.recordLink.findFirst({
        where: {
          organizationId: this.organizationId,
          OR: [
            { sourceRecordId, targetRecordId },
            { sourceRecordId: targetRecordId, targetRecordId: sourceRecordId }
          ],
          isActive: true
        }
      });

      if (existingLink) {
        console.log(`  Link already exists between ${sourceRecordId} and ${targetRecordId}`);
        return false;
      }

      // Create new link
      await prisma.recordLink.create({
        data: {
          organizationId: this.organizationId,
          sourceRecordId,
          targetRecordId,
          linkType: 'field_mapping',
          linkName: mapping.mappingName,
          metadata: JSON.stringify({
            mappingId: mapping.id,
            createdBy: 'auto_linking_service',
            sourceSystem: mapping.sourceSystem,
            targetSystem: mapping.targetSystem,
            sourceField: mapping.sourceField,
            targetField: mapping.targetField
          })
        }
      });

      return true;
    } catch (error) {
      // If it's a unique constraint violation, the link already exists
      if (error.code === 'P2002') {
        console.log(`  Duplicate link prevented between ${sourceRecordId} and ${targetRecordId}`);
        return false;
      }
      throw error;
    }
  }
}

/**
 * Convenience function to process all mappings for an organization
 */
export async function processRecordLinking(organizationId) {
  const service = new RecordLinkingService(organizationId);
  return await service.processAllMappings();
}