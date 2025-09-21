import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { organizationId } = req.query;

    const integrations = await prisma.integration.findMany({
      where: {
        organizationId: organizationId,
        isActive: true
      },
      select: {
        id: true,
        systemType: true,
        systemName: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.status(200).json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
