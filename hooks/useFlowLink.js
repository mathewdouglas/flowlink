import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url) => axios.get(url).then(res => res.data);

export function useFlowRecords(organizationId, system = 'all', page = 1) {
  const { data, error, mutate } = useSWR(
    organizationId ? `/api/records?organizationId=${organizationId}&system=${system}&page=${page}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false
    }
  );

  return {
    records: data?.records || [],
    pagination: data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useDashboardConfig(userId, organizationId) {
  const { data, error, mutate } = useSWR(
    userId && organizationId ? `/api/dashboard/config?userId=${userId}&organizationId=${organizationId}` : null,
    fetcher
  );

  const saveConfig = async (config) => {
    try {
      await axios.post('/api/dashboard/config', {
        userId,
        organizationId,
        ...config
      });
      mutate(); // Revalidate the data
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      throw error;
    }
  };

  return {
    config: data,
    isLoading: !error && !data,
    isError: error,
    saveConfig,
    mutate
  };
}

export function useIntegrations(organizationId) {
  const { data, error, mutate } = useSWR(
    organizationId ? `/api/integrations?organizationId=${organizationId}` : null,
    fetcher
  );

  const syncIntegration = async (integrationId) => {
    try {
      const response = await axios.post(`/api/integrations/${integrationId}/sync`);
      mutate(); // Refresh integrations data
      return response.data;
    } catch (error) {
      console.error('Error syncing integration:', error);
      throw error;
    }
  };

  return {
    integrations: data || [],
    isLoading: !error && !data,
    isError: error,
    syncIntegration,
    mutate
  };
}
