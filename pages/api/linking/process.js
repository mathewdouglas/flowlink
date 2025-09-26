import { processRecordLinking } from '../../../lib/record-linking-service.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Process record linking for an organization
async function handlePost(req, res) {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ 
        message: 'Organization ID is required' 
      });
    }

    console.log(`Starting record linking process for organization: ${organizationId}`);
    
    // Process all field mappings and create record links
    const result = await processRecordLinking(organizationId);
    
    console.log(`Record linking completed:`, result);

    return res.status(200).json({
      message: 'Record linking completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Error processing record linking:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}