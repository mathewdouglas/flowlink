import useSWR, { mutate as globalMutate } from 'swr';
import axios from 'axios';
import { useCallback } from 'react';

const fetcher = (url) => axios.get(url).then(res => res.data);

export function useAllFlowRecords(organizationId, system = 'all') {
  const { data, error, mutate } = useSWR(
    organizationId ? `/api/records?organizationId=${organizationId}&system=${system}&all=true` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 1 minute
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

  const saveConfig = useCallback(async (config) => {
    try {
      // Make the API call first
      await axios.post('/api/dashboard/config', {
        userId,
        organizationId,
        ...config
      });
      // Only update cache after successful save
      mutate();
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      throw error;
    }
  }, [userId, organizationId, mutate]);

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
