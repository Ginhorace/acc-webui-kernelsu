// Logs Tab - Log viewing and management
import * as logger from '../config/logger';
import * as acc from '../commands/acc';

import { setOnClick, setButtonLoading } from './base';

/**
 * Handle export logs button click
 */
function handleExportLogs(button: HTMLButtonElement): void {
    setButtonLoading(button, true);
    acc.exportLogsSpawn({
        onExit: (code) => {
            // acc.sh的问题导致成功导出压缩包却返回1
            logger.printToNotify(`Logs exported to /sdcard/Download/acc-logs-*.tgz with code: ${code}`);
            setButtonLoading(button, false);
        },
    });
}

/**
 * Handle clear logs button click
 */
async function handleClearLogs(): Promise<void> {
    //todo loading
    const result = await logger.clearLogs();
    if (result.errno === 0) {
        logger.printToNotify('Clear logs', 'INFO');
    }
    else {
        logger.printToNotify(`Clear logs failed: ${result.stderr}`, 'ERROR');
    }

}
//todo 界面上添加自动刷新logs的选项

/**
 * Initialize logs tab event listeners
 */
function initializeLogsTab(): void {
    setOnClick('export-logs-btn', handleExportLogs);
    setOnClick('clear-logs-btn', handleClearLogs);
}

export { initializeLogsTab };
