// Status Tab - System status and battery information
import * as logger from '@/env/logger';
import * as acc from '@/commands/acc';
import * as acca from '@/commands/acca';
import { customPrompt } from '@/components/dialog';
import { customConfirm } from '@/components/confirm';
import * as base from '@/components/base';
import { LogLevel, setAccProfilePath } from '@/data/state';
import { checkBatteryCapacity } from '@/commands/command';

// Cached DOM elements
const elements = {
    batteryLevel: () => base.$('battery-level'),
    batteryBar: () => base.$('battery-bar'),
    chargingStatus: () => base.$('charging-status'),
    currentLimit: () => base.$('current-limit'),
    temperature: () => base.$('temperature'),
    powerDisplay: () => base.$('power-display'),
    chargeType: () => base.$('charge-type'),
    realLevel: () => base.$('real-level'),
};

let ProfilePanelName = "current-profile-status";

/**
 * Safely update element text content
 */
function setTextContent(getElement: () => HTMLElement | null, value: string): void {
    const el = getElement();
    if (el) el.textContent = value;
}

/**
 * Initialize status tab event listeners
 */
function initializeStatusTab(): void {
    base.setOnClick('battery-health-btn', handleBatteryHealth);
    base.setOnClick('test-switches-btn', handleTestSwitches);
    base.setOnClick('disable-charging-btn', handleDisableCharging);
    base.setOnClick('enable-charging-btn', handleEnableCharging);
    base.setOnClick('force-charge-btn', handleForceCharge);
    base.setOnClick('reset-battery-stats-btn', handleResetBatteryStats);
    base.setOnClick('refresh-btn', handleRefresh);
    base.setOnClick('restart-btn', handleRestart);
    base.setOnClick('stop-btn', handleStop);
    base.setOnClick('detailed-info-btn', handleDetailedInfo);

    // Test switches modal events
    base.setOnClick('run-test-switches', handleRunTestSwitches);
    base.setOnClick('stop-test-switches', handleStopTestSwitches);
    base.setOnClick('close-test-switches', handleCloseTestSwitches);

}


/**
 * 更新整个页面
 */
async function refreshStatus(): Promise<void> {
    if (!acc.getAccPath()) {
        logger.printToNotify('ACC not available', LogLevel.ERROR);
        return;
    }
    setTimeout(async () => {
        try {
            await base.checkAccdProfile(ProfilePanelName);

            const result = await acca.showInfo();
            const status = parseBatteryInfo(result.stdout);
            // Update battery level
            updateBatteryLevel(status);

            // Update other metrics
            setTextContent(elements.chargingStatus, status.status || '-');
            setTextContent(elements.currentLimit, status.current_now || '-');
            setTextContent(elements.temperature, status.temp || '-');
            setTextContent(elements.powerDisplay, status.power_now || '-');
            setTextContent(elements.chargeType, status.charge_type || 'N/A');
            setTextContent(elements.realLevel, status.real_level || 'N/A');
        } catch (e) {
            logger.printToConsole(`Status load failed: ${e}`, LogLevel.ERROR);
        }
    }, 0);


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
 * Handle refresh button click - toggle auto refresh
 */
function handleRefresh(button: base.ButtonWithAbort): void {
    base.activateWithAbort(
        button,
        async (btn) => {
            btn.textContent = 'Refreshing';
            logger.printToNotify('Auto refresh started (10s interval)');
            const controller = new AbortController();
            const intervalId = setInterval(refreshStatus, 10000);
            controller.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                btn.textContent = 'Refresh Status';
                logger.printToNotify('Auto refresh stopped');
            });
            return controller;
        }
    );
}
/**
 * Handle battery health check
 */
async function handleBatteryHealth(button: HTMLButtonElement): Promise<void> {
    let resutlt=await checkBatteryCapacity();
    let capacity='';
    if(resutlt.errno===0&&resutlt.stdout){
        capacity=(Number(resutlt.stdout) / 1000).toString();
    }
    const mAh = await customPrompt('Enter battery capacity in mAh (leave empty to auto-detect):',capacity);
    if (mAh !== null) {
        base.setButtonLoading(button, true);
        acc.printHealth(mAh).then((result => {
            if (result.errno !== 0) {
                logger.printToConsole(`acc -H error:\n${result.stderr}`);
                return;
            }
            const healthValue = result.stdout.trim();
            const span = base.$('battery-health');
            if (span) {
                span.textContent = healthValue;
                base.updateStatusClass(span, true);
            }
        })).catch((e => {
            logger.printToConsole(`Battery health check failed: ${e}`, LogLevel.ERROR);
        })).finally(() => {
            base.setButtonLoading(button, false);
        });
    }
}


/**
 * Handle disable charging
 */
async function handleDisableCharging(button: base.ButtonWithAbort): Promise<void> {
    let enableCharging = base.$('enable-charging-btn') as HTMLButtonElement;
    let forceCharging = base.$('force-charge-btn') as HTMLButtonElement;
    base.activateWithAbort(
        button,
        async (btn) => {
            // 未激活时弹出 prompt
            const input = await customPrompt('Disable charging until battery level reaches (% or mV) or for duration (e.g., 1h, 30m):', '70%');
            if (!input || !input.trim()) return null;
            const content = `Disable until ${input.trim()}`;
            if (enableCharging) enableCharging.style.visibility = 'hidden';
            if (forceCharging) forceCharging.style.visibility = 'hidden';
            btn.textContent = content;
            logger.printToNotify(content);
            const abortController = acc.disableChargingSpawn(input, {
                onStdout: (data) => logger.printToConsole(data),
                onStderr: (data) => logger.printToConsole(data, LogLevel.ERROR),
                onExit: (code) => {
                    logger.printToConsole(`Disable charging exited with code: ${code}`);
                },
                onError: (err) => {
                    logger.printToNotify(`Disable charging error: ${err}`, LogLevel.ERROR);
                }
            });
            abortController.signal.addEventListener('abort', () => {
                if (btn._abortController === abortController) {
                    btn._abortController = null;
                    btn.textContent = 'Disable charging';
                    if (enableCharging) enableCharging.style.visibility = 'visible';
                    if (forceCharging) forceCharging.style.visibility = 'visible';
                    logger.printToNotify('Disable charging stopped');
                }
            });
            return abortController;
        }
    );

}

/**
 * Handle enable charging
 */
async function handleEnableCharging(button: base.ButtonWithAbort): Promise<void> {
    let disableCharging = base.$('disable-charging-btn') as HTMLButtonElement;
    let forceCharging = base.$('force-charge-btn') as HTMLButtonElement;
    base.activateWithAbort(
        button,
        async (btn) => {
            const input = await customPrompt('Enable charging to battery level (%) or for duration (e.g., 30m):', '80%');
            if (!input || !input.trim()) return null;
            const content = `Enable until ${input.trim()}`;
            if (disableCharging) disableCharging.style.visibility = 'hidden';
            if (forceCharging) forceCharging.style.visibility = 'hidden';
            btn.textContent = content;
            logger.printToNotify(content);
            const abortController = acc.enableChargingSpawn(input, {
                onStdout: (data) => logger.printToConsole(data),
                onStderr: (data) => logger.printToConsole(data, LogLevel.ERROR),
                onExit: (code) => {
                    logger.printToConsole(`Enable charging exited with code: ${code}`);
                },
                onError: (err) => {
                    logger.printToNotify(`Enable charging error: ${err}`, LogLevel.ERROR);
                }
            });
            abortController.signal.addEventListener('abort', () => {
                if (btn._abortController === abortController) {
                    btn._abortController = null;
                    btn.textContent = 'Enable charging';
                    if (disableCharging) disableCharging.style.visibility = 'visible';
                    if (forceCharging) forceCharging.style.visibility = 'visible';
                    logger.printToNotify('Enable charging stopped');
                }
            });
            return abortController;
        }
    );
}

/**
 * Handle force charge
 */
async function handleForceCharge(button: base.ButtonWithAbort): Promise<void> {
    let disableCharging = base.$('disable-charging-btn') as HTMLButtonElement;
    let enableCharging = base.$('enable-charging-btn') as HTMLButtonElement;
    let restartBtn = base.$('restart-btn') as HTMLButtonElement;
    base.activateWithAbort(
        button,
        async (btn) => {
            const input = await customPrompt('Force charge to battery level (%) or leave empty for 100%:', '100');
            if (input === null) return null;
            const content = `Force charging to ${input.trim() || '100%'}`;
            if (disableCharging) disableCharging.style.visibility = 'hidden';
            if (enableCharging) enableCharging.style.visibility = 'hidden';
            if (restartBtn) restartBtn.style.visibility = 'hidden';
            btn.textContent = content;
            logger.printToNotify(content);
            const abortController = acc.forceChargingSpawn(input, {
                onStdout: (data) => logger.printToConsole(data),
                onStderr: (data) => logger.printToConsole(data, LogLevel.ERROR),
                onExit: (code) => {
                    if (code === 0) {
                        logger.printToNotify('Force charge start');
                    }
                    base.checkAccdProfile(ProfilePanelName);
                },
                onError: (err) => {
                    logger.printToNotify(`Force charge error: ${err}`, LogLevel.ERROR);
                }
            });
            abortController.signal.addEventListener('abort', () => {
                if (btn._abortController === abortController) {
                    btn._abortController = null;
                    btn.textContent = 'Force charge';
                    if (disableCharging) disableCharging.style.visibility = 'visible';
                    if (enableCharging) enableCharging.style.visibility = 'visible';
                    if (restartBtn) restartBtn.style.visibility = 'visible';
                    logger.printToNotify('Force charge stopped');
                    setAccProfilePath('');
                    acca.restartAccdSpawn({
                        onExit: () => base.checkAccdProfile(ProfilePanelName)
                    });
                }
            });
            return abortController;
        }
    );
}





/**
 * 
 * Handle restart accd 
 */
function handleRestart(button: base.ButtonWithAbort): void {
    base.setButtonLoading(button, true);
    acca.restartAccdSpawn({
        onExit: (code) => {
            logger.printToConsole(`Restart accd exited with code: ${code}`);
            if (code === 0) {
            } else {
                logger.printToNotify(`accd restart failed with code: ${code}`, LogLevel.ERROR);
            }
            base.setButtonLoading(button, false);
            base.checkAccdProfile(ProfilePanelName);
        },
    });

}

/**
 * Handle stop accd
 */
function handleStop(button: HTMLButtonElement): void {
    base.setButtonLoading(button, true);
    acca.stopAccdSpawn({
        onExit: (code) => {
            logger.printToConsole(`Stop accd exited with code: ${code}`);
            if (code === 0) {
            } else {
                logger.printToNotify(`accd stop failed with code: ${code}`, LogLevel.ERROR);
            }
            base.setButtonLoading(button, false);
            base.checkAccdProfile(ProfilePanelName);
        },
    });
}


/**
 * Handle detailed info toggle
 */
async function handleDetailedInfo(button: HTMLButtonElement): Promise<void> {
    const panel = base.$('detailed-info-panel');
    if (panel && (panel.style.display === 'none' || !panel.style.display)) {
        try {
            const result = await acca.showInfo();
            const info = result?.stdout || '';
            const content = base.$('detailed-info-content');
            if (content) content.textContent = info;
            panel.style.display = 'block';
            button.textContent = 'Hide Detailed Info';
        } catch (e) {
            logger.printToNotify(`Failed to get detailed info: ${e}`, LogLevel.ERROR);
        }
    } else if (panel) {
        panel.style.display = 'none';
        button.textContent = 'Detailed Battery Info';
    }
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
                logger.printToNotify('Battery statistics reset successfully');
            } else {
                logger.printToNotify('Battery statistics reset: ' + resultStr.trim());
            }
        } catch (e) {
            logger.printToNotify(`Reset battery stats failed: ${e}`, LogLevel.ERROR);
        }
    }
}

/**
 * Handle test switches button click
 */
function handleTestSwitches(): void {
    const modal = base.$('test-switches-modal');
    const output = base.$('test-switches-output');
    if (modal) modal.style.display = 'block';
    if (output) output.textContent = 'Click "Run Test" to start testing charging switches...\n\nThis may take several minutes. Ensure charger is plugged in.\n';
}
/**
 * Handle close test switches modal
 */
function handleCloseTestSwitches(): void {
    const stopBtn = base.$('stop-test-switches') as HTMLButtonElement;
    if (stopBtn) handleStopTestSwitches(stopBtn);
    const modal = base.$('test-switches-modal');
    if (modal) modal.style.display = 'none';
}

// Test switches abort controller
let testSwitchesAbortController: AbortController | null = null;

/**
 * Handle run test switches
 */
function handleRunTestSwitches(runBtn: HTMLButtonElement): void {
    const stopBtn = base.$('stop-test-switches') as HTMLButtonElement;
    const outputElement = base.$('test-switches-output');

    if (stopBtn) stopBtn.style.display = 'inline-block';
    runBtn.style.display = 'none';

    if (outputElement) {

        testSwitchesAbortController = acc.testSwitch({
            onStdout: (data) => {
                outputElement.textContent += data + '\n\n';
                outputElement.scrollTop = outputElement.scrollHeight;
            },
            onStderr: (data) => {
                outputElement.textContent += data + '\n\n';
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
    const runBtn = base.$('run-test-switches');
    if (runBtn) runBtn.style.display = '';
    stopBtn.style.display = 'none';

    if (testSwitchesAbortController) {
        testSwitchesAbortController.abort();
        testSwitchesAbortController = null;
    }
    const outputElement = base.$('test-switches-output');
    if (outputElement) {
        outputElement.textContent += `\n\nTest cancelled`;
    }
}



export {
    initializeStatusTab,
    refreshStatus,
};
