// API service functions for FlowLink

// Records Service
export const RecordsService = {
  async getRecords(organizationId, system = 'all', page = 1) {
    const response = await fetch(`/api/records?organizationId=${organizationId}&system=${system}&page=${page}`);
    if (!response.ok) {
      throw new Error('Failed to fetch records');
    }
    return response.json();
  },

  async getRecord(id) {
    const response = await fetch(`/api/records/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch record');
    }
    return response.json();
  },

  async createRecord(record) {
    const response = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      throw new Error('Failed to create record');
    }
    return response.json();
  },

  async updateRecord(id, record) {
    const response = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      throw new Error('Failed to update record');
    }
    return response.json();
  },

  async deleteRecord(id) {
    const response = await fetch(`/api/records/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete record');
    }
    return response.json();
  },
};

// Links Service
export const LinksService = {
  async getLinks(organizationId, recordId = null) {
    const url = recordId 
      ? `/api/links?organizationId=${organizationId}&recordId=${recordId}`
      : `/api/links?organizationId=${organizationId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch links');
    }
    return response.json();
  },

  async createLink(link) {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(link),
    });
    if (!response.ok) {
      throw new Error('Failed to create link');
    }
    return response.json();
  },

  async deleteLink(id) {
    const response = await fetch(`/api/links/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete link');
    }
    return response.json();
  },
};

// Field Mappings Service
export const FieldMappingsService = {
  async getFieldMappings(organizationId) {
    const response = await fetch(`/api/field-mappings?organizationId=${organizationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch field mappings');
    }
    return response.json();
  },

  async createFieldMapping(mapping) {
    const response = await fetch('/api/field-mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
    if (!response.ok) {
      throw new Error('Failed to create field mapping');
    }
    return response.json();
  },

  async updateFieldMapping(id, mapping) {
    const response = await fetch(`/api/field-mappings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
    if (!response.ok) {
      throw new Error('Failed to update field mapping');
    }
    return response.json();
  },

  async deleteFieldMapping(id) {
    const response = await fetch(`/api/field-mappings/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete field mapping');
    }
    return response.json();
  },
};

// Integrations Service
export const IntegrationsService = {
  async getIntegrations(organizationId) {
    const response = await fetch(`/api/integrations?organizationId=${organizationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch integrations');
    }
    return response.json();
  },

  async syncIntegration(integrationId) {
    const response = await fetch(`/api/integrations/${integrationId}/sync`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to sync integration');
    }
    return response.json();
  },
};
