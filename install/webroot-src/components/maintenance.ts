// Maintenance Tab - ACC maintenance operations
import * as logger from '../config/logger';
import * as acc from '../commands/acc';
import { showReadme } from '../commands/command';
import { printToNotify } from '../config/logger';
import { customPrompt } from './dialog';
import { customConfirm } from './confirm';
import { $, setOnClick } from './base';




function initializeMaintenanceTab(): void {
    setOnClick('upgrade-btn', handleUpgrade);
    setOnClick('uninstall-btn', handleUninstall);
    setOnClick('rollback-btn', handleRollback);
    setOnClick('version-btn', handleVersion);
    setOnClick('readme-btn', handleReadme);
    setOnClick('close-readme', handleCloseReadme);
}

/**
 * Handle upgrade button click
 */
async function handleUpgrade(): Promise<void> {
    if (await customConfirm('Check for ACC updates?')) {
        try {
            const result = '';
            //todo printVersionCode会堵塞住，所以要用的化需要加loading并且后退取消
            // const result = await acc.printVersionCode() || '';
            if (result.includes('Update available') || /^\d+$/.test(result.trim())) {
                if (await customConfirm('Update available. Install now?')) {
                    await acc.upgrade();
                    printToNotify('ACC updated successfully. Please refresh the page.');
                }
            } else if (result.includes('No update available')) {
                printToNotify('ACC is up to date');
            } else {
                printToNotify('Update check result: ' + result.trim());
            }
        } catch (e) {
            printToNotify(`Update check failed: ${e}`, 'ERROR');
        }
    }
}

/**
 * Handle uninstall button click
 */
async function handleUninstall(): Promise<void> {
    if (await customConfirm('Are you sure you want to uninstall ACC? This will remove all ACC files and Profiles.')) {
        try {
            const result = await acc.uninstall();
            const resultStr = result?.stdout || '';
            if (resultStr.trim() === '✅') {
                printToNotify('ACC uninstalled successfully');
            } else {
                printToNotify('ACC uninstall: ' + resultStr.trim());
            }
        } catch (e) {
            printToNotify(`Uninstall failed: ${e}`, 'ERROR');
        }
    }
}

/**
 * Handle rollback button click
 */
async function handleRollback(): Promise<void> {
    const version = await customPrompt('Enter version to rollback to (leave empty for previous):');
    try {
        const result = await acc.rollback(version ?? undefined);
        printToNotify('Rollback completed: ' + (result?.stdout || '').trim());
    } catch (e) {
        printToNotify(`Rollback failed: ${e}`, 'ERROR');
    }
}

/**
 * Handle version button click
 */
async function handleVersion(button: HTMLButtonElement): Promise<void> {
    try {
        button.disabled = true;
        button.textContent = 'Checking...';

        const result = await acc.version();
        const accVersion = result?.stdout || '';

        button.disabled = false;
        button.textContent = 'Show Version';

        printToNotify('ACC Version: ' + accVersion.trim());
    } catch (e) {
        button.disabled = false;
        button.textContent = 'Show Version';
        printToNotify(`Version check failed: ${e}`, 'ERROR');
    }
}

/**
 * Handle readme button click
 */
async function handleReadme(): Promise<void> {
    try {
        const result = await showReadme();
        const readme = result?.stdout || '';
        ($('readme-content') as HTMLElement).innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${readme.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
        ($('readme-modal') as HTMLElement).style.display = 'block';
        logger.printToConsole('README displayed');
    } catch (e) {
        printToNotify(`Failed to load README: ${e}`, 'ERROR');
    }
}

/**
 * Handle close readme button click
 */
function handleCloseReadme(): void {
    ($('readme-modal') as HTMLElement).style.display = 'none';
}

export { initializeMaintenanceTab };
