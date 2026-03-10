// Status Tab - System status and battery information
import * as logger from '../config/logger';
import * as acc from '../commands/acc';
import { printToNotify } from '../config/logger';
import { customPrompt } from './dialog';
import { customConfirm } from './confirm';
import { $, setOnClick, setButtonLoading, updateStatusClass, toggleButton, ButtonWithAbort } from './base';

// Cached DOM elements
const elements = {
    daemonStatus: () => $('daemon-status'),
    batteryLevel: () => $('battery-level'),
    batteryBar: () => $('battery-bar'),
    chargingStatus: () => $('charging-status'),
    currentLimit: () => $('current-limit'),
    temperature: () => $('temperature'),
    powerDisplay: () => $('power-display'),
    chargeType: () => $('charge-type'),
    realLevel: () => $('real-level'),
};
/**
 * Safely update element text content
 */
function setTextContent(getElement: () => HTMLElement | null, value: string): void {
    const el = getElement();
    if (el) el.textContent = value;
}


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
        const result = await acc.showInfo();
        if (result.errno !== 0) {
            logger.printToConsole(`acc -i error:\n${result.stderr}`);
            return;
        }
        const status = parseBatteryInfo(result.stdout);

        // Update daemon status
        await updateDaemonStatus();

        // Update battery level
        updateBatteryLevel(status);

        // Update other metrics
        setTextContent(elements.chargingStatus, status.status || '-');
        setTextContent(elements.currentLimit, status.current_now || '-');
        setTextContent(elements.temperature, status.temp || '-');
        setTextContent(elements.powerDisplay, status.power_now || '-');
        setTextContent(elements.chargeType, status.charge_type || 'N/A');
        setTextContent(elements.realLevel, status.real_level || 'N/A');

        logger.printToConsole('Status refreshed');
    } catch (e) {
        printToNotify(`Status load failed: ${e}`, 'ERROR');
        const el = elements.daemonStatus();
        if (el) {
            el.textContent = 'Stop';
            updateStatusClass(el, false);
        }
    }
}



/**
 * Parse battery info output into key-value map
 */
function parseBatteryInfo(output: string): Record<string, string> {
    const status: Record<string, string> = {};
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
        // Try colon/equals separator first (key: value or key=value)
        const m = line.match(/^\s*([a-zA-Z0-9_\-]+)\s*[:=]\s*(.+)$/);
        if (m) {
            status[m[1]] = m[2].trim();
            continue;
        }
        // Fallback to space separator (key value)
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            status[parts[0]] = parts.slice(1).join(' ');
        }
    }
    return status;
}

/**
 * Update battery level display
 */
function updateBatteryLevel(status: Record<string, string>): void {
    const raw = status.level || status.capacity || '0';
    const batteryLevel = raw.toString().replace('%', '').replace(/[^0-9]/g, '') || '0';

    setTextContent(elements.batteryLevel, batteryLevel + '%');
    const batteryBar = elements.batteryBar();
    if (batteryBar) {
        batteryBar.style.setProperty('--battery-level', batteryLevel + '%');
    }
}


/**
 * Update daemon status display
 */
async function updateDaemonStatus(): Promise<boolean> {
    const el = elements.daemonStatus();
    const result = await acc.checkAccd();

    //todo 与strings有关
    let isRunning = result.stdout.includes('PID');
    if (el) {
        el.textContent = isRunning ? 'Running' : 'Stop';
        updateStatusClass(el, isRunning);
    }
    return isRunning;
}


/**
 * Handle battery health check
 */
async function handleBatteryHealth(button: HTMLButtonElement): Promise<void> {
    try {
        setButtonLoading(button, true);
        ///当没有输入数字时，其实没有自动检测，如果想检测可以到/sys/class/power_supply/*/charge_full_design，或者是/sys/class/power_supply/battery/uevent，找到POWER_SUPPLY_CHARGE_FULL_DESIGN 结果值/1000就是
        const mAh = await customPrompt('Enter battery capacity in mAh (leave empty to auto-detect):');
        if (mAh !== null) {
            const result = await acc.printHealth(mAh);
            if (result.errno !== 0) {
                logger.printToConsole(`acc -H error:\n${result.stderr}`);
                return;
            }
            const healthValue = result.stdout.trim();
            const span = $('battery-health');
            if (span) {
                span.textContent = healthValue;
                updateStatusClass(span, true);
                printToNotify('Battery health: ' + healthValue);
            }
        }
    } catch (e) {
        printToNotify(`Battery health check failed: ${e}`, 'ERROR');
    } finally {
        setButtonLoading(button, false);
    }
}


/**
 * Handle disable charging
 */
async function handleDisableCharging(button: ButtonWithAbort): Promise<void> {
    let enableCharging = $('enable-charging-btn') as HTMLButtonElement;
    let forceCharging = $('force-charge-btn') as HTMLButtonElement;
    toggleButton(
        button,
        async (btn) => {
            // 未激活时弹出 prompt
            const input = await customPrompt('Disable charging until battery level reaches (% or mV) or for duration (e.g., 1h, 30m):', '70%');
            if (!input || !input.trim()) return null;
            const content = `Disable until ${input.trim()}`;
            if (enableCharging) enableCharging.disabled = true;
            if (forceCharging) forceCharging.disabled = true;
            btn.textContent = content;
            logger.printToNotify(content);
            const abortController = acc.disableChargingSpawn(input, {
                onStdout: (data) => logger.printToConsole(data),
                onStderr: (data) => logger.printToConsole(data, 'ERROR'),
                onExit: (code) => {
                    logger.printToNotify(`Disable charging exited with code: ${code}`);
                },
                onError: (err) => {
                    printToNotify(`Disable charging error: ${err}`, 'ERROR');
                }
            });
            abortController.signal.addEventListener('abort', () => {
                if (btn._abortController === abortController) {
                    btn._abortController = null;
                    btn.textContent = 'Disable charging';
                    if (enableCharging) enableCharging.disabled = false;
                    if (forceCharging) forceCharging.disabled = false;
                    logger.printToNotify('Disable charging stopped');
                }
            });
            return abortController;
        },
        (btn) => {
            btn.textContent = 'Disable charging';
            logger.printToNotify('Disable charging stopped');
        }
    );

}

/**
 * Handle enable charging
 */
async function handleEnableCharging(button: ButtonWithAbort): Promise<void> {
    let disableCharging = $('disable-charging-btn') as HTMLButtonElement;
    let forceCharging = $('force-charge-btn') as HTMLButtonElement;
    toggleButton(
        button,
        async (btn) => {
            const input = await customPrompt('Enable charging to battery level (%) or for duration (e.g., 30m):', '80%');
            if (!input || !input.trim()) return null;
            const content = `Enable until ${input.trim()}`;
            if (disableCharging) disableCharging.disabled = true;
            if (forceCharging) forceCharging.disabled = true;
            btn.textContent = content;
            logger.printToNotify(content);
            const abortController = acc.enableChargingSpawn(input, {
                onStdout: (data) => logger.printToConsole(data),
                onStderr: (data) => logger.printToConsole(data, 'ERROR'),
                onExit: (code) => {
                    logger.printToNotify(`Enable charging exited with code: ${code}`);
                },
                onError: (err) => {
                    printToNotify(`Enable charging error: ${err}`, 'ERROR');
                }
            });
            abortController.signal.addEventListener('abort', () => {
                if (btn._abortController === abortController) {
                    btn._abortController = null;
                    btn.textContent = 'Enable charging';
                    if (disableCharging) disableCharging.disabled = false;
                    if (forceCharging) forceCharging.disabled = false;
                    logger.printToNotify('Enable charging stopped');
                }
            });
            return abortController;
        },
        (btn) => {
            btn.textContent = 'Enable charging';
            logger.printToNotify('Enable charging stopped');
        }
    );
}

/**
 * Handle force charge
 */
async function handleForceCharge(button: ButtonWithAbort): Promise<void> {
    let disableCharging = $('disable-charging-btn') as HTMLButtonElement;
    let enableCharging = $('enable-charging-btn') as HTMLButtonElement;
    toggleButton(
        button,
        async (btn) => {
            const input = await customPrompt('Force charge to battery level (%) or leave empty for 100%:', '100');
            if (input === null) return null;
            const content = `Force charging to ${input.trim() || '100%'}`;
            if (disableCharging) disableCharging.disabled = true;
            if (enableCharging) enableCharging.disabled = true;
            btn.textContent = content;
            logger.printToNotify(content);
            let result = await acc.forceCharging();
            if (result.errno === 0) {
                const abortController = new AbortController();
                abortController.signal.addEventListener('abort', () => {
                    if (btn._abortController === abortController) {
                        btn._abortController = null;
                        btn.textContent = 'Force charge';
                        if (disableCharging) disableCharging.disabled = false;
                        if (enableCharging) enableCharging.disabled = false;
                        logger.printToNotify('Force charge stopped');
                    }
                });
                return abortController;
            }
            else return null;
        },
        async (btn) => {
            await acc.restartAccd();
            btn.textContent = 'Force charge';
            logger.printToNotify('Force charge stopped');
        }
    );
}

/**
 * Handle reset battery stats
 */
async function handleResetBatteryStats(): Promise<void> {
    if (await customConfirm('Are you sure you want to reset battery statistics?')) {
        try {
            const result = await acc.resetStats();
            const resultStr = result?.stdout || '';
            if (resultStr.trim() === '✅') {
                printToNotify('Battery statistics reset successfully');
            } else {
                printToNotify('Battery statistics reset: ' + resultStr.trim());
            }
            await updateStatus();
        } catch (e) {
            printToNotify(`Reset battery stats failed: ${e}`, 'ERROR');
        }
    }
}



/**
 * Handle refresh button click - toggle auto refresh
 */
function handleRefresh(button: ButtonWithAbort): void {
    toggleButton(
        button,
        async (btn) => {
            btn.textContent = 'Refreshing';
            logger.printToNotify('Auto refresh started (10s interval)');
            const controller = new AbortController();
            const intervalId = setInterval(updateStatus, 10000);
            controller.signal.addEventListener('abort', () => clearInterval(intervalId));
            return controller;
        },
        (btn) => {
            btn.textContent = 'Refresh Status';
            logger.printToNotify('Auto refresh stopped');
        }
    );
}

/**
 * Handle restart accd
 */
async function handleRestart(): Promise<void> {
    try {
        await acc.restartAccd();
        await updateStatus();
    } catch (e) {
        printToNotify(`Restart failed: ${e}`, 'ERROR');
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
        printToNotify(`Stop failed: ${e}`, 'ERROR');
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
        printToNotify(`Start failed: ${e}`, 'ERROR');
    }
}

/**
 * Handle detailed info toggle
 */
async function handleDetailedInfo(button: HTMLButtonElement): Promise<void> {
    const panel = $('detailed-info-panel');
    if (panel && (panel.style.display === 'none' || !panel.style.display)) {
        try {
            const result = await acc.showInfo();
            const info = result?.stdout || '';
            const content = $('detailed-info-content');
            if (content) content.textContent = info;
            panel.style.display = 'block';
            button.textContent = 'Hide Detailed Info';
            logger.printToConsole('Detailed battery info displayed');
        } catch (e) {
            printToNotify(`Failed to get detailed info: ${e}`, 'ERROR');
        }
    } else if (panel) {
        panel.style.display = 'none';
        button.textContent = 'Detailed Battery Info';
    }
}
/**
 * Handle test switches button click
 */
function handleTestSwitches(): void {
    //todo
    const modal = $('test-switches-modal');
    const output = $('test-switches-output');
    if (modal) modal.style.display = 'block';
    if (output) output.textContent = 'Click "Run Test" to start testing charging switches...\n\nThis may take several minutes. Ensure charger is plugged in.\n';
}
/**
 * Handle close test switches modal
 */
function handleCloseTestSwitches(): void {
    const stopBtn = $('stop-test-switches') as HTMLButtonElement;
    if (stopBtn) handleStopTestSwitches(stopBtn);
    const modal = $('test-switches-modal');
    if (modal) modal.style.display = 'none';
}

// Test switches abort controller
let testSwitchesAbortController: AbortController | null = null;

/**
 * Handle run test switches
 */
function handleRunTestSwitches(runBtn: HTMLButtonElement): void {
    const stopBtn = $('stop-test-switches') as HTMLButtonElement;
    const outputElement = $('test-switches-output');

    if (stopBtn) stopBtn.style.display = 'inline-block';
    runBtn.style.display = 'none';

    if (outputElement) {
        outputElement.textContent = 'Starting switch test...\n\n';

        testSwitchesAbortController = acc.testSwitch({
            onStdout: (data) => {
                outputElement.textContent += data;
                outputElement.scrollTop = outputElement.scrollHeight;
            },
            onStderr: (data) => {
                outputElement.textContent += data;
                outputElement.scrollTop = outputElement.scrollHeight;
            },
            onExit: (code) => {
                outputElement.textContent += `\n\nTest completed with exit code: ${code}`;
                if (stopBtn) stopBtn.style.display = 'none';
                runBtn.style.display = '';
                testSwitchesAbortController = null;
            },
            onError: (err) => {
                outputElement.textContent += `\n\nError: ${err}`;
                if (stopBtn) stopBtn.style.display = 'none';
                runBtn.style.display = '';
                testSwitchesAbortController = null;
            }
        });
    }
}

/**
 * Handle stop test switches
 */
function handleStopTestSwitches(stopBtn: HTMLButtonElement): void {
    const runBtn = $('run-test-switches');
    if (runBtn) runBtn.style.display = '';
    stopBtn.style.display = 'none';

    if (testSwitchesAbortController) {
        testSwitchesAbortController.abort();
        testSwitchesAbortController = null;
    }
    const outputElement = $('test-switches-output');
    if (outputElement) {
        outputElement.textContent += `\n\nTest cancelled`;
    }
}



export {

    initializeStatusTab,
};
