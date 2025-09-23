import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { ChevronUp, ChevronDown } from 'lucide-react';

const AnalyticsCharts = ({ 
  processedRecords, 
  currentColumnMetadata, 
  visibleColumns,
  getRecordFieldValue,
  graphsExpanded,
  setGraphsExpanded
}) => {
  // Chart column selection state
  const [statusChartColumn, setStatusChartColumn] = useState('zendesk.status');
  const [priorityChartColumn, setPriorityChartColumn] = useState('zendesk.priority');
  const [timeChartColumn, setTimeChartColumn] = useState('zendesk.created_at');
  const [assigneeChartColumn, setAssigneeChartColumn] = useState('zendesk.assignee');

  // Auto-update chart columns when visible columns change
  useEffect(() => {
    if (visibleColumns.length > 0) {
      if (!visibleColumns.includes(statusChartColumn)) {
        setStatusChartColumn(visibleColumns[0]);
      }
      if (!visibleColumns.includes(priorityChartColumn)) {
        setPriorityChartColumn(visibleColumns[0]);
      }
      if (!visibleColumns.includes(timeChartColumn)) {
        setTimeChartColumn(visibleColumns[0]);
      }
      if (!visibleColumns.includes(assigneeChartColumn)) {
        setAssigneeChartColumn(visibleColumns[0]);
      }
    }
  }, [visibleColumns, statusChartColumn, priorityChartColumn, timeChartColumn, assigneeChartColumn]);

  // Analytics data calculation
  const analyticsData = useMemo(() => {
    if (!processedRecords.length) return null;

    // Status distribution (using selected column)
    const statusCounts = {};
    processedRecords.forEach(record => {
      const status = getRecordFieldValue(record, statusChartColumn) || 'Unknown';
      const statusStr = String(status);
      statusCounts[statusStr] = (statusCounts[statusStr] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      percentage: Math.round((count / processedRecords.length) * 100)
    }));

    // Priority distribution (using selected column)
    const priorityCounts = {};
    processedRecords.forEach(record => {
      const priority = getRecordFieldValue(record, priorityChartColumn) || 'Unknown';
      const priorityStr = String(priority);
      priorityCounts[priorityStr] = (priorityCounts[priorityStr] || 0) + 1;
    });
    const priorityData = Object.entries(priorityCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([priority, count]) => ({
        priority,
        count,
        percentage: Math.round((count / processedRecords.length) * 100)
      }));

    // Tickets created over time (last 30 days) - using selected column
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyCounts = {};
    processedRecords.forEach(record => {
      const dateValue = getRecordFieldValue(record, timeChartColumn);
      if (dateValue) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime()) && date >= thirtyDaysAgo) {
          const dateKey = date.toISOString().split('T')[0];
          dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        }
      }
    });
    
    const timeData = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(),
        tickets: count
      }));

    // Top assignees - using selected column
    const assigneeCounts = {};
    processedRecords.forEach(record => {
      const assignee = getRecordFieldValue(record, assigneeChartColumn) || 'Unassigned';
      const assigneeStr = String(assignee);
      assigneeCounts[assigneeStr] = (assigneeCounts[assigneeStr] || 0) + 1;
    });
    
    const assigneeData = Object.entries(assigneeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([assignee, count]) => ({
        assignee: assignee.length > 20 ? assignee.substring(0, 20) + '...' : assignee,
        tickets: count
      }));

    return {
      statusData,
      priorityData,
      timeData,
      assigneeData,
      totalTickets: processedRecords.length
    };
  }, [processedRecords, statusChartColumn, priorityChartColumn, timeChartColumn, assigneeChartColumn, getRecordFieldValue]);

  if (!analyticsData || analyticsData.totalTickets === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Ticket Analytics</h3>
        <button
          onClick={() => setGraphsExpanded(!graphsExpanded)}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        >
          {graphsExpanded ? (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Expand</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
      
      {graphsExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Status Distribution Pie Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">
                {currentColumnMetadata[statusChartColumn]?.label || 'Status'} Distribution
              </h4>
              <div className="relative">
                <select
                  value={statusChartColumn}
                  onChange={(e) => setStatusChartColumn(e.target.value)}
                  className="appearance-none text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white"
                >
                  {Object.keys(currentColumnMetadata)
                    .filter(columnKey => visibleColumns.includes(columnKey))
                    .map(columnKey => (
                    <option key={columnKey} value={columnKey}>
                      {currentColumnMetadata[columnKey].label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  ▼
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analyticsData.statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {analyticsData.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} tickets (${((value / analyticsData.totalTickets) * 100).toFixed(1)}%)`,
                    name
                  ]}
                  labelStyle={{ color: '#374151', fontWeight: 'medium' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution Bar Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">
                {currentColumnMetadata[priorityChartColumn]?.label || 'Priority'} Distribution
              </h4>
              <div className="relative">
                <select
                  value={priorityChartColumn}
                  onChange={(e) => setPriorityChartColumn(e.target.value)}
                  className="appearance-none text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white"
                >
                  {Object.keys(currentColumnMetadata)
                    .filter(columnKey => visibleColumns.includes(columnKey))
                    .map(columnKey => (
                    <option key={columnKey} value={columnKey}>
                      {currentColumnMetadata[columnKey].label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  ▼
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} tickets (${((value / analyticsData.totalTickets) * 100).toFixed(1)}%)`,
                    'Count'
                  ]}
                  labelStyle={{ color: '#374151', fontWeight: 'medium' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tickets Created Over Time */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">
                {currentColumnMetadata[timeChartColumn]?.label || 'Time'} Analysis (Last 30 Days)
              </h4>
              <div className="relative">
                <select
                  value={timeChartColumn}
                  onChange={(e) => setTimeChartColumn(e.target.value)}
                  className="appearance-none text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white"
                >
                  {Object.keys(currentColumnMetadata)
                    .filter(columnKey => visibleColumns.includes(columnKey))
                    .map(columnKey => (
                    <option key={columnKey} value={columnKey}>
                      {currentColumnMetadata[columnKey].label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  ▼
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analyticsData.timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} tickets`,
                    'Count'
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                  labelStyle={{ color: '#374151', fontWeight: 'medium' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line type="monotone" dataKey="tickets" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Assignees */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">
                Top {currentColumnMetadata[assigneeChartColumn]?.label || 'Assignees'}
              </h4>
              <div className="relative">
                <select
                  value={assigneeChartColumn}
                  onChange={(e) => setAssigneeChartColumn(e.target.value)}
                  className="appearance-none text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-8 bg-white"
                >
                  {Object.keys(currentColumnMetadata)
                    .filter(columnKey => visibleColumns.includes(columnKey))
                    .map(columnKey => (
                    <option key={columnKey} value={columnKey}>
                      {currentColumnMetadata[columnKey].label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  ▼
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.assigneeData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="assignee" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} tickets (${((value / analyticsData.totalTickets) * 100).toFixed(1)}%)`,
                    'Count'
                  ]}
                  labelStyle={{ color: '#374151', fontWeight: 'medium' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="tickets" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCharts;