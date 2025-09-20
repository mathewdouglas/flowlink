import { useState, useCallback } from 'react';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

export function useSyncService(organizationId) {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sync status
  const { data: syncStatus, error, mutate } = useSWR(
    organizationId ? `/api/zendesk/sync-status?organizationId=${organizationId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  );

  // Start sync service
  const startService = useCallback(async () => {
    if (!organizationId) return { success: false, error: 'Organization ID required' };
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/zendesk/sync-config?organizationId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      if (response.ok) {
        await mutate(); // Refresh status
        return { success: true };
      } else {
        throw new Error('Failed to start sync service');
      }
    } catch (error) {
      console.error('Error starting sync service:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutate, organizationId]);

  // Stop sync service
  const stopService = useCallback(async () => {
    if (!organizationId) return { success: false, error: 'Organization ID required' };
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/zendesk/sync-config?organizationId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      if (response.ok) {
        await mutate(); // Refresh status
        return { success: true };
      } else {
        throw new Error('Failed to stop sync service');
      }
    } catch (error) {
      console.error('Error stopping sync service:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutate, organizationId]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!organizationId) return { success: false, error: 'Organization ID required' };
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/zendesk/sync-config?organizationId=${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger' })
      });
      
      if (response.ok) {
        await mutate(); // Refresh status
        return { success: true };
      } else {
        throw new Error('Failed to trigger sync');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutate, organizationId]);

  return {
    syncStatus: syncStatus?.data || null,
    isLoading: isLoading || (!error && !syncStatus),
    isError: error,
    startService,
    stopService,
    triggerSync,
    refreshStatus: mutate
  };
}
