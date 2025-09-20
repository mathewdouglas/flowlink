import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
}

// Get field mappings for an organization
async function handleGet(req, res) {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const mappings = await prisma.fieldMapping.findMany({
      where: {
        organizationId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(mappings);
  } catch (error) {
    console.error('Error fetching field mappings:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new field mapping
async function handlePost(req, res) {
  try {
    const { 
      organizationId, 
      sourceSystem, 
      sourceField, 
      targetSystem, 
      targetField, 
      mappingName 
    } = req.body;

    if (!organizationId || !sourceSystem || !sourceField || !targetSystem || !targetField || !mappingName) {
      return res.status(400).json({ 
        message: 'All fields are required: organizationId, sourceSystem, sourceField, targetSystem, targetField, mappingName' 
      });
    }

    // Check if mapping already exists
    const existingMapping = await prisma.fieldMapping.findFirst({
      where: {
        organizationId,
        sourceSystem,
        sourceField,
        targetSystem,
        targetField,
        isActive: true
      }
    });

    if (existingMapping) {
      return res.status(409).json({ message: 'Field mapping already exists' });
    }

    const mapping = await prisma.fieldMapping.create({
      data: {
        organizationId,
        sourceSystem,
        sourceField,
        targetSystem,
        targetField,
        mappingName
      }
    });

    return res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating field mapping:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a field mapping
async function handlePut(req, res) {
  try {
    const { mappingId, organizationId, mappingName, isActive } = req.body;

    if (!mappingId || !organizationId) {
      return res.status(400).json({ message: 'Mapping ID and organization ID are required' });
    }

    const updateData = {};
    if (mappingName !== undefined) updateData.mappingName = mappingName;
    if (isActive !== undefined) updateData.isActive = isActive;

    const mapping = await prisma.fieldMapping.updateMany({
      where: {
        id: mappingId,
        organizationId
      },
      data: updateData
    });

    if (mapping.count === 0) {
      return res.status(404).json({ message: 'Field mapping not found' });
    }

    // Return the updated mapping
    const updatedMapping = await prisma.fieldMapping.findFirst({
      where: { id: mappingId }
    });

    return res.status(200).json(updatedMapping);
  } catch (error) {
    console.error('Error updating field mapping:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete a field mapping
async function handleDelete(req, res) {
  try {
    const { mappingId, organizationId } = req.query;

    if (!mappingId || !organizationId) {
      return res.status(400).json({ message: 'Mapping ID and organization ID are required' });
    }

    // Soft delete by setting isActive to false
    const mapping = await prisma.fieldMapping.updateMany({
      where: {
        id: mappingId,
        organizationId
      },
      data: {
        isActive: false
      }
    });

    if (mapping.count === 0) {
      return res.status(404).json({ message: 'Field mapping not found' });
    }

    return res.status(200).json({ message: 'Field mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting field mapping:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
