import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { organizationId, system } = req.query;

    // Build where clause
    const where = {
      organizationId: organizationId
    };

    if (system && system !== 'all') {
      where.sourceSystem = system;
    }

    // Get records with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.all === 'true' ? undefined : (parseInt(req.query.limit) || 50);
    const skip = req.query.all === 'true' ? undefined : ((page - 1) * limit);

    let records, total;
    if (req.query.all === 'true') {
      // Load all records without pagination
      [records, total] = await Promise.all([
        prisma.flowRecord.findMany({
          where,
          include: {
            sourceIntegration: {
              select: {
                systemName: true,
                systemType: true
              }
            }
          },
          orderBy: {
            sourceUpdatedAt: 'desc'
          }
        }),
        prisma.flowRecord.count({ where })
      ]);
    } else {
      // Load paginated records
      [records, total] = await Promise.all([
        prisma.flowRecord.findMany({
          where,
          include: {
            sourceIntegration: {
              select: {
                systemName: true,
                systemType: true
              }
            }
          },
          orderBy: {
            sourceUpdatedAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.flowRecord.count({ where })
      ]);
    }

    // Parse JSON fields for SQLite compatibility
    const parsedRecords = records.map(record => {
      let labels = [];
      let customFields = {};
      
      // Safely parse labels
      if (record.labels) {
        try {
          labels = JSON.parse(record.labels);
        } catch (error) {
          // Handle legacy data where labels might be a plain string
          console.warn(`Invalid JSON in labels for record ${record.id}: ${record.labels}`);
          labels = [record.labels]; // Convert string to array
        }
      }
      
      // Safely parse customFields
      if (record.customFields) {
        try {
          customFields = JSON.parse(record.customFields);
        } catch (error) {
          console.warn(`Invalid JSON in customFields for record ${record.id}`);
          customFields = {};
        }
      }
      
      return {
        ...record,
        labels,
        customFields
      };
    });

    res.status(200).json({
      records: parsedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
