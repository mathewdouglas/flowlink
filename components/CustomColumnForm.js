import { useState } from 'react';
import { Plus, Save, AlertCircle, X } from 'lucide-react';

const CustomColumnForm = ({ onSave, onCancel, existingColumn = null }) => {
  const [formData, setFormData] = useState({
    name: existingColumn?.name || '',
    label: existingColumn?.label || '',
    type: existingColumn?.type || 'text',
    defaultValue: existingColumn?.defaultValue || '',
    selectOptions: existingColumn?.selectOptions ? JSON.parse(existingColumn.selectOptions) : [''],
    isRequired: existingColumn?.isRequired || false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const columnTypes = [
    { value: 'text', label: 'Text', description: 'Single line text input' },
    { value: 'number', label: 'Number', description: 'Numeric values' },
    { value: 'date', label: 'Date', description: 'Date picker' },
    { value: 'boolean', label: 'Boolean', description: 'True/False checkbox' },
    { value: 'select', label: 'Select', description: 'Dropdown with predefined options' },
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Name must start with a letter and contain only letters, numbers, and underscores';
    }
    
    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }
    
    if (formData.type === 'select') {
      const validOptions = formData.selectOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        newErrors.selectOptions = 'At least 2 options are required for select type';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const submitData = {
        ...formData,
        selectOptions: formData.type === 'select' 
          ? formData.selectOptions.filter(opt => opt.trim())
          : null,
      };
      
      await onSave(submitData);
      onCancel(); // Go back to column selection
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save column' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOptionChange = (index, value) => {
    const newOptions = [...formData.selectOptions];
    newOptions[index] = value;
    setFormData({ ...formData, selectOptions: newOptions });
  };

  const addSelectOption = () => {
    setFormData({
      ...formData,
      selectOptions: [...formData.selectOptions, '']
    });
  };

  const removeSelectOption = (index) => {
    if (formData.selectOptions.length > 1) {
      const newOptions = formData.selectOptions.filter((_, i) => i !== index);
      setFormData({ ...formData, selectOptions: newOptions });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name field */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Column Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., priority_level"
          disabled={existingColumn} // Don't allow editing name of existing columns
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle size={16} className="mr-1" />
            {errors.name}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-600">
          Internal identifier used in the system. Cannot be changed after creation.
        </p>
      </div>

      {/* Label field */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Display Label *
        </label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.label ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Priority Level"
        />
        {errors.label && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle size={16} className="mr-1" />
            {errors.label}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-600">
          The label shown in the table header.
        </p>
      </div>

      {/* Type field */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Column Type *
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {columnTypes.map((type) => (
            <option key={type.value} value={type.value} className="text-gray-900">
              {type.label} - {type.description}
            </option>
          ))}
        </select>
      </div>

      {/* Select options (only for select type) */}
      {formData.type === 'select' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Select Options *
          </label>
          <div className="space-y-2">
            {formData.selectOptions.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleSelectOptionChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Option ${index + 1}`}
                />
                {formData.selectOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSelectOption(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSelectOption}
            className="mt-2 flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <Plus size={16} className="mr-1" />
            Add Option
          </button>
          {errors.selectOptions && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle size={16} className="mr-1" />
              {errors.selectOptions}
            </p>
          )}
        </div>
      )}

      {/* Default value */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Default Value
        </label>
        {formData.type === 'boolean' ? (
          <select
            value={formData.defaultValue}
            onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" className="text-gray-900">No default</option>
            <option value="true" className="text-gray-900">True</option>
            <option value="false" className="text-gray-900">False</option>
          </select>
        ) : formData.type === 'select' ? (
          <select
            value={formData.defaultValue}
            onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" className="text-gray-900">No default</option>
            {formData.selectOptions.filter(opt => opt.trim()).map((option) => (
              <option key={option} value={option} className="text-gray-900">
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={formData.type === 'number' ? 'number' : formData.type === 'date' ? 'date' : 'text'}
            value={formData.defaultValue}
            onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional default value"
          />
        )}
      </div>

      {/* Required checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isRequired"
          checked={formData.isRequired}
          onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isRequired" className="ml-2 block text-sm text-gray-900 font-medium">
          Required field
        </label>
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {errors.submit}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Column Selection
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span className="text-white">Saving...</span>
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              <span className="text-white">{existingColumn ? 'Update' : 'Create'} Column</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CustomColumnForm;