import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export const useCustomColumns = (organizationId) => {
  const { data, error, mutate } = useSWR('/api/custom-columns', fetcher);
  const [isLoading, setIsLoading] = useState(false);

  const customColumns = data?.customColumns || [];

  const createColumn = async (columnData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/custom-columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(columnData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create column');
      }

      const result = await response.json();
      await mutate(); // Refresh the data
      return result.customColumn;
    } catch (error) {
      console.error('Error creating custom column:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateColumn = async (columnId, columnData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/custom-columns/${columnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(columnData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update column');
      }

      const result = await response.json();
      await mutate(); // Refresh the data
      return result.customColumn;
    } catch (error) {
      console.error('Error updating custom column:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteColumn = async (columnId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/custom-columns/${columnId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete column');
      }

      await mutate(); // Refresh the data
    } catch (error) {
      console.error('Error deleting custom column:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRecordCustomFields = async (recordId, customFieldValues) => {
    try {
      const response = await fetch(`/api/records/${recordId}/custom-fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customFieldValues }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update custom fields');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating record custom fields:', error);
      throw error;
    }
  };

  return {
    customColumns,
    isLoading: isLoading || (!error && !data),
    error,
    createColumn,
    updateColumn,
    deleteColumn,
    updateRecordCustomFields,
    refresh: mutate,
  };
};