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
    createMapping: async () => {},
    updateMapping: async () => {},
    deleteMapping: async () => {},
    mutate
  };
}
