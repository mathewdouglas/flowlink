// API route to securely store Zendesk credentials and fetch tickets
// Next.js API route for Zendesk integration (pages/api convention)

import prisma from '../../lib/prisma';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { subdomain, email, apiKey, searchQuery, autoSolveMissingTickets } = req.body;
    if (!subdomain || !email || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Test credentials before saving them
    const auth = Buffer.from(`${email}/token:${apiKey}`).toString('base64');
    try {
      // Test connection with a simple API call
      const testResponse = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json?page[size]=1`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Zendesk connection test failed:', testResponse.status, errorText);
        return res.status(400).json({ 
          error: `Connection failed: ${testResponse.status === 401 ? 'Invalid credentials' : 'Unable to connect to Zendesk'}` 
        });
      }
      
      // Save credentials to database if connection test succeeds
      const customConfig = JSON.stringify({ 
        searchQuery: searchQuery || '',
        autoSolveMissingTickets: autoSolveMissingTickets !== false // Default to true
      });
      
      await prisma.integrationCredentials.upsert({
        where: {
          organizationId_systemType: {
            organizationId: CURRENT_ORG_ID,
            systemType: 'zendesk'
          }
        },
        update: {
          subdomain,
          email,
          apiKey,
          customConfig,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          organizationId: CURRENT_ORG_ID,
          systemType: 'zendesk',
          subdomain,
          email,
          apiKey,
          customConfig,
          isActive: true
        }
      });

      // After successful credential save, fetch custom field definitions
      try {
        const customFieldsResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/zendesk/custom-fields?subdomain=${subdomain}&email=${encodeURIComponent(email)}&apiKey=${encodeURIComponent(apiKey)}`);
        
        if (customFieldsResponse.ok) {
          const customFieldsData = await customFieldsResponse.json();
          
          // Return success with custom fields data for auto-populating display names
          return res.status(200).json({ 
            success: true,
            customFields: customFieldsData.customFields || []
          });
        } else {
          console.warn('Failed to fetch custom fields, but credentials saved successfully');
        }
      } catch (customFieldsError) {
        console.warn('Error fetching custom fields:', customFieldsError);
        // Don't fail the whole operation if custom fields fetch fails
      }
      
      return res.status(200).json({ success: true });
      
    } catch (err) {
      console.error('Error testing Zendesk connection:', err);
      return res.status(500).json({ error: 'Failed to test connection to Zendesk' });
    }
  }
  
  if (req.method === 'GET') {
    try {
      // Retrieve credentials from database
      const credentials = await prisma.integrationCredentials.findUnique({
        where: {
          organizationId_systemType: {
            organizationId: CURRENT_ORG_ID,
            systemType: 'zendesk'
          }
        }
      });
      
      if (!credentials || !credentials.isActive) {
        return res.status(401).json({ error: 'No credentials set' });
      }
      
      const { subdomain, email, apiKey, customConfig } = credentials;
      const config = customConfig ? JSON.parse(customConfig) : {};
      const searchQuery = config.searchQuery || '';
      
      const auth = Buffer.from(`${email}/token:${apiKey}`).toString('base64');
      
      let url;
      if (searchQuery && searchQuery.trim()) {
        // Use search API with custom query
        const encodedQuery = encodeURIComponent(searchQuery.trim());
        url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=${encodedQuery}`;
      } else {
        // Default to all tickets
        url = `https://${subdomain}.zendesk.com/api/v2/tickets.json`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Zendesk API Error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: `Zendesk API error: ${response.status} ${response.statusText}` 
        });
      }
      
      const data = await response.json();
      return res.status(200).json(data);
      
    } catch (err) {
      console.error('Error fetching from Zendesk:', err);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
