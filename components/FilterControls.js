import React from 'react';
import { Search } from 'lucide-react';

const FilterControls = ({
  // Search functionality
  searchTerm,
  setSearchTerm,
  
  // System filter
  filterSystem,
  setFilterSystem,
  
  // Status filter
  filterStatusColumn,
  setFilterStatusColumn,
  filterStatusValue,
  setFilterStatusValue,
  
  // Available options
  getAvailableStatusColumns,
  getAvailableStatusValues
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search across all linked records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="flex gap-4">
          {/* System Filter */}
          <div className="relative">
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white"
            >
              <option value="all">All Records</option>
              <option value="linked">Linked Records</option>
              <option value="unlinked">Unlinked Records</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              ▼
            </span>
          </div>

          {/* Status Column Filter */}
          <div className="relative">
            <select
              value={filterStatusColumn}
              onChange={(e) => {
                setFilterStatusColumn(e.target.value);
                setFilterStatusValue('all'); // Reset status value when column changes
              }}
              className="appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white"
            >
              {getAvailableStatusColumns().map(column => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              ▼
            </span>
          </div>

          {/* Status Value Filter */}
          <div className="relative">
            <select
              value={filterStatusValue}
              onChange={(e) => setFilterStatusValue(e.target.value)}
              disabled={filterStatusColumn === 'all'}
              className="appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white disabled:bg-gray-100 disabled:text-gray-500"
            >
              {getAvailableStatusValues().map(status => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              ▼
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;