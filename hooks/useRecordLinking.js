import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useRecordLinks(organizationId, recordId = null) {
  const url = recordId 
    ? `/api/links?organizationId=${organizationId}&recordId=${recordId}`
    : `/api/links?organizationId=${organizationId}`;
    
  const { data, error, mutate } = useSWR(
    organizationId ? url : null,
    fetcher
  );

  return {
    links: data || [],
    isLoading: !error && !data,
    error,
    createLink: async () => {},
    deleteLink: async () => {},
    mutate
  };
}

export function useFieldMappings(organizationId) {
  const { data, error, mutate } = useSWR(
    organizationId ? `/api/field-mappings?organizationId=${organizationId}` : null,
    fetcher
  );

  return {
    mappings: data || [],
    isLoading: !error && !data,
    error,
    createMapping: async (mappingData) => {
      const response = await fetch('/api/field-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          ...mappingData,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create mapping');
      }
      const newMapping = await response.json();
      mutate(); // Refresh the data
      return newMapping;
    },
    updateMapping: async (mappingId, updateData) => {
      const response = await fetch('/api/field-mappings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mappingId,
          organizationId,
          ...updateData,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update mapping');
      }
      const updatedMapping = await response.json();
      mutate(); // Refresh the data
      return updatedMapping;
    },
    deleteMapping: async (mappingId) => {
      const response = await fetch(`/api/field-mappings?mappingId=${mappingId}&organizationId=${organizationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete mapping');
      }
      mutate(); // Refresh the data
    },
    mutate
  };
}
