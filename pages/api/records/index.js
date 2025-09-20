const prisma = require('../../../lib/prisma');

module.exports = async function handler(req, res) {
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
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
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

    // Parse JSON fields for SQLite compatibility
    const parsedRecords = records.map(record => ({
      ...record,
      labels: record.labels ? JSON.parse(record.labels) : [],
      customFields: record.customFields ? JSON.parse(record.customFields) : {}
    }));

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
