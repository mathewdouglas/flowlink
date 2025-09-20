import React, { createContext, useContext, useReducer, useState } from 'react';

// Create contexts
const AppContext = createContext();
const ErrorContext = createContext();

// Simple state management
const initialState = {
  user: null,
  organizationId: 'cmfroy6570000pldk0c00apwg', // Using the seeded organization ID
  isLoading: false,
};

// Action types
export const ACTION_TYPES = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  SET_ORGANIZATION: 'SET_ORGANIZATION',
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_USER:
      return { ...state, user: action.payload };
    case ACTION_TYPES.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTION_TYPES.SET_ORGANIZATION:
      return { ...state, organizationId: action.payload };
    default:
      return state;
  }
}

// Error management
export function useErrors() {
  const [errors, setErrors] = useState([]);

  const addError = (error) => {
    const id = Date.now();
    setErrors(prev => [...prev, { id, ...error }]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.id !== id));
    }, 5000);
  };

  const removeError = (id) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  return { errors, addError, removeError };
}

// App provider
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const errorState = useErrors();

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <ErrorContext.Provider value={errorState}>
        {children}
      </ErrorContext.Provider>
    </AppContext.Provider>
  );
}

// Custom hooks
export function useAppDispatch() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context.dispatch;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context.state;
}
