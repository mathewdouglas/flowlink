// API route to initialize and manage background services
// This ensures the background sync service starts when the server starts

import zendeskSyncService from '../../../lib/zendesk-sync-service';

let isServiceInitialized = false;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action } = req.body;

    try {
      switch (action) {
        case 'start':
          if (!isServiceInitialized) {
            await zendeskSyncService.start();
            isServiceInitialized = true;
          }
          return res.status(200).json({ 
            success: true, 
            message: 'Background services started',
            isRunning: isServiceInitialized
          });

        case 'stop':
          if (isServiceInitialized) {
            zendeskSyncService.stop();
            isServiceInitialized = false;
          }
          return res.status(200).json({ 
            success: true, 
            message: 'Background services stopped',
            isRunning: isServiceInitialized
          });

        case 'restart':
          if (isServiceInitialized) {
            zendeskSyncService.stop();
          }
          await zendeskSyncService.start();
          isServiceInitialized = true;
          return res.status(200).json({ 
            success: true, 
            message: 'Background services restarted',
            isRunning: isServiceInitialized
          });

        default:
          return res.status(400).json({ error: 'Invalid action. Use: start, stop, restart' });
      }
    } catch (error) {
      console.error('Error managing background services:', error);
      return res.status(500).json({ 
        error: 'Failed to manage services: ' + error.message 
      });
    }
  }

  if (req.method === 'GET') {
    // Get service status
    return res.status(200).json({
      success: true,
      isRunning: isServiceInitialized,
      message: isServiceInitialized ? 'Services are running' : 'Services are not running'
    });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

// Auto-start the service when this module loads
if (typeof window === 'undefined' && !isServiceInitialized) {
  // Only run on server side
  setTimeout(async () => {
    try {
      console.log('Auto-starting background sync service...');
      await zendeskSyncService.start();
      isServiceInitialized = true;
      console.log('Background sync service auto-started successfully');
    } catch (error) {
      console.error('Failed to auto-start background sync service:', error);
    }
  }, 2000); // Wait 2 seconds after server start
}