import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useLinkedRecords(organizationId) {
  const { data, error, mutate } = useSWR(
    organizationId ? `/api/linked-records?organizationId=${organizationId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  );

  return {
    linkedRecords: data?.linkedRecords || [],
    stats: data?.stats || null,
    message: data?.message || null,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}