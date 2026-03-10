import { checkKSUEnvironment } from '@/env/ksu';
import * as logger from '@/env/logger';
import { checkId } from '@/commands/command';
import * as acc from '@/commands/acc';
import { LogLevel } from '@/data/state';

import { $, updateStatusClass } from '@/components/base';
// Import tab modules
import { initializeStatusTab, refreshStatus } from '@/pages/status';
import { initializeLogsTab } from '@/pages/logs';
import { initializeMaintenanceTab } from '@/pages/maintenance';
import { initializeSettingsTab } from '@/pages/settings';
import { initializeDebugMode } from '@/components/console';
import { initializeProfileTab } from '@/pages/profile';
import '@/components/notification'; // side effect: register notification listener

/**
 * Verify system requirements
 */
async function verifySystem(): Promise<void> {
    //todo 要改
    logger.printToConsole('Starting system verification...');
    (window as Record<string, unknown>).verifySystem = verifySystem;

    const rootStatus = $('root-status');
    const accInstallStatus = $('acc-install-status');

    if (rootStatus) rootStatus.textContent = 'Checking...';
    if (accInstallStatus) accInstallStatus.textContent = 'Checking...';

    try {
        logger.printToConsole('Checking root access...');
        const idResult = await checkId();
        const idOutput = idResult?.stdout || '';
        logger.printToConsole(`Root check result: ${idOutput}`);

        if (rootStatus) {
            rootStatus.textContent =
                idOutput.includes('uid=0') ? 'Root access OK' : 'Root access failed';
        }
        updateStatusClass(rootStatus, idOutput.includes('uid=0'));

        if (!idOutput.includes('uid=0')) {
            hideLoadingOverlay();
            throw new Error('Root access not granted');
        }

        logger.printToConsole('Root access OK, checking ACC installation...');
        const accPath = acc.getAccPath();
        const version = acc.getAccVersion();
        if (accInstallStatus) accInstallStatus.textContent = `Found at ${accPath}`;
        const accVersionEl = $('acc-version');
        if (accVersionEl) accVersionEl.textContent = version;
        updateStatusClass(accInstallStatus, true);
        updateStatusClass(accVersionEl, true);

        const controlPanel = $('control-panel');
        const profilePanel = $('profile-container');
        const logPanel = $('log-panel');
        const maintenancePanel = $('maintenance-panel');
        const settingsPanel = $('settings-panel');

        if (controlPanel) controlPanel.style.display = 'block';
        if (profilePanel) profilePanel.style.display = 'block';
        if (logPanel) logPanel.style.display = 'block';
        if (maintenancePanel) maintenancePanel.style.display = 'block';
        if (settingsPanel) settingsPanel.style.display = 'block';

        logger.printToConsole('Initializing UI (non-blocking)...');

        initializeUI(accPath).then(() => {

            logger.printToConsole('System verification completed successfully');
            hideLoadingOverlay();
        }).catch((e: Error) => {
            logger.printToNotify(`UI initialization error: ${e}`, LogLevel.ERROR);
        });


        logger.printToConsole('System verification completed successfully');
        return;
    } catch (e) {
        logger.printToNotify(`System verification failed: ${e}`, LogLevel.ERROR);
        updateStatusClass($('root-status'), false);
        updateStatusClass($('acc-install-status'), false);
        hideLoadingOverlay();
    }
}

/**
 * Initialize UI components
 * @param accPath
 */
async function initializeUI(accPath: string): Promise<void> {
    logger.printToFile(`Initializing with ACC path: ${accPath}`);
    //todo 需要把页面初始化和加载数据区分开

    initializeMainTabs();
    // Initialize debug mode toggle
    initializeDebugMode();
    // Initialize all tab modules
    initializeStatusTab();
    initializeLogsTab();
    initializeMaintenanceTab();
    initializeSettingsTab();
    initializeProfileTab();
    refreshStatus();
    // Close modals when clicking outside
    window.addEventListener('click', handleModalClick);
}

// Handle modal click to close when clicking outside
function handleModalClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal')) {
        target.style.display = 'none';
    }
}

/**
 * Initialize main navigation tabs
 */
function initializeMainTabs(): void {
    const navButtons = document.querySelectorAll('.nav-button');

    navButtons.forEach((button: Element) => {
        button.addEventListener('click', handleNavButtonClick);
    });
}

// Handle navigation button click
function handleNavButtonClick(e: Event): void {
    const button = e.currentTarget as HTMLElement;
    const tabId = button.getAttribute('data-main-tab');

    document.querySelectorAll('.nav-button').forEach((btn: Element) => btn.classList.remove('active'));
    document.querySelectorAll('.main-tab-pane').forEach((pane: Element) => pane.classList.remove('active'));

    button.classList.add('active');
    if (tabId) {
        const tab = $(tabId);
        if (tab) tab.classList.add('active');
        //todo 数据将会在点击后重新加载
    }
    logger.printToConsole(`Switched to tab: ${tabId}`, LogLevel.DEBUG);
}
/**
 * Hide loading overlay
 */
function hideLoadingOverlay(): void {
    const overlay = $('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {

        if (!checkKSUEnvironment()) {
            logger.printToNotify('KernelSU API not available.', LogLevel.ERROR);
            return;
        }
        const initLogResult = await logger.initLogDirectory()
        if (initLogResult.errno !== 0) {
            logger.printToNotify(`Logging initialization failed`, LogLevel.ERROR);
            return;
        }
        if (!acc.initAccPath()) {
            logger.printToNotify('ACC binary not found', LogLevel.ERROR);
            return;
        }
        logger.printToFile('WebView starting');

        await verifySystem();

    } catch (e) {
        logger.printToNotify(`Initialization failed: ${e}`, LogLevel.ERROR);
    }
});
