import { useState, useCallback } from 'react';

export function useErrorHandler() {
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addError = useCallback((error) => {
    console.error('Error:', error);
    const errorObj = {
      id: Date.now(),
      message: error.message || 'An error occurred',
      type: 'error',
      timestamp: new Date().toISOString(),
    };
    setErrors(prev => [...prev, errorObj]);
  }, []);

  const removeError = useCallback((id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleAsync = useCallback(async (asyncFn) => {
    try {
      setIsLoading(true);
      const result = await asyncFn();
      return result;
    } catch (error) {
      addError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addError]);

  return {
    errors,
    isLoading,
    addError,
    removeError,
    clearErrors,
    handleAsync,
  };
}

// Simple Error Boundary component
export function ErrorBoundary({ children, fallback }) {
  return children; // Simplified for now
}
