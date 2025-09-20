import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Hook for managing record links
export function useRecordLinks(organizationId, recordId = null) {
  const url = recordId 
    ? `/api/links?organizationId=${organizationId}&recordId=${recordId}`
    : `/api/links?organizationId=${organizationId}`;
    
  const { data, error, mutate } = useSWR(
    organizationId ? url : null,
    fetcher
  );

  const createLink = async (linkData) => {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId,
        ...linkData
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const newLink = await response.json();
    await mutate(); // Refresh the data
    return newLink;
  };

  const deleteLink = async (linkId) => {
    const response = await fetch(`/api/links?linkId=${linkId}&organizationId=${organizationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    await mutate(); // Refresh the data
  };

  return {
    links: data || [],
    isLoading: !error && !data,
    error,
    createLink,
    deleteLink,
    mutate
  };
}

// Hook for managing field mappings
export function useFieldMappings(organizationId) {
  const { data, error, mutate } = useSWR(
    organizationId ? `/api/field-mappings?organizationId=${organizationId}` : null,
    fetcher
  );

  const createMapping = async (mappingData) => {
    const response = await fetch('/api/field-mappings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId,
        ...mappingData
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const newMapping = await response.json();
    await mutate(); // Refresh the data
    return newMapping;
  };

  const updateMapping = async (mappingId, updateData) => {
    const response = await fetch('/api/field-mappings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mappingId,
        organizationId,
        ...updateData
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const updatedMapping = await response.json();
    await mutate(); // Refresh the data
    return updatedMapping;
  };

  const deleteMapping = async (mappingId) => {
    const response = await fetch(`/api/field-mappings?mappingId=${mappingId}&organizationId=${organizationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    await mutate(); // Refresh the data
  };

  return {
    mappings: data || [],
    isLoading: !error && !data,
    error,
    createMapping,
    updateMapping,
    deleteMapping,
    mutate
  };
}
