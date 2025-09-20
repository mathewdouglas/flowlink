const prisma = require('../../../lib/prisma');

module.exports = async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
}

// Get record links for an organization
async function handleGet(req, res) {
  try {
    const { organizationId, recordId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const whereClause = {
      organizationId,
      isActive: true,
    };

    // If recordId is provided, get links for that specific record
    if (recordId) {
      whereClause.OR = [
        { sourceRecordId: recordId },
        { targetRecordId: recordId }
      ];
    }

    const links = await prisma.recordLink.findMany({
      where: whereClause,
      include: {
        sourceRecord: {
          include: {
            sourceIntegration: true
          }
        },
        targetRecord: {
          include: {
            sourceIntegration: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(links);
  } catch (error) {
    console.error('Error fetching record links:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new record link
async function handlePost(req, res) {
  try {
    const { organizationId, sourceRecordId, targetRecordId, linkType, linkName, metadata } = req.body;

    if (!organizationId || !sourceRecordId || !targetRecordId || !linkType) {
      return res.status(400).json({ 
        message: 'Organization ID, source record ID, target record ID, and link type are required' 
      });
    }

    // Check if records exist and belong to the organization
    const [sourceRecord, targetRecord] = await Promise.all([
      prisma.flowRecord.findFirst({
        where: { id: sourceRecordId, organizationId }
      }),
      prisma.flowRecord.findFirst({
        where: { id: targetRecordId, organizationId }
      })
    ]);

    if (!sourceRecord || !targetRecord) {
      return res.status(404).json({ message: 'Source or target record not found' });
    }

    // Check if link already exists
    const existingLink = await prisma.recordLink.findFirst({
      where: {
        OR: [
          { sourceRecordId, targetRecordId },
          { sourceRecordId: targetRecordId, targetRecordId: sourceRecordId }
        ],
        isActive: true
      }
    });

    if (existingLink) {
      return res.status(409).json({ message: 'Link already exists between these records' });
    }

    const link = await prisma.recordLink.create({
      data: {
        organizationId,
        sourceRecordId,
        targetRecordId,
        linkType,
        linkName,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: {
        sourceRecord: {
          include: {
            sourceIntegration: true
          }
        },
        targetRecord: {
          include: {
            sourceIntegration: true
          }
        }
      }
    });

    return res.status(201).json(link);
  } catch (error) {
    console.error('Error creating record link:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete a record link
async function handleDelete(req, res) {
  try {
    const { linkId, organizationId } = req.query;

    if (!linkId || !organizationId) {
      return res.status(400).json({ message: 'Link ID and organization ID are required' });
    }

    // Soft delete by setting isActive to false
    const link = await prisma.recordLink.updateMany({
      where: {
        id: linkId,
        organizationId
      },
      data: {
        isActive: false
      }
    });

    if (link.count === 0) {
      return res.status(404).json({ message: 'Link not found' });
    }

    return res.status(200).json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting record link:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
