# Zendesk Background Sync Implementation

## Overview

The Zendesk integration has been completely refactored to run independently of user browser sessions. The system now uses server-side background jobs that poll Zendesk every 15 minutes (configurable) and automatically sync tickets to the database.

## Key Features

### ✅ Browser-Independent Operation
- Background sync service runs on the server
- No user interaction required for automatic syncing
- Continues running even when no users are online

### ✅ Configurable Intervals
- Default: Every 15 minutes (`*/15 * * * *`)
- Configurable per organization
- Manual trigger available

### ✅ Comprehensive Monitoring
- Real-time sync status dashboard
- Detailed sync logs and history
- Error tracking and consecutive failure monitoring
- Statistics on records processed

### ✅ Database-Driven
- All tickets stored in SQLite database
- Supports offline/cached viewing
- Persistent record linking across systems

## Architecture

### Core Components

1. **ZendeskSyncService** (`/lib/zendesk-sync-service.js`)
   - Background job scheduler using `node-cron`
   - Manages sync jobs for multiple organizations
   - Handles Zendesk API communication
   - Processes and stores tickets in database

2. **API Endpoints**
   - `/api/zendesk/sync-config` - Job configuration and control
   - `/api/zendesk/sync-status` - Status monitoring and statistics
   - `/api/zendesk` - Legacy endpoint (still functional)

3. **Database Schema Updates**
   - Enhanced `SyncLog` table with sync tracking
   - `Integration` table for managing sync metadata
   - `FlowRecord` table for unified ticket storage

4. **Dashboard Integration**
   - Real-time sync status display
   - Manual refresh triggers background sync
   - Visual indicators for sync health

## Usage

### Automatic Background Sync

The system automatically starts background sync jobs when:
- The server starts up (via `service-init.js`)
- An organization has active Zendesk credentials
- The integration is marked as active

### Manual Operations

1. **Trigger Immediate Sync**
   ```javascript
   POST /api/zendesk/sync-config?organizationId={orgId}
   {
     "action": "trigger"
   }
   ```

2. **Start/Stop Sync Job**
   ```javascript
   POST /api/zendesk/sync-config?organizationId={orgId}
   {
     "action": "start|stop",
     "interval": "*/15 * * * *"  // optional
   }
   ```

3. **Update Sync Interval**
   ```javascript
   POST /api/zendesk/sync-config?organizationId={orgId}
   {
     "action": "update-interval",
     "interval": "*/30 * * * *"  // every 30 minutes
   }
   ```

### Dashboard Features

- **Sync Status Indicator**: Shows if background sync is active
- **Last Sync Time**: Displays when tickets were last updated
- **Record Statistics**: Total records, today's count, error tracking
- **Recent Activity**: Last 3 sync operations with status
- **Manual Refresh**: Triggers immediate sync + UI refresh

## Configuration

### Cron Schedule Format
```
┌────────────── minute (0 - 59)
│ ┌──────────── hour (0 - 23)
│ │ ┌────────── day of month (1 - 31)
│ │ │ ┌──────── month (1 - 12)
│ │ │ │ ┌────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

### Common Intervals
- Every 15 minutes: `*/15 * * * *`
- Every 30 minutes: `*/30 * * * *`
- Every hour: `0 * * * *`
- Every 2 hours: `0 */2 * * *`
- Business hours only: `0 9-17 * * 1-5`

### Environment Variables
- `NODE_ENV`: Set to 'production' for production deployment
- Database URL configured in `prisma/schema.prisma`
- Timezone setting in sync service (default: "America/New_York")

## Data Flow

1. **Background Job Triggers** (every 15 minutes)
2. **Fetch Zendesk Credentials** from database
3. **Call Zendesk API** with authentication
4. **Process Tickets** and map to FlowRecord format
5. **Upsert Records** in database (update existing, create new)
6. **Log Sync Results** in SyncLog table
7. **Update Integration** metadata (lastSyncAt)

## Error Handling

- **API Failures**: Logged to database with error details
- **Authentication Issues**: Marked as credential errors
- **Rate Limiting**: Automatically handled with retry logic
- **Network Issues**: Timeout and retry mechanisms
- **Consecutive Failures**: Tracked and displayed in dashboard

## Performance Considerations

- **Incremental Sync**: Only fetches tickets from last 7 days by default
- **Batch Processing**: Handles large ticket volumes efficiently
- **Database Optimization**: Upsert operations prevent duplicates
- **Memory Management**: Prisma client connection pooling
- **Background Processing**: Non-blocking async operations

## Monitoring & Debugging

### Dashboard Monitoring
- Real-time status updates every 30 seconds
- Visual indicators for sync health
- Recent activity logs
- Error count tracking

### Server Logs
```bash
# View sync service logs
tail -f logs/sync-service.log

# Monitor database activity
npx prisma studio
```

### Database Queries
```sql
-- Check recent sync logs
SELECT * FROM sync_logs ORDER BY synced_at DESC LIMIT 10;

-- Count records by system
SELECT source_system, COUNT(*) FROM flow_records GROUP BY source_system;

-- Check integration status
SELECT * FROM integrations WHERE system_type = 'zendesk';
```

## Migration from Browser-Based Sync

The previous implementation required users to manually visit `/zendesk-tickets` page to trigger API calls. The new system:

1. **Preserves Existing Data**: All existing tickets remain in database
2. **Background Processing**: No user interaction required
3. **Enhanced Monitoring**: Better visibility into sync operations
4. **Improved Reliability**: Consistent sync schedule regardless of user activity
5. **Scalable Architecture**: Supports multiple organizations seamlessly

## Next Steps

1. **Production Deployment**: Configure process managers (PM2, Docker)
2. **Monitoring Setup**: Add APM tools for production monitoring
3. **Backup Strategy**: Implement database backup for sync data
4. **Alert System**: Email/Slack notifications for sync failures
5. **Multi-System Support**: Extend pattern to Jira, Slack, etc.

## Troubleshooting

### Sync Not Running
1. Check server startup logs for service initialization
2. Verify Zendesk credentials are active in database
3. Check organization has valid integration setup
4. Review API endpoint responses for errors

### Data Not Updating
1. Verify background job is running via dashboard
2. Check sync logs for error messages
3. Test manual sync trigger
4. Validate Zendesk API credentials

### Performance Issues
1. Monitor sync duration in logs
2. Check database query performance
3. Review Zendesk API rate limits
4. Consider adjusting sync intervals

The system is now fully independent of user browser sessions and provides robust, scalable ticket synchronization with comprehensive monitoring and control capabilities.