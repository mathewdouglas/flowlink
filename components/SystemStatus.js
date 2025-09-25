import React from 'react';
import Image from 'next/image';
import { CheckCircle, AlertCircle, Clock, X } from 'lucide-react';

const SystemStatus = ({
  showConnectedSystems,
  setShowConnectedSystems,
  connectedSystems,
  integrationStatuses,
  checkAllIntegrationStatuses,
  navigateToTickets,
  navigateToZendeskTickets,
  navigateToJiraIssues,
  setShowZendeskSetup
}) => {
  // Helper functions
  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCompanyIcon = (systemName) => {
    const iconMap = {
      zendesk: '/assets/logos/zendesk.svg',
      jira: '/assets/logos/jira.svg',
      slack: '/assets/logos/slack.svg',
      github: '/assets/logos/github.svg',
      salesforce: '/assets/logos/salesforce.svg',
      teams: '/assets/logos/teams.svg'
    };

    const iconPath = iconMap[systemName.toLowerCase()];
    
    if (iconPath) {
      return (
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
          <Image
            src={iconPath}
            alt={`${systemName} logo`}
            width={24}
            height={24}
            className="w-6 h-6"
          />
        </div>
      );
    }

    // Fallback for unknown systems
    return (
      <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
        {systemName.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (!showConnectedSystems) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button
          onClick={() => setShowConnectedSystems(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label="Close Connected Systems Modal"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">Connected Systems</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {connectedSystems.map((system) => (
            <div
              key={system.id}
              className="flex flex-col items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-shadow min-h-48 p-5 relative group"
            >
              <div className="flex flex-col items-center w-full flex-1 justify-center">
                {getCompanyIcon(system.name)}
                <h3 className="font-semibold text-gray-900 text-base mt-3 mb-1 text-center w-full truncate">{system.name}</h3>
                <p className="text-xs text-gray-500 capitalize text-center mb-2 w-full truncate">{system.type}</p>
              </div>
              
              {/* Status and Actions */}
              <div className="flex flex-col items-center w-full mt-auto pt-2 space-y-2">
                <div className="flex items-center justify-between w-full">
                  <span className={`inline-block w-3 h-3 rounded-full ${system.color} border border-white shadow`}></span>
                  <span className="ml-auto">{getStatusIcon(system.status)}</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col w-full space-y-1">
                  {system.name.toLowerCase() === 'zendesk' && (
                    <>
                      {system.status === 'connected' ? (
                        <button
                          onClick={navigateToZendeskTickets}
                          className="w-full text-xs px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          View Tickets
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowConnectedSystems(false);
                            setShowZendeskSetup(true);
                          }}
                          className="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Connect
                        </button>
                      )}
                    </>
                  )}
                  
                  {system.name.toLowerCase() === 'jira' && (
                    <>
                      {system.status === 'connected' ? (
                        <button
                          onClick={() => navigateToTickets('jira')}
                          className="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          View Issues
                        </button>
                      ) : (
                        <button
                          onClick={() => navigateToTickets('jira')}
                          className="w-full text-xs px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Configure & View
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Other systems get a coming soon button */}
                  {!['zendesk', 'jira'].includes(system.name.toLowerCase()) && (
                    <button
                      disabled
                      className="w-full text-xs px-3 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;