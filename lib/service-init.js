// Service initialization for background sync jobs
// This should be called when the application starts

const zendeskSyncService = require('../lib/zendesk-sync-service');
const jiraSyncService = require('../lib/jira-sync-service');

let isInitialized = false;

async function initializeBackgroundServices() {
  if (isInitialized) {
    console.log('Background services already initialized');
    return;
  }

  try {
    console.log('Initializing background services...');
    
    // Start Zendesk sync service
    await zendeskSyncService.start();
    
    // Start Jira sync service
    await jiraSyncService.start();
    
    isInitialized = true;
    console.log('Background services initialized successfully');
    
  } catch (error) {
    console.error('Error initializing background services:', error);
    throw error;
  }
}

async function shutdownBackgroundServices() {
  if (!isInitialized) {
    return;
  }

  try {
    console.log('Shutting down background services...');
    
    // Stop Zendesk sync service
    zendeskSyncService.stop();
    
    // Stop Jira sync service
    jiraSyncService.stop();
    
    isInitialized = false;
    console.log('Background services shut down successfully');
    
  } catch (error) {
    console.error('Error shutting down background services:', error);
  }
}

// Auto-initialize when this module is loaded (for Next.js API routes)
if (typeof window === 'undefined') {
  // Only run on server side
  process.nextTick(async () => {
    try {
      await initializeBackgroundServices();
    } catch (error) {
      console.error('Failed to auto-initialize background services:', error);
    }
  });

  // Graceful shutdown handlers
  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    await shutdownBackgroundServices();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon restarts
}

module.exports = {
  initializeBackgroundServices,
  shutdownBackgroundServices,
  isInitialized: () => isInitialized
};