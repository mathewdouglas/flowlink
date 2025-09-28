import { useState, useCallback } from 'react';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

export function useSyncService(organizationId) {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch combined sync status for both Zendesk and Jira
  const { data: syncStatus, error, mutate } = useSWR(
    organizationId ? `/api/admin/services?organizationId=${organizationId}` : null,
    fetcher,
    {
      refreshInterval: 120000, // Refresh every 2 minutes (reduced from 30s)
      revalidateOnFocus: false, // Don't refresh on focus to prevent excessive calls
      revalidateOnReconnect: false // Don't refresh on reconnect
    }
  );

  // Start both sync services (Zendesk and Jira)
  const startService = useCallback(async () => {
    if (!organizationId) return { success: false, error: 'Organization ID required' };
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      if (response.ok) {
        await mutate(); // Refresh status
        return { success: true };
      } else {
        throw new Error('Failed to start sync services');
      }
    } catch (error) {
      console.error('Error starting sync services:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutate, organizationId]);

  // Stop both sync services (Zendesk and Jira)
  const stopService = useCallback(async () => {
    if (!organizationId) return { success: false, error: 'Organization ID required' };
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      if (response.ok) {
        await mutate(); // Refresh status
        return { success: true };
      } else {
        throw new Error('Failed to stop sync services');
      }
    } catch (error) {
      console.error('Error stopping sync services:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutate, organizationId]);

  // Trigger manual sync for both systems (Zendesk and Jira)
  const triggerSync = useCallback(async () => {
    if (!organizationId) return { success: false, error: 'Organization ID required' };
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'trigger',
          organizationId: organizationId 
        })
      });
      
      if (response.ok) {
        await mutate(); // Refresh status
        return { success: true };
      } else {
        throw new Error('Failed to trigger manual sync');
      }
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutate, organizationId]);

  return {
    syncStatus: syncStatus ? {
      ...syncStatus.data,
      isRunning: syncStatus.isRunning,
      message: syncStatus.message
    } : null,
    isLoading: isLoading || (!error && !syncStatus),
    isError: error,
    startService,
    stopService,
    triggerSync,
    refreshStatus: mutate
  };
}
