import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In a real app, you'd get this from authentication
const CURRENT_ORG_ID = "cmfroy6570000pldk0c00apwg";

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const customColumns = await prisma.customColumn.findMany({
        where: {
          organizationId: CURRENT_ORG_ID,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

      res.status(200).json({ customColumns });
    } catch (error) {
      console.error('Error fetching custom columns:', error);
      res.status(500).json({ error: 'Failed to fetch custom columns' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, label, type, defaultValue, selectOptions, isRequired } = req.body;

      // Validate required fields
      if (!name || !label || !type) {
        return res.status(400).json({ error: 'Name, label, and type are required' });
      }

      // Validate type
      const validTypes = ['text', 'number', 'date', 'boolean', 'select'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid column type' });
      }

      // For select type, ensure selectOptions is provided
      if (type === 'select' && !selectOptions) {
        return res.status(400).json({ error: 'Select options are required for select type' });
      }

      // Get the next sort order
      const lastColumn = await prisma.customColumn.findFirst({
        where: { organizationId: CURRENT_ORG_ID },
        orderBy: { sortOrder: 'desc' },
      });
      const sortOrder = lastColumn ? lastColumn.sortOrder + 1 : 0;

      const customColumn = await prisma.customColumn.create({
        data: {
          organizationId: CURRENT_ORG_ID,
          name,
          label,
          type,
          defaultValue,
          selectOptions: selectOptions ? JSON.stringify(selectOptions) : null,
          isRequired: isRequired || false,
          sortOrder,
        },
      });

      res.status(201).json({ customColumn });
    } catch (error) {
      console.error('Error creating custom column:', error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'A column with this name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create custom column' });
      }
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}