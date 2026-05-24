import cron from 'node-cron';
import { executeDueSips } from '../services/sipService';
import { logger } from '../utils/logger';

export function startSipProcessorJob() {
  // Run every day at 9:00 AM IST (3:30 UTC)
  cron.schedule('30 3 * * *', async () => {
    logger.info('[SIP Processor] Starting due-SIP execution...');
    try {
      const { executed, failed } = await executeDueSips();
      logger.info(`[SIP Processor] Done — executed: ${executed}, failed: ${failed}`);
    } catch (err) {
      logger.error('[SIP Processor] Unhandled error:', err);
    }
  });
  logger.info('[SIP Processor] Cron scheduled (daily 9 AM IST)');
}
