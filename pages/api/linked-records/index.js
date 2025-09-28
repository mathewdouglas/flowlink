import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Get active field mappings
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { organizationId: organizationId, isActive: true }
    });

    // Get all records with their integrations
    const allRecords = await prisma.flowRecord.findMany({
      where: { organizationId },
      include: { sourceIntegration: { select: { systemName: true, systemType: true } } },
      orderBy: { sourceUpdatedAt: 'desc' }
    });

    // Get all record links for this organization
    const recordLinks = await prisma.recordLink.findMany({
      where: { 
        organizationId: organizationId,
        isActive: true 
      },
      include: {
        sourceRecord: {
          include: { sourceIntegration: { select: { systemName: true, systemType: true } } }
        },
        targetRecord: {
          include: { sourceIntegration: { select: { systemName: true, systemType: true } } }
        }
      }
    });

    console.log(`Found ${recordLinks.length} record links for organization ${organizationId}`);

    // Create a set of linked record IDs for quick lookup
    const linkedRecordIds = new Set();
    recordLinks.forEach(link => {
      linkedRecordIds.add(link.sourceRecordId);
      linkedRecordIds.add(link.targetRecordId);
    });

    // Group links by connected components (records that are transitively linked)
    const linkGroups = [];
    const processedLinks = new Set();

    recordLinks.forEach(link => {
      if (processedLinks.has(link.id)) return;
      
      // Find all records connected to this link (including transitive connections)
      const connectedRecords = new Map(); // recordId -> record
      const connectedLinks = new Set(); // link objects
      
      const exploreConnections = (recordId) => {
        // Find all links involving this record
        recordLinks.forEach(otherLink => {
          if (connectedLinks.has(otherLink.id)) return;
          
          if (otherLink.sourceRecordId === recordId || otherLink.targetRecordId === recordId) {
            connectedLinks.add(otherLink);
            
            // Add both records from this link
            if (!connectedRecords.has(otherLink.sourceRecordId)) {
              connectedRecords.set(otherLink.sourceRecordId, otherLink.sourceRecord);
              exploreConnections(otherLink.sourceRecordId);
            }
            if (!connectedRecords.has(otherLink.targetRecordId)) {
              connectedRecords.set(otherLink.targetRecordId, otherLink.targetRecord);
              exploreConnections(otherLink.targetRecordId);
            }
          }
        });
      };

      // Start exploration from both source and target of this link
      exploreConnections(link.sourceRecordId);
      exploreConnections(link.targetRecordId);

      // Mark all these links as processed
      connectedLinks.forEach(l => processedLinks.add(l.id));

      // Create a linked record group
      if (connectedRecords.size > 1) {
        // Get the primary link (first one in the group)
        const primaryLink = Array.from(connectedLinks)[0];
        const metadata = JSON.parse(primaryLink.metadata || '{}');
        
        // Create records map organized by system type
        const recordsMap = {};
        connectedRecords.forEach((record, recordId) => {
          const systemType = record.sourceIntegration.systemType;
          recordsMap[systemType] = record;
        });

        // Create combined data from all linked records
        const recordsArray = Array.from(connectedRecords.values());
        const combinedData = {
          // Use the first record's data as primary, with fallbacks from other records
          subject: recordsArray.find(r => r.title || r.subject)?.title || 
                   recordsArray.find(r => r.title || r.subject)?.subject || 
                   'No Subject',
          status: recordsArray.find(r => r.status)?.status || 'Unknown',
          assignee: recordsArray.find(r => r.assigneeName || r.assigneeEmail)?.assigneeName ||
                   recordsArray.find(r => r.assigneeName || r.assigneeEmail)?.assigneeEmail ||
                   'Unassigned',
          priority: recordsArray.find(r => r.priority)?.priority || 'N/A'
        };

        // Add system-specific combined data
        recordsArray.forEach(record => {
          const systemType = record.sourceIntegration.systemType;
          combinedData[`${systemType}_id`] = record.sourceId;
          combinedData[`${systemType}_subject`] = record.title || record.subject;
          combinedData[`${systemType}_status`] = record.status;
        });

        linkGroups.push({
          id: `linked-${primaryLink.id}`,
          mappingId: metadata.mappingId || null,
          mappingName: primaryLink.linkName || 'Linked Records',
          sourceSystem: primaryLink.sourceRecord.sourceIntegration.systemType,
          targetSystem: primaryLink.targetRecord.sourceIntegration.systemType,
          linkedField: metadata.sourceField || null,
          linkedValue: metadata.targetField || null,
          records: recordsMap,
          combinedData: combinedData,
          createdAt: new Date(primaryLink.createdAt),
          updatedAt: new Date(primaryLink.updatedAt),
          isUnlinked: false
        });
      }
    });

    // Get unlinked records (records not involved in any links)
    const unlinkedRecords = allRecords
      .filter(record => !linkedRecordIds.has(record.id))
      .map(record => ({
        id: `unlinked-${record.id}`,
        mappingId: null,
        mappingName: 'Unlinked Record',
        sourceSystem: record.sourceIntegration.systemType,
        targetSystem: null,
        linkedField: null,
        linkedValue: null,
        records: { [record.sourceIntegration.systemType]: record },
        combinedData: {
          subject: record.title || record.subject || 'No Subject',
          status: record.status || 'Unknown',
          assignee: record.assigneeName || record.assigneeEmail || 'Unassigned',
          priority: record.priority || 'N/A'
        },
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.sourceUpdatedAt || record.updatedAt),
        isUnlinked: true
      }));

    // Combine linked groups and unlinked records
    const allLinkedRecords = [...linkGroups, ...unlinkedRecords];

    // Calculate stats
    const stats = {
      totalMappings: fieldMappings.length,
      linkedPairs: linkGroups.length,
      unlinkedRecords: unlinkedRecords.length,
      totalRecords: allRecords.length
    };

    console.log(`Returning ${allLinkedRecords.length} records: ${linkGroups.length} linked pairs + ${unlinkedRecords.length} unlinked`);

    return res.status(200).json({
      linkedRecords: allLinkedRecords,
      stats: stats
    });

  } catch (error) {
    console.error('Error fetching linked records:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
