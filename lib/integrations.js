// API service for FlowLink integrations
const axios = require('axios');

class IntegrationService {
  constructor(integration) {
    this.integration = integration;
    this.config = typeof integration.config === 'string' 
      ? JSON.parse(integration.config) 
      : integration.config;
  }

  // Factory method to create service based on system type
  static create(integration) {
    switch (integration.systemType) {
      case 'zendesk':
        return new ZendeskService(integration);
      case 'jira':
        return new JiraService(integration);
      case 'slack':
        return new SlackService(integration);
      case 'github':
        return new GitHubService(integration);
      case 'salesforce':
        return new SalesforceService(integration);
      case 'teams':
        return new TeamsService(integration);
      default:
        throw new Error(`Unsupported integration type: ${integration.systemType}`);
    }
  }

  // Abstract methods to be implemented by each service
  async fetchRecords(lastSyncAt = null) {
    throw new Error('fetchRecords must be implemented by subclass');
  }

  transformRecord(record) {
    throw new Error('transformRecord must be implemented by subclass');
  }
}

class ZendeskService extends IntegrationService {
  async fetchRecords(lastSyncAt = null) {
    const { subdomain, apiKey, email } = this.config;
    const baseUrl = `https://${subdomain}.zendesk.com/api/v2`;
    
    let url = `${baseUrl}/tickets.json?include=users`;
    if (lastSyncAt) {
      url += `&start_time=${Math.floor(new Date(lastSyncAt).getTime() / 1000)}`;
    }

    const response = await axios.get(url, {
      auth: {
        username: `${email}/token`,
        password: apiKey
      }
    });

    return response.data.tickets.map(ticket => this.transformRecord(ticket));
  }

  transformRecord(ticket) {
    return {
      sourceId: ticket.id.toString(),
      recordType: 'ticket',
      title: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assigneeEmail: ticket.assignee_id ? 'assignee@example.com' : null, // Would need user lookup
      reporterEmail: ticket.requester_id ? 'requester@example.com' : null, // Would need user lookup
      labels: JSON.stringify(ticket.tags || []), // Convert array to JSON string
      customFields: JSON.stringify({
        external_id: ticket.external_id,
        via: ticket.via,
        satisfaction_rating: ticket.satisfaction_rating
      }),
      sourceUrl: ticket.url,
      sourceCreatedAt: new Date(ticket.created_at),
      sourceUpdatedAt: new Date(ticket.updated_at)
    };
  }
}

class JiraService extends IntegrationService {
  async fetchRecords(lastSyncAt = null) {
    const { baseUrl, apiToken, email } = this.config;
    
    let jql = 'ORDER BY updated DESC';
    if (lastSyncAt) {
      const formattedDate = new Date(lastSyncAt).toISOString().split('T')[0];
      jql = `updated >= '${formattedDate}' ${jql}`;
    }

    const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
      params: {
        jql,
        fields: 'summary,description,status,priority,assignee,reporter,labels,created,updated'
      },
      auth: {
        username: email,
        password: apiToken
      }
    });

    return response.data.issues.map(issue => this.transformRecord(issue));
  }

  transformRecord(issue) {
    return {
      sourceId: issue.key,
      recordType: 'issue',
      title: issue.fields.summary,
      description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name,
      assigneeEmail: issue.fields.assignee?.emailAddress,
      assigneeName: issue.fields.assignee?.displayName,
      reporterEmail: issue.fields.reporter?.emailAddress,
      reporterName: issue.fields.reporter?.displayName,
      labels: JSON.stringify(issue.fields.labels || []), // Convert array to JSON string
      customFields: JSON.stringify({
        issueType: issue.fields.issuetype?.name,
        project: issue.fields.project?.key
      }),
      sourceUrl: `${this.config.baseUrl}/browse/${issue.key}`,
      sourceCreatedAt: new Date(issue.fields.created),
      sourceUpdatedAt: new Date(issue.fields.updated)
    };
  }
}

class SlackService extends IntegrationService {
  async fetchRecords(lastSyncAt = null) {
    // Slack typically works with conversations/messages
    // This is a simplified example
    const { botToken } = this.config;
    
    const response = await axios.get('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${botToken}`
      }
    });

    // You'd typically fetch messages from channels
    return []; // Simplified for now
  }

  transformRecord(message) {
    return {
      sourceId: message.ts,
      recordType: 'message',
      title: `Message in #${message.channel}`,
      description: message.text,
      status: 'sent',
      reporterEmail: message.user_email,
      reporterName: message.user_name,
      customFields: {
        channel: message.channel,
        thread_ts: message.thread_ts
      },
      sourceCreatedAt: new Date(parseFloat(message.ts) * 1000),
      sourceUpdatedAt: new Date(parseFloat(message.ts) * 1000)
    };
  }
}

class GitHubService extends IntegrationService {
  async fetchRecords(lastSyncAt = null) {
    const { token, owner, repo } = this.config;
    
    let url = `https://api.github.com/repos/${owner}/${repo}/issues`;
    if (lastSyncAt) {
      url += `?since=${new Date(lastSyncAt).toISOString()}`;
    }

    const response = await axios.get(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return response.data.map(issue => this.transformRecord(issue));
  }

  transformRecord(issue) {
    return {
      sourceId: issue.number.toString(),
      recordType: issue.pull_request ? 'pull_request' : 'issue',
      title: issue.title,
      description: issue.body,
      status: issue.state,
      assigneeEmail: issue.assignee?.email,
      assigneeName: issue.assignee?.login,
      reporterEmail: issue.user?.email,
      reporterName: issue.user?.login,
      labels: JSON.stringify(issue.labels?.map(label => label.name) || []), // Convert array to JSON string
      customFields: JSON.stringify({
        milestone: issue.milestone?.title,
        pull_request: !!issue.pull_request
      }),
      sourceUrl: issue.html_url,
      sourceCreatedAt: new Date(issue.created_at),
      sourceUpdatedAt: new Date(issue.updated_at)
    };
  }
}

class SalesforceService extends IntegrationService {
  async fetchRecords(lastSyncAt = null) {
    // Salesforce implementation would use their REST API
    // This is a placeholder structure
    return [];
  }

  transformRecord(record) {
    return {
      sourceId: record.Id,
      recordType: 'case',
      title: record.Subject,
      description: record.Description,
      status: record.Status,
      priority: record.Priority,
      customFields: record,
      sourceCreatedAt: new Date(record.CreatedDate),
      sourceUpdatedAt: new Date(record.LastModifiedDate)
    };
  }
}

class TeamsService extends IntegrationService {
  async fetchRecords(lastSyncAt = null) {
    // Microsoft Teams implementation
    // This would use Microsoft Graph API
    return [];
  }

  transformRecord(message) {
    return {
      sourceId: message.id,
      recordType: 'message',
      title: `Teams message`,
      description: message.body?.content,
      status: 'sent',
      reporterEmail: message.from?.user?.mail,
      reporterName: message.from?.user?.displayName,
      sourceCreatedAt: new Date(message.createdDateTime),
      sourceUpdatedAt: new Date(message.lastModifiedDateTime)
    };
  }
}

module.exports = {
  IntegrationService,
  ZendeskService,
  JiraService,
  SlackService,
  GitHubService,
  SalesforceService,
  TeamsService
};
