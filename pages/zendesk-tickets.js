"use client"

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, User, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';
import Head from 'next/head';

const ZendeskTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/zendesk');
      if (res.ok) {
        const data = await res.json();
        // Handle both search API response (data.results) and tickets API response (data.tickets)
        let ticketsData = [];
        if (data && data.results) {
          // Search API response - filter for tickets only
          ticketsData = data.results.filter(item => item.result_type === 'ticket');
        } else if (data && data.tickets) {
          // Regular tickets API response
          ticketsData = data.tickets;
        } else {
          setError('No tickets data received');
          return;
        }
        
        setTickets(ticketsData);
        setLastFetch(new Date());
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-800 bg-gray-100';
    const normalizedStatus = String(status).toLowerCase();
    switch (normalizedStatus) {
      case 'new': return 'text-blue-800 bg-blue-100';
      case 'open': return 'text-red-800 bg-red-100';
      case 'pending': return 'text-blue-800 bg-blue-100';
      case 'on hold': return 'text-black bg-gray-200';
      case 'solved': return 'text-gray-800 bg-gray-200';
      case 'closed': return 'text-gray-800 bg-gray-200';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'text-gray-800 bg-gray-100';
    const normalizedPriority = String(priority).toLowerCase();
    switch (normalizedPriority) {
      case 'urgent': return 'text-red-800 bg-red-100';
      case 'high': return 'text-orange-800 bg-orange-100';
      case 'normal': return 'text-blue-800 bg-blue-100';
      case 'low': return 'text-green-800 bg-green-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Head>
        <title>Zendesk Tickets - FlowLink</title>
        <meta name="description" content="View and manage Zendesk tickets" />
      </Head>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zendesk Tickets</h1>
            <p className="text-gray-600 mt-1">
              {tickets.length} tickets found
              {lastFetch && (
                <span className="ml-2">
                  • Last updated: {formatDate(lastFetch)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <button
              onClick={fetchTickets}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Loading State */}
        {loading && !tickets.length && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Zendesk tickets...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Tickets</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <p className="text-red-600 text-sm mt-2">
                  Make sure your Zendesk credentials are properly configured in the dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Tag className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tickets Found</h3>
            <p className="text-gray-600 mb-6">
              Either you have no tickets in Zendesk or there&apos;s an issue with your connection.
            </p>
            <button
              onClick={fetchTickets}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Tickets Table */}
        {!loading && !error && tickets.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Ticket ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{ticket.id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 font-medium max-w-xs truncate">
                          {ticket.subject || 'No Subject'}
                        </div>
                        {ticket.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                            {ticket.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority || 'Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {ticket.requester?.name || ticket.requester?.email || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {ticket.assignee?.name || ticket.assignee?.email || 'Unassigned'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {formatDate(ticket.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {formatDate(ticket.updated_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.open(ticket.url, '_blank')}
                          className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          title="Open in Zendesk"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tickets Found</h3>
            <p className="text-gray-600">
              Your Zendesk instance doesn&apos;t have any tickets, or they couldn&apos;t be retrieved.
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ZendeskTicketsPage;