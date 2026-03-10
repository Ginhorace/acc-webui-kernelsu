// Maintenance Tab - ACC maintenance operations
import * as logger from '@/env/logger';
import * as acc from '@/commands/acc';
import { showReadme } from '@/commands/command';
import { LogLevel } from '@/data/state';

import { customPrompt } from '@/components/dialog';
import { customConfirm } from '@/components/confirm';
import { $, setOnClick, setButtonLoading } from '@/components/base';
import { marked } from 'marked';

function initializeMaintenanceTab(): void {
    setOnClick('upgrade-btn', handleUpgrade);
    setOnClick('uninstall-btn', handleUninstall);
    setOnClick('rollback-btn', handleRollback);
    setOnClick('readme-btn', handleReadme);
    setOnClick('close-readme', handleCloseReadme);
}

/**
 * Handle upgrade button click
 */
function handleUpgrade(button: HTMLButtonElement): void {
    setButtonLoading(button, true);
    try {
        acc.printVersionCodeSpawn({
            async onStdout(data) {
                //todo 受多语言影响
                if (data.includes('Update available')) {
                    if (await customConfirm('Update available. Install now?')) {
                        setButtonLoading(button, true);
                        acc.upgradeSpawn({
                            onExit: () => {
                                setButtonLoading(button, false);
                                logger.printToNotify('ACC updated successfully. Please refresh the page.');
                            },
                        });
                    }
                } else if (data.includes('No update available')) {
                    logger.printToNotify('ACC is up to date');
                } else if (data.trim()) {
                    logger.printToNotify('Update check result: ' + data.trim());
                }
            },
            onExit: () => {
                setButtonLoading(button, false);
            },
        });
    } catch (e) {
        logger.printToConsole(`upgrade failed: ${e}`);
    }

}

/**
 * Handle uninstall button click
 */
async function handleUninstall(button: HTMLButtonElement): Promise<void> {
    if (await customConfirm('Are you sure you want to uninstall ACC? This will remove all ACC files and Profiles.')) {
        setButtonLoading(button, true);
        try {
            acc.uninstallSpawn({
                onStdout: (data) => logger.printToConsole(data),
                onStderr: (data) => logger.printToConsole(data, LogLevel.ERROR),
                onExit: (code) => {
                    setButtonLoading(button, false);
                    if (code === 0) {
                        logger.printToNotify('ACC uninstalled successfully');
                    } else {
                        logger.printToNotify(`ACC uninstall failed with code: ${code}`, LogLevel.ERROR);
                    }
                },
            });
        } catch (e) {
            logger.printToConsole(`uninstall failed: ${e}`, LogLevel.ERROR);
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
        logger.printToNotify('Rollback completed: ' + (result?.stdout || '').trim());
    } catch (e) {
        logger.printToConsole(`Rollback failed: ${e}`, LogLevel.ERROR);
    }
}



/**
 * Handle readme button click
 */
async function handleReadme(): Promise<void> {
    try {
        const result = await showReadme();
        if (result.errno === 0 && result.stdout) {
            ($('readme-content') as HTMLElement).innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px;">${marked.parse(result.stdout)}</pre>`;
            // ($('readme-content') as HTMLElement).innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${result.stdout.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
            ($('readme-modal') as HTMLElement).style.display = 'block';
        }
        else {
            logger.printToNotify(`Failed to load README: ${result.stderr}`, LogLevel.ERROR);
        }

    } catch (e) {
        logger.printToNotify(`Failed to load README: ${e}`, LogLevel.ERROR);
    }
}

/**
 * Handle close readme button click
 */
function handleCloseReadme(): void {
    ($('readme-modal') as HTMLElement).style.display = 'none';
}

export { initializeMaintenanceTab };
