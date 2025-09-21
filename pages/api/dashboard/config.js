import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId, organizationId } = req.query;

      const config = await prisma.dashboardConfig.findFirst({
        where: {
          userId,
          organizationId,
          isDefault: true
        }
      });

      if (!config) {
        // Return default configuration
        return res.status(200).json({
          visibleColumns: [
            'zendesk.id',
            'zendesk.subject',
            'zendesk.status',
            'zendesk.priority',
            'zendesk.assignee',
            'zendesk.created_at'
          ],
          columnOrder: [
            'zendesk.id',
            'zendesk.subject',
            'zendesk.status',
            'zendesk.priority',
            'zendesk.assignee',
            'zendesk.created_at'
          ],
          columnDisplayNames: {},
          filters: {}
        });
      }

      // Parse JSON strings for SQLite compatibility
      const parsedConfig = {
        ...config,
        visibleColumns: JSON.parse(config.visibleColumns || '[]'),
        columnOrder: JSON.parse(config.columnOrder || '[]'),
        columnDisplayNames: config.columnDisplayNames ? JSON.parse(config.columnDisplayNames) : {},
        filters: config.filters ? JSON.parse(config.filters) : {}
      };

      res.status(200).json(parsedConfig);
    } catch (error) {
      console.error('Error fetching dashboard config:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } 
  if (req.method === 'POST') {
    try {
      const { userId, organizationId, visibleColumns, columnOrder, columnDisplayNames, filters } = req.body;

      const config = await prisma.dashboardConfig.upsert({
        where: {
          userId_organizationId_configName: {
            userId,
            organizationId,
            configName: 'default'
          }
        },
        update: {
          visibleColumns: JSON.stringify(visibleColumns),
          columnOrder: JSON.stringify(columnOrder),
          columnDisplayNames: JSON.stringify(columnDisplayNames || {}),
          filters: JSON.stringify(filters)
        },
        create: {
          userId,
          organizationId,
          configName: 'default',
          visibleColumns: JSON.stringify(visibleColumns),
          columnOrder: JSON.stringify(columnOrder),
          columnDisplayNames: JSON.stringify(columnDisplayNames || {}),
          filters: JSON.stringify(filters),
          isDefault: true
        }
      });

      res.status(200).json(config);
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
