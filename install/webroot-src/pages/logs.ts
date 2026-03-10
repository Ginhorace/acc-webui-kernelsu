// Logs Tab - Log viewing and management
import * as logger from '@/env/logger';
import * as acc from '@/commands/acc';
import { LogLevel } from '@/data/state';

import { setOnClick, setButtonLoading } from '@/components/base';
import { clearLogs } from '@/commands/command';

/**
 * Handle export logs button click
 */
function handleExportLogs(button: HTMLButtonElement): void {
    setButtonLoading(button, true);
    try {
        acc.exportLogsSpawn({
            onExit: (code) => {
                // acc.sh的问题导致成功导出压缩包却返回1
                logger.printToNotify(`Logs exported to /sdcard/Download/acc-logs-*.tgz with code: ${code}`);
                setButtonLoading(button, false);
            },
        });
    } catch (e) {
        logger.printToConsole(`Logs exported failed: ${e}`, LogLevel.ERROR);
    }

}

/**
 * Handle clear logs button click
 */
async function handleClearLogs(button: HTMLButtonElement): Promise<void> {
    setButtonLoading(button, true);
    try {
        const result = await clearLogs();
        if (result.errno === 0) {
            logger.printToNotify('Clear logs', LogLevel.INFO);
        }
        else {
            logger.printToNotify(`Clear logs failed: ${result.stderr}`, LogLevel.ERROR);
        }
    } finally {
        setButtonLoading(button, false);
    }


}

/**
 * Initialize logs tab event listeners
 */
function initializeLogsTab(): void {
    setOnClick('export-logs-btn', handleExportLogs);
    setOnClick('clear-logs-btn', handleClearLogs);
}

export { initializeLogsTab };
