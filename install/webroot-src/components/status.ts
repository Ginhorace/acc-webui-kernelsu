// Status Tab - System status and battery information
import * as logger from '../config/logger';
import * as acc from '../commands/acc';
import { checkAccd } from '../commands/command';
import { printToNotify } from '../config/logger';
import { customPrompt } from './dialog';
import { customConfirm } from './confirm';
import { $, setOnClick, setButtonLoading, updateStatusClass } from './base';

// Auto refresh state
let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;

//todo 把刷新改成自动刷新
/**
 * Initialize status tab event listeners
 */
function initializeStatusTab(): void {
    setOnClick('battery-health-btn', handleBatteryHealth);
    setOnClick('test-switches-btn', handleTestSwitches);
    setOnClick('disable-charging-btn', handleDisableCharging);
    setOnClick('enable-charging-btn', handleEnableCharging);
    setOnClick('force-charge-btn', handleForceCharge);
    setOnClick('reset-battery-stats-btn', handleResetBatteryStats);
    setOnClick('refresh-btn', handleRefresh);
    setOnClick('restart-btn', handleRestart);
    setOnClick('stop-btn', handleStop);
    setOnClick('start-btn', handleStart);
    setOnClick('detailed-info-btn', handleDetailedInfo);
    
    // Test switches modal events
    setOnClick('run-test-switches', handleRunTestSwitches);
    setOnClick('stop-test-switches', handleStopTestSwitches);
    setOnClick('close-test-switches', handleCloseTestSwitches);
    updateStatus();
}



/**
 * 更新整个页面
 */
async function updateStatus(): Promise<void> {
    if (!acc.getAccPath()) {
        logger.printToConsole('ACC path not available for status update', 'ERROR');
        return;
    }

    try {
        const output = await acc.showInfo() || '';
        logger.printToConsole(`Raw acc -i output:\n${output}`, 'DEBUG');

        const lines = output.split('\n').filter((line: string) => line.trim());
        const status: Record<string, string> = {};

        // Parse battery info output more reliably
        lines.forEach((line: string) => {
            // Try colon/equals separator first (key: value or key=value)
            let m = line.match(/^\s*([a-zA-Z0-9_\-]+)\s*[:=]\s*(.+)$/);
            if (m) {
                status[m[1]] = m[2].trim();
                return;
            }

            // Fallback to space separator (key value)
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                status[parts[0]] = parts.slice(1).join(' ');
            }
        });

        // Update daemon status
        try {
            await checkAccd();
            ($('daemon-status') as HTMLElement).textContent = 'Running';
        } catch (e) {
            ($('daemon-status') as HTMLElement).textContent = 'Stop';
        }
        const daemonStatus = $('daemon-status');
        updateStatusClass(daemonStatus, daemonStatus?.textContent=='Running');

        // Battery level - extract from "level 75%" format or raw number
        let batteryLevel = '0';
        if (status.level) {
            batteryLevel = status.level.toString().replace('%', '').replace(/[^0-9]/g, '');
        } else if (status.capacity) {
            batteryLevel = status.capacity.toString().replace('%', '').replace(/[^0-9]/g, '');
        }

        ($('battery-level') as HTMLElement).textContent = batteryLevel + '%';
        const batteryBar = $('battery-bar');
        if (batteryBar) {
            batteryBar.style.setProperty('--battery-level', batteryLevel + '%');
        }

        // Charging status
        ($('charging-status') as HTMLElement).textContent = status.status || '-';
        const chargingStatus = $('charging-status');
        updateStatusClass(chargingStatus, daemonStatus?.textContent=='charging');

        // Current - handle "1.23A" format
        const currentNow = status.current_now || '-';
        ($('current-limit') as HTMLElement).textContent = currentNow;

        // Temperature - handle "28℃" format
        const tempElement = $('temperature');
        if (tempElement) {
            tempElement.textContent = status.temp || '-';
        }

        // Power - handle "5.35W" format
        const powerElement = $('power-display');
        if (powerElement) {
            powerElement.textContent = status.power_now || '-';
        }

        // Charge type (optional - only when power supply connected)
        const chargeTypeElement = $('charge-type');
        if (chargeTypeElement) {
            chargeTypeElement.textContent = status.charge_type || 'N/A';
        }

        // Real level (optional - only when capacity_mask enabled)
        const realLevelElement = $('real-level');
        if (realLevelElement) {
            realLevelElement.textContent = status.real_level || 'N/A';
        }

        logger.printToConsole('Status refreshed');
    } catch (e) {
        printToNotify(`Status load failed: ${e}`, 'ERROR');
        ($('daemon-status') as HTMLElement).textContent = 'Stop';
        updateStatusClass($('daemon-status'), false);
    }
}


/**
 * Handle battery health check
 */
async function handleBatteryHealth(): Promise<void> {
    const button = $('battery-health-btn') as HTMLButtonElement | null;
    try {
        setButtonLoading(button, true);
        const mAh = await customPrompt('Enter battery capacity in mAh (leave empty to auto-detect):');
        const health = await acc.printHealth(mAh ?? undefined) || '';
        const healthValue = health.trim();

        if (healthValue === '!') {
            ($('battery-health') as HTMLElement).textContent = 'Unable to calculate (missing counter data)';
            updateStatusClass($('battery-health'), false);
            printToNotify('Battery health check failed: missing charge counter data', 'ERROR');
        } else {
            ($('battery-health') as HTMLElement).textContent = healthValue;
            updateStatusClass($('battery-health'), true);
            printToNotify('Battery health: ' + healthValue);
        }
        logger.printToConsole('Battery health checked');
    } catch (e) {
        printToNotify(`Battery health check failed: ${e}`,'ERROR');
        ($('battery-health') as HTMLElement).textContent = 'Error';
        updateStatusClass($('battery-health'), false);
    } finally {
        setButtonLoading(button, false);
    }
}

/**
 * Handle test switches button click
 */
function handleTestSwitches(): void {
    ($('test-switches-modal') as HTMLElement).style.display = 'block';
    ($('test-switches-output') as HTMLElement).textContent = 'Click "Run Test" to start testing charging switches...\n\nThis may take several minutes. Ensure charger is plugged in.\n';
}

/**
 * Handle disable charging
 */
async function handleDisableCharging(): Promise<void> {
    const input = await customPrompt('Disable charging until battery level reaches (% or mV) or for duration (e.g., 1h, 30m):', '70%');
    if (input && input.trim()) {
        try {
            await acc.disableCharging(input);
            await updateStatus();
        } catch (e) {
            printToNotify(`Disable charging failed: ${e}`,'ERROR');
        }
    }
}

/**
 * Handle enable charging
 */
async function handleEnableCharging(): Promise<void> {
    const input = await customPrompt('Enable charging to battery level (%) or for duration (e.g., 30m):', '80%');
    if (input && input.trim()) {
        try {
            await acc.enableCharging(input);
            await updateStatus();
        } catch (e) {
            printToNotify(`Enable charging failed: ${e}`,'ERROR');
        }
    }
}

/**
 * Handle force charge
 */
async function handleForceCharge(): Promise<void> {
    const capacity = await customPrompt('Force charge to battery level (%) or leave empty for 100%:', '100');
    if (capacity !== null) {
        try {
            await acc.forceCharging(capacity);
            await updateStatus();
        } catch (e) {
            printToNotify(`Force charge failed: ${e}`,'ERROR');
        }
    }
}

/**
 * Handle reset battery stats
 */
async function handleResetBatteryStats(): Promise<void> {
    if (await customConfirm('Are you sure you want to reset battery statistics?')) {
        try {
            const result = await acc.resetStats() || '';
            if (result.trim() === '✅') {
                printToNotify('Battery statistics reset successfully');
            } else {
                printToNotify('Battery statistics reset: ' + result.trim());
            }
            await updateStatus();
        } catch (e) {
            printToNotify(`Reset battery stats failed: ${e}`,'ERROR');
        }
    }
}

/**
 * Handle refresh button click - toggle auto refresh
 */
async function handleRefresh(): Promise<void> {
    const button = $('refresh-btn') as HTMLButtonElement | null;
    
    if (autoRefreshInterval !== null) {
        // Stop auto refresh
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        setButtonLoading(button, false);
        if(button)button.textContent='Refresh Status';
        logger.printToConsole('Auto refresh stopped');
    } else {
        // Start auto refresh
        setButtonLoading(button, false);
        if(button)button.textContent='Refreshing';
        logger.printToConsole('Auto refresh started (10s interval)');
        // await updateStatus();
        autoRefreshInterval = setInterval(updateStatus, 10000);
    }
}

/**
 * Handle restart accd
 */
async function handleRestart(): Promise<void> {
    try {
        await acc.restartAccd();
        await updateStatus();
    } catch (e) {
        printToNotify(`Restart failed: ${e}`,'ERROR');
    }
}

/**
 * Handle stop accd
 */
async function handleStop(): Promise<void> {
    try {
        await acc.stopAccd();
        await updateStatus();
    } catch (e) {
        printToNotify(`Stop failed: ${e}`,'ERROR');
    }
}

/**
 * Handle start accd
 */
async function handleStart(): Promise<void> {
    try {
        await acc.startAccd();
        await updateStatus();
    } catch (e) {
        printToNotify(`Start failed: ${e}`,'ERROR');
    }
}

/**
 * Handle detailed info toggle
 */
async function handleDetailedInfo(): Promise<void> {
    const panel = $('detailed-info-panel');
    const button = $('detailed-info-btn');
    if (panel && (panel.style.display === 'none' || !panel.style.display)) {
        try {
            const info = await acc.showInfo() || '';
            ($('detailed-info-content') as HTMLElement).textContent = info;
            panel.style.display = 'block';
            if (button) button.textContent = 'Hide Detailed Info';
            logger.printToConsole('Detailed battery info displayed');
        } catch (e) {
            printToNotify(`Failed to get detailed info: ${e}`,'ERROR');
        }
    } else if (panel) {
        panel.style.display = 'none';
        if (button) button.textContent = 'Detailed Battery Info';
    }
}

/**
 * Handle run test switches
 */
function handleRunTestSwitches(): void {
    const outputElement = $('test-switches-output');
    const runBtn = $('run-test-switches');
    const stopBtn = $('stop-test-switches');

    if (runBtn) runBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'inline-block';
    if (outputElement) outputElement.textContent = 'Starting switch test...\n\n⏳ This may take several minutes. Testing charging switches...\n\n';
}

/**
 * Handle stop test switches
 */
function handleStopTestSwitches(): void {
    const runBtn = $('run-test-switches');
    const stopBtn = $('stop-test-switches');
    if (runBtn) runBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';
    printToNotify('Test cancelled','ERROR');
}

/**
 * Handle close test switches modal
 */
function handleCloseTestSwitches(): void {
    const runBtn = $('run-test-switches');
    const stopBtn = $('stop-test-switches');
    if (runBtn) runBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';
    ($('test-switches-modal') as HTMLElement).style.display = 'none';
}


export {
    
    initializeStatusTab,
};
