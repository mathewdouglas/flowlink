import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In a real app, you'd get this from authentication
const CURRENT_ORG_ID = "cmfroy6570000pldk0c00apwg";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { label, type, defaultValue, selectOptions, isRequired } = req.body;

      // Verify the column belongs to the current organization
      const existingColumn = await prisma.customColumn.findUnique({
        where: { id },
      });

      if (!existingColumn || existingColumn.organizationId !== CURRENT_ORG_ID) {
        return res.status(404).json({ error: 'Custom column not found' });
      }

      // Validate type if provided
      if (type) {
        const validTypes = ['text', 'number', 'date', 'boolean', 'select'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ error: 'Invalid column type' });
        }
      }

      const customColumn = await prisma.customColumn.update({
        where: { id },
        data: {
          ...(label && { label }),
          ...(type && { type }),
          ...(defaultValue !== undefined && { defaultValue }),
          ...(selectOptions && { selectOptions: JSON.stringify(selectOptions) }),
          ...(isRequired !== undefined && { isRequired }),
        },
      });

      res.status(200).json({ customColumn });
    } catch (error) {
      console.error('Error updating custom column:', error);
      res.status(500).json({ error: 'Failed to update custom column' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verify the column belongs to the current organization
      const existingColumn = await prisma.customColumn.findUnique({
        where: { id },
      });

      if (!existingColumn || existingColumn.organizationId !== CURRENT_ORG_ID) {
        return res.status(404).json({ error: 'Custom column not found' });
      }

      await prisma.customColumn.delete({
        where: { id },
      });

      res.status(200).json({ message: 'Custom column deleted successfully' });
    } catch (error) {
      console.error('Error deleting custom column:', error);
      res.status(500).json({ error: 'Failed to delete custom column' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}