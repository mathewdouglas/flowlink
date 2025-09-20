import React from 'react';
import { useErrors } from '../../context/AppContext';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContainer = () => {
  const { errors, removeError } = useErrors();

  if (!errors || errors.length === 0) {
    return null;
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColorClasses = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error) => (
        <div
          key={error.id}
          className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg max-w-md ${getColorClasses(error.type)}`}
        >
          {getIcon(error.type)}
          <div className="flex-1">
            <p className="text-sm font-medium">{error.message}</p>
          </div>
          <button
            onClick={() => removeError(error.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
