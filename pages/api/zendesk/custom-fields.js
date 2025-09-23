import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { subdomain, email, apiKey } = req.query;

    if (!subdomain || !email || !apiKey) {
      return res.status(400).json({ message: 'Missing required parameters: subdomain, email, apiKey' });
    }

    // Create authorization header
    const auth = Buffer.from(`${email}/token:${apiKey}`).toString('base64');
    
    // Query Zendesk for ticket fields (which includes custom fields)
    const response = await axios.get(
      `https://${subdomain}.zendesk.com/api/v2/ticket_fields.json`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Zendesk ticket fields response:', {
      total: response.data.ticket_fields?.length,
      fields: response.data.ticket_fields?.map(f => ({ id: f.id, type: f.type, title: f.title, active: f.active }))
    });

    // Filter and format custom fields - include both 'custom' type and fields with custom_ prefix
    const allFields = response.data.ticket_fields || [];
    const customFields = allFields
      .filter(field => {
        // Include fields that are not system fields (exclude basic ticket fields)
        const systemTypes = ['subject', 'description', 'status', 'priority', 'assignee', 'group', 'type'];
        return !systemTypes.includes(field.type) && 
               field.id > 360009000000 && // Custom fields typically have higher IDs
               field.active; // Only include active fields
      })
      .map(field => ({
        id: field.id,
        title: field.title,
        description: field.description,
        type: field.type,
        fieldType: field.field_type, // checkbox, text, dropdown, etc.
        active: field.active,
        tag: field.tag,
        key: `zendesk.custom_${field.id}` // This matches our column naming convention
      }));

    console.log('Filtered custom fields:', customFields);

    res.status(200).json({
      success: true,
      customFields,
      total: customFields.length
    });

  } catch (error) {
    console.error('Error fetching Zendesk custom fields:', error);
    
    if (error.response) {
      // Zendesk API error
      return res.status(error.response.status).json({
        message: 'Zendesk API error',
        error: error.response.data?.error || error.message
      });
    }

    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}