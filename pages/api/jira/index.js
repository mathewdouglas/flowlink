// API route for Jira integration management
import prisma from '../../../lib/prisma';
import { extractSubdomainFromUrl, createJiraAuthHeaders } from '../../../lib/jira-utils';

// Hardcoded for demo - in production, get from auth context
const CURRENT_ORG_ID = 'cmfroy6570000pldk0c00apwg';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { url, subdomain, username, apiToken, projectKey, components, excludeClosedIssues, isActive } = req.body;

      // Validate required fields
      if (!url || !username || !apiToken) {
        return res.status(400).json({ error: 'URL, username, and API token are required' });
      }

      // Ensure we have the subdomain for storage (extract from URL if not provided)
      let finalSubdomain = subdomain;
      if (!finalSubdomain && url) {
        finalSubdomain = extractSubdomainFromUrl(url);
      }

      // Test the connection
      try {
        const headers = createJiraAuthHeaders(username, apiToken);
        const testUrl = projectKey
          ? `${url}/rest/api/3/project/${projectKey}`
          : `${url}/rest/api/3/myself`;

        const testResponse = await fetch(testUrl, {
          headers,
          timeout: 5000
        });

        if (!testResponse.ok) {
          return res.status(400).json({
            error: `Connection failed: ${testResponse.status === 401 ? 'Invalid credentials' : 'Unable to connect to Jira'}`
          });
        }
      } catch (error) {
        return res.status(400).json({
          error: 'Connection test failed: ' + error.message
        });
      }

      // Save or update credentials
      const customConfig = JSON.stringify({
        projectKey: projectKey || null,
        components: components || null,
        excludeClosedIssues: excludeClosedIssues !== false,
        subdomain: finalSubdomain,
        url: url // Store the full URL in customConfig
      });

      const credentials = await prisma.integrationCredentials.upsert({
        where: {
          organizationId_systemType: {
            organizationId: CURRENT_ORG_ID,
            systemType: 'jira'
          }
        },
        update: {
          subdomain: finalSubdomain,
          email: username, // Store username in email field for Jira
          apiKey: apiToken,
          customConfig,
          isActive: isActive !== false
        },
        create: {
          organizationId: CURRENT_ORG_ID,
          systemType: 'jira',
          subdomain: finalSubdomain,
          email: username, // Store username in email field for Jira
          apiKey: apiToken,
          customConfig,
          isActive: isActive !== false
        }
      });

      // Get or create integration record
      let integration = await prisma.integration.findFirst({
        where: {
          organizationId: CURRENT_ORG_ID,
          systemType: 'jira'
        }
      });

      if (!integration) {
        integration = await prisma.integration.create({
          data: {
            organizationId: CURRENT_ORG_ID,
            systemType: 'jira',
            systemName: 'Jira',
            config: customConfig,
            isActive: isActive !== false
          }
        });
      } else {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            config: customConfig,
            isActive: isActive !== false
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Jira credentials saved successfully',
        integration: {
          id: integration.id,
          isActive: integration.isActive
        }
      });

    } catch (error) {
      console.error('Error saving Jira credentials:', error);
      res.status(500).json({ error: 'Failed to save Jira credentials: ' + error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}