// Logs Tab - Log viewing and management
import * as logger from '../config/logger';
import * as acc from '../commands/acc';
import { printToNotify } from '../config/logger';
import { setOnClick } from './base';



/**
 * Handle export logs button click
 */
async function handleExportLogs(): Promise<void> {
    try {
        await acc.exportLogs();
        printToNotify('Logs exported to /sdcard/Download/acc-logs-*.tgz');
    } catch (e) {
        printToNotify(`Export logs failed: ${e}`,'ERROR');
    }
}

/**
 * Handle clear logs button click
 */
async function handleClearLogs(): Promise<void> {
    try {
        const success = await logger.clearLogs();
        if (!success){
            printToNotify('Clear logs failed','ERROR');
        }
    } catch (e) {
        printToNotify(`Clear logs error: ${e}`,'ERROR');
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

export {  initializeLogsTab };
