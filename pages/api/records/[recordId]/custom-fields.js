import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In a real app, you'd get this from authentication
const CURRENT_ORG_ID = "cmfroy6570000pldk0c00apwg";

export default async function handler(req, res) {
  const { recordId } = req.query;

  if (req.method === 'PUT') {
    try {
      const { customFieldValues } = req.body;

      // Verify the record belongs to the current organization
      const record = await prisma.flowRecord.findUnique({
        where: { id: recordId },
      });

      if (!record || record.organizationId !== CURRENT_ORG_ID) {
        return res.status(404).json({ error: 'Record not found' });
      }

      // Parse existing custom fields
      let existingCustomFields = {};
      try {
        existingCustomFields = record.customFields ? JSON.parse(record.customFields) : {};
      } catch (error) {
        console.warn('Error parsing existing custom fields:', error);
      }

      // Merge with new custom field values
      const updatedCustomFields = {
        ...existingCustomFields,
        ...customFieldValues,
      };

      // Update the record
      const updatedRecord = await prisma.flowRecord.update({
        where: { id: recordId },
        data: {
          customFields: JSON.stringify(updatedCustomFields),
        },
      });

      res.status(200).json({ 
        record: updatedRecord,
        customFields: updatedCustomFields 
      });
    } catch (error) {
      console.error('Error updating record custom fields:', error);
      res.status(500).json({ error: 'Failed to update record custom fields' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}