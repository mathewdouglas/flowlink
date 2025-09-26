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

    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { organizationId: organizationId, isActive: true }
    });

    if (fieldMappings.length === 0) {
      return res.status(200).json({
        linkedRecords: [],
        stats: { totalMappings: 0, linkedPairs: 0, unlinkedRecords: 0, totalRecords: 0 }
      });
    }

    const allRecords = await prisma.flowRecord.findMany({
      where: { organizationId },
      include: { sourceIntegration: { select: { systemName: true, systemType: true } } },
      orderBy: { sourceUpdatedAt: 'desc' }
    });

    const unlinkedRecords = allRecords.map(record => ({
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

    return res.status(200).json({
      linkedRecords: unlinkedRecords,
      stats: {
        totalMappings: fieldMappings.length,
        linkedPairs: 0,
        unlinkedRecords: unlinkedRecords.length,
        totalRecords: allRecords.length
      }
    });

  } catch (error) {
    console.error('Error fetching linked records:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
