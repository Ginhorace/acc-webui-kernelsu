// Status Tab - System status and battery information
import * as logger from '@/env/logger';
import * as acc from '@/commands/acc';
import * as acca from '@/commands/acca';
import * as command from '@/commands/command';

import { customPrompt } from '@/components/dialog';
import { customConfirm } from '@/components/confirm';
import { $, setOnClick, setButtonLoading, updateStatusClass, activateWithAbort, ButtonWithAbort, setProfilePanel, isForceCharging } from '@/components/base';
import { getAccProfilePath, setAccProfilePath, LogLevel } from '@/data/state';
import { defaultConfigPath } from '@/config/setting';

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

let ProfilePanelName = "current-profile-status";
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
    setOnClick('detailed-info-btn', handleDetailedInfo);

    // Test switches modal events
    setOnClick('run-test-switches', handleRunTestSwitches);
    setOnClick('stop-test-switches', handleStopTestSwitches);
    setOnClick('close-test-switches', handleCloseTestSwitches);

}


/**
 * 更新整个页面
 */
async function refreshStatus(): Promise<void> {
    if (!acc.getAccPath()) {
        logger.printToConsole('ACC path not available for status update', LogLevel.ERROR);
        return;
    }

    try {
        await checkAccdProfile()

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

        logger.printToConsole('Status refreshed');
    } catch (e) {
        logger.printToNotify(`Status load failed: ${e}`, LogLevel.ERROR);
        const el = elements.daemonStatus();
        if (el) {
            el.textContent = 'Stop';
            updateStatusClass(el, false);
        }
    }
}
async function checkAccdProfile() {
    // Update daemon status
    await updateDaemonStatus();
    //todo 替换updateDaemonStatus，删除daemonStatus
    const configResult = await command.checkAccdProfile();
    if (configResult.errno === 0) {
        let currentProfile = configResult.stdout ? defaultConfigPath : configResult.stdout;
        setAccProfilePath(configResult.stdout);
        setProfilePanel(ProfilePanelName, currentProfile);
    }
    else {
        setAccProfilePath('is not running');
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
 * Handle refresh button click - toggle auto refresh
 */
function handleRefresh(button: ButtonWithAbort): void {
    activateWithAbort(
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
    ///当没有输入数字时，其实没有自动检测，如果想检测可以到/sys/class/power_supply/*/charge_full_design，或者是/sys/class/power_supply/battery/uevent，找到POWER_SUPPLY_CHARGE_FULL_DESIGN 结果值/1000就是
    const mAh = await customPrompt('Enter battery capacity in mAh (leave empty to auto-detect):');
    if (mAh !== null) {
        setButtonLoading(button, true);
        acc.printHealth(mAh).then((result => {
            if (result.errno !== 0) {
                logger.printToConsole(`acc -H error:\n${result.stderr}`);
                return;
            }
            const healthValue = result.stdout.trim();
            const span = $('battery-health');
            if (span) {
                span.textContent = healthValue;
                updateStatusClass(span, true);
                logger.printToNotify('Battery health: ' + healthValue);
            }
        })).catch((e => {
            logger.printToNotify(`Battery health check failed: ${e}`, LogLevel.ERROR);
        })).finally(() => {
            setButtonLoading(button, false);
        });
    }
}


/**
 * Handle disable charging
 */
async function handleDisableCharging(button: ButtonWithAbort): Promise<void> {
    let enableCharging = $('enable-charging-btn') as HTMLButtonElement;
    let forceCharging = $('force-charge-btn') as HTMLButtonElement;
    activateWithAbort(
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
async function handleEnableCharging(button: ButtonWithAbort): Promise<void> {
    let disableCharging = $('disable-charging-btn') as HTMLButtonElement;
    let forceCharging = $('force-charge-btn') as HTMLButtonElement;
    activateWithAbort(
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
async function handleForceCharge(button: ButtonWithAbort): Promise<void> {
    let disableCharging = $('disable-charging-btn') as HTMLButtonElement;
    let enableCharging = $('enable-charging-btn') as HTMLButtonElement;
    activateWithAbort(
        button,
        async (btn) => {
            const input = await customPrompt('Force charge to battery level (%) or leave empty for 100%:', '100');
            if (input === null) return null;
            const content = `Force charging to ${input.trim() || '100%'}`;
            if (disableCharging) disableCharging.style.visibility = 'hidden';
            if (enableCharging) enableCharging.style.visibility = 'hidden';
            btn.textContent = content;
            logger.printToNotify(content);
            let result = await acc.forceCharging();
            if (result.errno === 0) {
                const abortController = new AbortController();
                abortController.signal.addEventListener('abort', () => {
                    if (btn._abortController === abortController) {
                        btn._abortController = null;
                        btn.textContent = 'Force charge';
                        if (disableCharging) disableCharging.style.visibility = 'visible';
                        if (enableCharging) enableCharging.style.visibility = 'visible';
                        logger.printToNotify('Force charge stopped');
                        //todo top accd then delete $TMPDIR/.acc-f-config
                        acca.restartAccdSpawn(defaultConfigPath, {
                            onExit: () => refreshStatus()
                        });
                    }
                });
                return abortController;
            }
            else return null;
        }
    );
}





/**
 * todo 可能会删除在profile界面启动
 * Handle restart accd 
 */
function handleRestart(button: ButtonWithAbort): void {
    setButtonLoading(button, true);
    let currentProfile = getAccProfilePath();
    acca.restartAccdSpawn(isForceCharging(currentProfile) ? '' : currentProfile, {
        onExit: (code) => {
            logger.printToConsole(`Restart accd exited with code: ${code}`);
            if (code === 0) {
                logger.printToNotify('accd restarted successfully');
            } else {
                logger.printToNotify(`accd restart failed with code: ${code}`, LogLevel.ERROR);
            }
            setButtonLoading(button, false);
            refreshStatus();
        },
    });

}

/**
 * Handle stop accd
 */
function handleStop(button: HTMLButtonElement): void {
    setButtonLoading(button, true);
    acca.stopAccdSpawn({
        onExit: (code) => {
            logger.printToConsole(`Stop accd exited with code: ${code}`);
            if (code === 0) {
                logger.printToNotify('accd stopped successfully');
            } else {
                logger.printToNotify(`accd stop failed with code: ${code}`, LogLevel.ERROR);
            }
            setButtonLoading(button, false);
            refreshStatus();
        },
    });
}


/**
 * Handle detailed info toggle
 */
async function handleDetailedInfo(button: HTMLButtonElement): Promise<void> {
    const panel = $('detailed-info-panel');
    if (panel && (panel.style.display === 'none' || !panel.style.display)) {
        try {
            const result = await acca.showInfo();
            const info = result?.stdout || '';
            const content = $('detailed-info-content');
            if (content) content.textContent = info;
            panel.style.display = 'block';
            button.textContent = 'Hide Detailed Info';
            logger.printToConsole('Detailed battery info displayed');
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
            await refreshStatus();
        } catch (e) {
            logger.printToNotify(`Reset battery stats failed: ${e}`, LogLevel.ERROR);
        }
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
    refreshStatus,
};
