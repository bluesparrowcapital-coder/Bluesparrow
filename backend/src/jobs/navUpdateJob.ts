import cron from 'node-cron';
import { fetchAndSeedAmfiNav } from '../services/amfiService';
import { refreshPortfolioValues } from '../services/portfolioService';
import { logger } from '../utils/logger';

/**
 * Runs every day at 10:00 PM IST (16:30 UTC).
 * AMFI typically publishes NAV by 9–10 PM.
 */
export function startNavCronJob() {
  cron.schedule('30 16 * * *', async () => {
    logger.info('[CRON] Daily NAV update starting...');
    try {
      const { updated, skipped } = await fetchAndSeedAmfiNav();
      logger.info(`[CRON] NAV update: ${updated} funds updated, ${skipped} skipped`);

      await refreshPortfolioValues();
      logger.info('[CRON] Portfolio values refreshed');
    } catch (err) {
      logger.error('[CRON] NAV update failed:', err);
    }
  });

  logger.info('[CRON] Daily NAV job scheduled at 16:30 UTC (10 PM IST)');
}
