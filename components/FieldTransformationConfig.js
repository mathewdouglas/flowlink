import React, { useState } from 'react';
import { Settings, TestTube, Check, X, AlertCircle } from 'lucide-react';
import { getTransformationPresets, testTransformation } from '../lib/field-transformations';

const FieldTransformationConfig = ({ 
  value, 
  onChange, 
  fieldType = "source", // "source" or "target"
  label 
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  const presets = getTransformationPresets();
  const { transformationType, config } = value || {};
  
  const handleTransformationTypeChange = (type) => {
    const preset = presets[type];
    onChange({
      transformationType: type,
      config: preset?.config || null
    });
  };

  const handleConfigChange = (newConfig) => {
    onChange({
      transformationType,
      config: newConfig
    });
  };

  const runTest = () => {
    if (!testValue || !transformationType) {
      setTestResult({ success: false, error: 'Please enter a test value and select transformation type' });
      return;
    }
    
    const result = testTransformation(testValue, transformationType, config);
    setTestResult(result);
  };

  const renderConfigFields = () => {
    if (!transformationType || transformationType === 'extract_jira_key') return null;

    switch (transformationType) {
      case 'regex_extract':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regular Expression Pattern
              </label>
              <input
                type="text"
                value={config?.pattern || ''}
                onChange={(e) => handleConfigChange({ ...config, pattern: e.target.value })}
                placeholder="e.g., /browse/([A-Z]+-\d+)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capture Group (default: 1)
              </label>
              <input
                type="number"
                value={config?.group || 1}
                onChange={(e) => handleConfigChange({ ...config, group: parseInt(e.target.value) })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        );

      case 'substring':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Position
              </label>
              <input
                type="number"
                value={config?.start || 0}
                onChange={(e) => handleConfigChange({ ...config, start: parseInt(e.target.value) })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Length (optional)
              </label>
              <input
                type="number"
                value={config?.length || ''}
                onChange={(e) => handleConfigChange({ ...config, length: e.target.value ? parseInt(e.target.value) : null })}
                min="1"
                placeholder="Leave empty for rest of string"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        );

      case 'split_extract':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Separator
              </label>
              <input
                type="text"
                value={config?.separator || ''}
                onChange={(e) => handleConfigChange({ ...config, separator: e.target.value })}
                placeholder="e.g., /, -, |"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Part Index (0-based)
              </label>
              <input
                type="number"
                value={config?.index || 0}
                onChange={(e) => handleConfigChange({ ...config, index: parseInt(e.target.value) })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        );

      case 'url_path_extract':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Path Index (-1 for last)
              </label>
              <input
                type="number"
                value={config?.pathIndex || -1}
                onChange={(e) => handleConfigChange({ ...config, pathIndex: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fromEnd"
                checked={config?.fromEnd || false}
                onChange={(e) => handleConfigChange({ ...config, fromEnd: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="fromEnd" className="text-sm text-gray-700">
                Count from end of path
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label} Field Transformation
        </label>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className={`p-1 rounded ${showConfig ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'} hover:opacity-80`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showConfig && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transformation Type
            </label>
            <select
              value={transformationType || ''}
              onChange={(e) => handleTransformationTypeChange(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">No transformation</option>
              {Object.entries(presets).map(([type, preset]) => (
                <option key={type} value={type}>
                  {preset.name}
                </option>
              ))}
            </select>
            {transformationType && presets[transformationType] && (
              <p className="mt-1 text-xs text-gray-600">
                {presets[transformationType].description}
              </p>
            )}
          </div>

          {renderConfigFields()}

          {/* Test Section */}
          {transformationType && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Transformation
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="Enter a test value..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={runTest}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <TestTube className="w-4 h-4" />
                  Test
                </button>
              </div>
              
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {testResult.success ? 'Success' : 'Error'}
                    </span>
                  </div>
                  {testResult.success ? (
                    <div>
                      <div><strong>Input:</strong> {testResult.original}</div>
                      <div><strong>Output:</strong> {testResult.result}</div>
                    </div>
                  ) : (
                    <div className="text-red-700">{testResult.error}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {transformationType && !showConfig && (
        <div className="text-xs text-gray-600 bg-purple-50 px-2 py-1 rounded">
          Using: {presets[transformationType]?.name}
        </div>
      )}
    </div>
  );
};

export default FieldTransformationConfig;