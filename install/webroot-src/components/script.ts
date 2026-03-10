import { checkKSUEnvironment } from '../env/ksu';
import * as logger from '../config/logger';
import { checkId } from '../commands/command';
import * as acc from '../commands/acc';
import { printToNotify } from '../config/logger';
import { printToConsole } from '../config/logger';
import { $,  updateStatusClass } from './base';
// Import tab modules
import {  initializeStatusTab } from './status';
import {  initializeLogsTab } from './logs';
import { initializeMaintenanceTab } from './maintenance';
import { initializeSettingsTab } from './settings';
import {initializeDebugMode} from './console';
import { loadConfigDisplay } from './profile';
import './notification'; // side effect: register notification listener

/**
 * Verify system requirements
 */
async function verifySystem(): Promise<void> {
    printToConsole('Starting system verification...');
    (window as Record<string, unknown>).verifySystem = verifySystem;

    ($('root-status') as HTMLElement).textContent = 'Checking...';
    ($('acc-install-status') as HTMLElement).textContent = 'Checking...';

    try {
        printToConsole('Checking root access...');
        const idResult = await checkId();
        printToConsole(`Root check result: ${idResult}`);

        ($('root-status') as HTMLElement).textContent =
            idResult.includes('uid=0') ? 'Root access OK' : 'Root access failed';
        updateStatusClass($('root-status'), idResult.includes('uid=0'));

        if (!idResult.includes('uid=0')) {
            hideLoadingOverlay();
            throw new Error('Root access not granted');
        }

        printToConsole('Root access OK, checking ACC installation...');
        const accPath = acc.getAccPath();
        const version = acc.getAccVersion();
        ($('acc-install-status') as HTMLElement).textContent = `Found at ${accPath}`;
        ($('acc-version') as HTMLElement).textContent = version;
        updateStatusClass($('acc-install-status'), true);
        updateStatusClass($('acc-version'), true);

        ($('control-panel') as HTMLElement).style.display = 'block';
        ($('profile-panel') as HTMLElement).style.display = 'block';
        ($('log-panel') as HTMLElement).style.display = 'block';
        ($('maintenance-panel') as HTMLElement).style.display = 'block';
        ($('settings-panel') as HTMLElement).style.display = 'block';

        printToConsole('Initializing UI (non-blocking)...');

        initializeUI(accPath).catch((e: Error) => {
            printToNotify(`UI initialization error: ${e}`, 'ERROR');
        });

        setTimeout(hideLoadingOverlay, 500);

        printToConsole('System verification completed successfully');
        return;
    } catch (e) {
        printToNotify(`System verification failed: ${e}`, 'ERROR');
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

    // Initialize all tab modules
    initializeStatusTab();
    initializeLogsTab();
    initializeMaintenanceTab();
    initializeSettingsTab();


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
        //自定义逻辑
        if(tabId =="profile-tab"){
           loadConfigDisplay();
        }
    }
    logger.printToConsole(`Switched to tab: ${tabId}`, 'DEBUG');
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
        initializeMainTabs();

        if (!checkKSUEnvironment()) {
            printToNotify('KernelSU API not available.', 'ERROR');
            return;
        }
        try {
            await logger.initLogDirectory();
        } catch (e) {
            console.error(`Logging initialization failed: ${e}`, 'WARN');
        }
        logger.printToFile('WebView starting');

        if (!acc.initAccPath()) {
            printToConsole('ACC binary not found');
            return;
        }

        await verifySystem();

        // Initialize debug mode toggle
        initializeDebugMode();
    } catch (e) {
        printToNotify(`Initialization failed: ${e}`, 'ERROR');
    }
});
