import { checkKSUEnvironment } from './ksu.js';
import { initLogDirectory,showNotification,hideNotification,printLogToConsole, printLogToFile,  getRecentLogs, clearLogs } from './logger.js';
import { checkAccd,checkId,showReadme,showLogTail} from './command.js'
import { execAccAndLog, getAccPath, getAccVersion, initAccPath } from './acc.js';

import { customPrompt } from './dialog.js'; 
import { initializeConfigUI } from './config.js'

// Shorthand for document.getElementById
function $(id) {
    return document.getElementById(id);
}
function setButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function updateStatusClass(element, value) {
    if (!element) return;
    element.classList.remove('status-good', 'status-bad');
    const val = value.toString().toLowerCase();
    if (val.includes('running') || val.includes('ok') || val.includes('charging') || val.includes('uid=0')) {
        element.classList.add('status-good');
    } else if (val.includes('error') || val.includes('failed') || val.includes('not') || val.includes('stop')) {
        element.classList.add('status-bad');
    }
}

function hideLoadingOverlay() {
    const overlay = $('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}





async function updateStatus() {
    if (!getAccPath()) {
        printLogToFile("ACC path not available for status update", 'ERROR');
        return;
    }

    try {
        const output = await execAccAndLog(['-i']);
        printLogToFile(`Raw acc -i output:\n${output}`, 'DEBUG');

        const lines = (output || '').split('\n').filter(line => line.trim());
        const status = {};

        // Parse battery info output more reliably
        lines.forEach(line => {
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
            // Quick check without blocking too long
            await checkAccd();
            $('daemon-status').textContent = 'Running';
        } catch (e) {
            $('daemon-status').textContent = 'Stop';
        }
        updateStatusClass($('daemon-status'), $('daemon-status').textContent);

        // Battery level - extract from "level 75%" format or raw number
        let batteryLevel = '0';
        if (status.level) {
            batteryLevel = status.level.toString().replace('%', '').replace(/[^0-9]/g, '');
        } else if (status.capacity) {
            batteryLevel = status.capacity.toString().replace('%', '').replace(/[^0-9]/g, '');
        }

        $('battery-level').textContent = batteryLevel + '%';
        const batteryBar = $('battery-bar');
        if (batteryBar) {
            batteryBar.style.setProperty('--battery-level', batteryLevel + '%');
        }

        // Charging status
        $('charging-status').textContent = status.status || '-';
        updateStatusClass($('charging-status'), $('charging-status').textContent);

        // Current - handle "1.23A" format
        const currentNow = status.current_now || '-';
        $('current-limit').textContent = currentNow;

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



        hideNotification();
        printLogToFile("Status refreshed", 'INFO');
    } catch (e) {
        showNotification(`Status load failed: ${e}`, 'error');
        $('daemon-status').textContent = 'Stop';
        updateStatusClass($('daemon-status'), 'Stop');
    }
}

async function verifySystem() {
    printLogToConsole("Starting system verification...", 'INFO');
    // Attach to window for config.js to wrap
    window.verifySystem = verifySystem;

    // Show loading state immediately
    $('root-status').textContent = 'Checking...';
    $('acc-install-status').textContent = 'Checking...';

    try {
        printLogToConsole("Checking root access...", 'INFO');
        //执行命令id，获取uid=0(root) gid=0(root) groups=0(root) context=u:r:magisk:s0
        const idResult = await checkId();
        printLogToConsole(`Root check result: ${idResult}`, 'INFO');

        $('root-status').textContent =
            idResult.includes('uid=0') ? 'Root access OK' : 'Root access failed';
        updateStatusClass($('root-status'), idResult);

        if (!idResult.includes('uid=0')) {
            hideLoadingOverlay();
            throw new Error("Root access not granted");
        }

        printLogToConsole("Root access OK, checking ACC installation...", 'INFO');
        const accPath = getAccPath();
        const version = getAccVersion();
        $('acc-install-status').textContent = `Found at ${accPath}`;
        $('acc-version').textContent = version;
        updateStatusClass($('acc-install-status'), 'OK');
        updateStatusClass($('acc-version'), version);

        $('control-panel').style.display = 'block';
        $('config-panel').style.display = 'block';
        $('log-panel').style.display = 'block';
        $('maintenance-panel').style.display = 'block';
        $('settings-panel').style.display = 'block';

        printLogToConsole("Initializing UI (non-blocking)...", 'INFO');

        // Initialize UI without awaiting - let it load in background
        initializeUI(path).catch(e => {
            showNotification(`UI initialization error: ${e}`, 'ERROR');
        });

        // Hide loading overlay after a short delay to ensure UI is visible
        setTimeout(hideLoadingOverlay, 500);

        printLogToConsole("System verification completed successfully", 'INFO');
        return;
    } catch (e) {
        showNotification(`System verification failed: ${e}`, 'ERROR');
        updateStatusClass($('root-status'), 'Failed');
        updateStatusClass($('acc-install-status'), 'Failed');
        hideLoadingOverlay();
    }
}

async function loadLogs() {
    try {
        const logs = await getRecentLogs(100);
        $('log-display').textContent = logs;
        $('log-display').scrollTop = $('log-display').scrollHeight;
        printLogToFile("Logs viewed", 'INFO');
    } catch (e) {
        $('log-display').textContent = `Error loading logs: ${e}`;
        printLogToFile(`Log load error: ${e}`, 'ERROR');
    }
}

async function initializeUI(accPath) {
    printLogToFile(`Initializing with ACC path: ${accPath}`, 'INFO');

    ///不启用是因为用户是可以手动关闭accd的
    // Don't block UI initialization if daemon check fails
    // ensureAccdRunning(accPath).catch(e => {
    //     showError("Daemon may not be running. Some features may not work. Try manually starting accd.", 'warn');
    // });

    const batteryHealthBtn = $('battery-health-btn');
    const testSwitchesBtn = $('test-switches-btn');
    const disableChargingBtn = $('disable-charging-btn');
    const enableChargingBtn = $('enable-charging-btn');
    const forceChargeBtn = $('force-charge-btn');
    const resetBatteryStatsBtn = $('reset-battery-stats-btn');
    const refreshBtn = $('refresh-btn');
    const restartBtn = $('restart-btn');
    const stopBtn = $('stop-btn');
    const startBtn = $('start-btn');
    const refreshLogsBtn = $('refresh-logs-btn');
    const exportLogsBtn = $('export-logs-btn');
    const clearLogsBtn = $('clear-logs-btn');
    const upgradeBtn = $('upgrade-btn');
    const uninstallBtn = $('uninstall-btn');
    const rollbackBtn = $('rollback-btn');
    const versionBtn = $('version-btn');
    const detailedInfoBtn = $('detailed-info-btn');
    const readmeBtn = $('readme-btn');
    const logtailBtn = $('logtail-btn');

    async function loadConfig() {
        try {
            const config = await execAccAndLog(['-s']);
            const configLines = config.split('\n').filter(l => l.trim());
            const configMap = {};

            configLines.forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    configMap[match[1].trim()] = match[2].trim();
                }
            });

            const chargeLimit = configMap.pause_capacity || configMap.capacity || '-';
            const resumeCharge = configMap.resume_capacity || '-';
            const pauseAt = `${chargeLimit}%`;

            $('charge-limit').textContent = chargeLimit + (chargeLimit !== '-' ? '%' : '');
            $('resume-charge').textContent = resumeCharge + (resumeCharge !== '-' ? '%' : '');
            $('pause-at').textContent = pauseAt;

            printLogToFile("Config loaded", 'INFO');
        } catch (e) {
            printLogToFile(`Config error: ${e}`, 'ERROR');
        }
    }

    batteryHealthBtn.addEventListener('click', async () => {
        try {
            setButtonLoading(batteryHealthBtn, true);
            const mAh = await customPrompt("Enter battery capacity in mAh (leave empty to auto-detect):");
            const args = ['-H'];
            if (mAh && mAh.trim()) {
                args.push(mAh.trim());
            }
            const health = await execAccAndLog(args);
            const healthValue = health.trim();
            ///当没有输入数字时，其实没有自动检测，如果想检测可以到/sys/class/power_supply/*/charge_full_design，或者是/sys/class/power_supply/battery/uevent，找到POWER_SUPPLY_CHARGE_FULL_DESIGN 结果值/1000就是
            if (healthValue === '!') {
                $('battery-health').textContent = 'Unable to calculate (missing counter data)';
                updateStatusClass($('battery-health'), 'Error');
                showNotification("Battery health check failed: missing charge counter data", 'error');
            } else {
                $('battery-health').textContent = healthValue;
                updateStatusClass($('battery-health'), 'OK');
                showNotification("Battery health: " + healthValue, 'success');
            }
            printLogToFile("Battery health checked", 'INFO');
        } catch (e) {
            showNotification(`Battery health check failed: ${e}`);
            $('battery-health').textContent = 'Error';
            updateStatusClass($('battery-health'), 'Error');
        } finally {
            setButtonLoading(batteryHealthBtn, false);
        }
    });

    testSwitchesBtn.addEventListener('click', () => {
        $('test-switches-modal').style.display = 'block';
        //todo 这种默认状态需要在停止测试后改回来
        $('test-switches-output').textContent = 'Click "Run Test" to start testing charging switches...\n\nThis may take several minutes. Ensure charger is plugged in.\n';
    });

    /**
     * -d|--disable [#%, #s, #m, #h or #mv (optional)]   Disable charging是用了sleep来实现的，所以要想管理需要手动启停exec
     */
    disableChargingBtn.addEventListener('click', async () => {
        const input = prompt("Disable charging until battery level reaches (% or mV) or for duration (e.g., 1h, 30m):", "70%");
        if (input && input.trim()) {
            try {
                await execAccAndLog(['-d', input.trim()]);
                showNotification("Charging disabled until " + input.trim(), 'success');
                setTimeout(hideNotification, 3000);
                await loadStatus();
            } catch (e) {
                showNotification(`Disable charging failed: ${e}`);
            }
        }
    });

    /**
     * -e|--enable [#%, #s, #m, #h or #mv (optional)]   Enable charging 同样使用了sleep控制，所以依旧需要手动启停exec
     */
    enableChargingBtn.addEventListener('click', async () => {
        const input = prompt("Enable charging to battery level (%) or for duration (e.g., 30m):", "80%");
        if (input && input.trim()) {
            try {
                await execAccAndLog(['-e', input.trim()]);
                showNotification("Charging enabled to " + input.trim(), 'success');
                setTimeout(hideNotification, 3000);
                await loadStatus();
            } catch (e) {
                showNotification(`Enable charging failed: ${e}`);
            }
        }
    });
    /**
     * -f|--force|--full [capacity] [-a] [additional opts/args]   Charge once to a given capacity (default: 100%), without restrictions强制充电是通过更改正在使用的config实现的，所以想要关掉需要重启accd
     */
    forceChargeBtn.addEventListener('click', async () => {
        const capacity = prompt("Force charge to battery level (%) or leave empty for 100%:", "100");
        if (capacity !== null) { // Allow empty string for default 100%
            try {
                const args = ['-f'];
                if (capacity && capacity.trim()) {
                    args.push(capacity.trim());
                }
                await execAccAndLog(args);
                const target = capacity && capacity.trim() ? capacity.trim() : "100%";
                showNotification("Force charging to " + target + " initiated", 'success');
                setTimeout(hideNotification, 3000);
                await loadStatus();
            } catch (e) {
                showNotification(`Force charge failed: ${e}`);
            }
        }
    });
    /**
     * -R|--resetbs   Reset battery stats使用了dumpsys batterystats --reset重置系统的电池统计数据 todoconfirm失效
     */
    resetBatteryStatsBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to reset battery statistics?")) {
            try {
                const result = await execAccAndLog(['-R']);
                if (result.trim() === '✅') {
                    showNotification("Battery statistics reset successfully", 'success');
                } else {
                    showNotification("Battery statistics reset: " + result.trim(), 'success');
                }
                setTimeout(hideNotification, 3000);
                await loadStatus();
            } catch (e) {
                showNotification(`Reset battery stats failed: ${e}`);
            }
        }
    });

    refreshBtn.addEventListener('click', async () => {
        try {
            setButtonLoading(refreshBtn, true);
            printLogToFile("Manual refresh", 'INFO');
            await loadStatus();
            await loadConfig();
            showNotification("Status refreshed successfully!", 'success');
            setTimeout(hideNotification, 2000);
        } catch (e) {
            showNotification(`Refresh failed: ${e}`, 'error');
        } finally {
            setButtonLoading(refreshBtn, false);
        }
    });
    /**
     *  -D|--daemon [start|stop|restart]   Manage daemon
     *  e.g.,
     *    acc -D start (alias: accd)
     *    acc -D restart (alias: accd)
     *    accd -D stop (alias: "accd.")
     * todo 添加loading效果
     * 
     */
    restartBtn.addEventListener('click', async () => {
        try {
            printLogToFile("Restarting accd", 'INFO');
            await execAccAndLog(['-D', 'restart']);
            showNotification("Restarting accd", "info");
            await loadStatus();
        } catch (e) {
            showNotification(`Restart failed: ${e}`);
        }
    });

    stopBtn.addEventListener('click', async () => {
        try {
            await execAccAndLog(['-D', 'stop']);
            showNotification("accd stopped", "info");
            await loadStatus();
        } catch (e) {
            showNotification(`Stop failed: ${e}`);
        }
    });

    startBtn.addEventListener('click', async () => {
        try {
            await execAccAndLog(['-D', 'start']);
            showNotification("accd started", "info");
            await loadStatus();
        } catch (e) {
            showNotification(`Start failed: ${e}`);
        }
    });

    refreshLogsBtn.addEventListener('click', loadLogs);

    exportLogsBtn.addEventListener('click', async () => {
        try {
            await execAccAndLog(['-le']);
            showNotification("Logs exported to /sdcard/Download/acc-logs-*.tgz", 'success');
            setTimeout(hideNotification, 3000);
        } catch (e) {
            showNotification(`Export logs failed: ${e}`);
        }
    });

    clearLogsBtn.addEventListener('click', async () => {
        try {
            const success = await clearLogs();
            if (success) {
                await loadLogs();
            } else {
                showNotification("Clear logs failed");
            }
        } catch (e) {
            showNotification(`Clear logs error: ${e}`);
        }
    });

    upgradeBtn.addEventListener('click', async () => {
        if (confirm("Check for ACC updates?")) {
            try {
                const result = await execAccAndLog(['-u', '-c', '-n']);
                if (result.includes('Update available') || /^\d+$/.test(result.trim())) {
                    if (confirm("Update available. Install now?")) {
                        await execAccAndLog(['-u', '-f']);
                        showNotification("ACC updated successfully. Please refresh the page.", 'success');
                    }
                } else if (result.includes('No update available')) {
                    showNotification("ACC is up to date", 'info');
                } else {
                    showNotification("Update check result: " + result.trim(), 'info');
                }
            } catch (e) {
                showNotification(`Update check failed: ${e}`);
            }
        }
    });

    uninstallBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to uninstall ACC? This will remove all ACC files and configurations.")) {
            try {
                const result = await execAccAndLog(['-U']);
                if (result.trim() === '✅') {
                    showNotification("ACC uninstalled successfully", 'success');
                } else {
                    showNotification("ACC uninstall: " + result.trim(), 'success');
                }
            } catch (e) {
                showNotification(`Uninstall failed: ${e}`);
            }
        }
    });

    rollbackBtn.addEventListener('click', async () => {
        const version = prompt("Enter version to rollback to (leave empty for previous):");
        try {
            const args = ['-b'];
            if (version && version.trim()) {
                args.push(version.trim());
            }
            const result = await execAccAndLog(args);
            showNotification("Rollback completed: " + result.trim(), 'success');
        } catch (e) {
            showNotification(`Rollback failed: ${e}`);
        }
    });

    versionBtn.addEventListener('click', async () => {
        try {
            // Show loading feedback immediately
            versionBtn.disabled = true;
            versionBtn.textContent = 'Checking...';

            const version = await execAccAndLog(['-v']);

            versionBtn.disabled = false;
            versionBtn.textContent = 'Show Version';

            showNotification("ACC Version: " + version.trim(), 'info');
        } catch (e) {
            versionBtn.disabled = false;
            versionBtn.textContent = 'Show Version';
            showNotification(`Version check failed: ${e}`);
        }
    });

    detailedInfoBtn.addEventListener('click', async () => {
        const panel = $('detailed-info-panel');
        if (panel.style.display === 'none' || !panel.style.display) {
            try {
                const info = await execAccAndLog(['-i']);
                $('detailed-info-content').textContent = info;
                panel.style.display = 'block';
                detailedInfoBtn.textContent = 'Hide Detailed Info';
                printLogToFile("Detailed battery info displayed", 'INFO');
            } catch (e) {
                showNotification(`Failed to get detailed info: ${e}`);
            }
        } else {
            panel.style.display = 'none';
            detailedInfoBtn.textContent = 'Detailed Battery Info';
        }
    });

    readmeBtn.addEventListener('click', async () => {
        try {
            const readme = await showReadme();
            $('readme-content').innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${readme.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
            $('readme-modal').style.display = 'block';
            printLogToFile("README displayed", 'INFO');
        } catch (e) {
            showNotification(`Failed to load README: ${e}`);
        }
    });

    $('close-readme').addEventListener('click', () => {
        $('readme-modal').style.display = 'none';
    });

    logtailBtn.addEventListener('click', async () => {
        try {
            // Show loading feedback immediately
            logtailBtn.disabled = true;
            logtailBtn.textContent = 'Loading Logs...';

            // Get recent logs (non-blocking, no -f flag)
            const logs = await showLogTail();

            // Display logs in a modal instead of freezing UI
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content large-modal">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>ACC Log Monitor (Last 100 lines)</h2>
                    <pre style="max-height: 400px; overflow-y: auto; background: #000; color: #0f0; padding: 12px; white-space: pre-wrap; border-radius: 8px;">${logs || 'No logs available'}</pre>
                    <div class="button-group" style="margin-top: 16px;">
                        <button onclick="navigator.clipboard.writeText(\`${logs.replace(/`/g, '\\`')}\`); this.textContent='Copied!';">Copy Logs</button>
                        <button onclick="this.closest('.modal').remove();">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Close modal on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            logtailBtn.disabled = false;
            logtailBtn.textContent = 'Log Monitor';
            printLogToFile("Log monitor opened", 'INFO');
        } catch (e) {
            logtailBtn.disabled = false;
            logtailBtn.textContent = 'Log Monitor';
            showNotification(`Failed to load logs: ${e}`);
        }
    });

    // Load data asynchronously without blocking UI initialization
    // Use Promise.allSettled to load in parallel and continue even if some fail
    Promise.allSettled([
        loadStatus(),
        loadConfig(),
        loadLogs()
    ]).then(results => {
        results.forEach((result, index) => {
            const names = ['Status', 'Config', 'Logs'];
            if (result.status === 'rejected') {
                printLogToFile(`${names[index]} load failed: ${result.reason}`, 'WARN');
            }
        });
    });

    $('run-test-switches').addEventListener('click', async () => {
        const outputElement = $('test-switches-output');
        const runBtn = $('run-test-switches');
        const stopBtn = $('stop-test-switches');

        runBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        //todo 这种默认状态需要在停止测试后改回来
        outputElement.textContent = 'Starting switch test...\n\n⏳ This may take several minutes. Testing charging switches...\n\n';

        // let testTerminalId = null;
        // let checkInterval = null;

        ///todo 有些不理解为什么要这么写
        // try {
        //     // Start the test command in background
        //     const callback = `test_callback_${Date.now()}`;
        //     window[callback] = function (errno, stdout, stderr) {
        //         delete window[callback];
        //         if (errno === 0) {
        //             outputElement.textContent += '\n✅ Test completed!\n\n' + stdout;
        //         } else {
        //             outputElement.textContent += '\n❌ Test failed\n\n' + (stderr || stdout || 'Unknown error');
        //         }
        //         runBtn.style.display = 'inline-block';
        //         stopBtn.style.display = 'none';
        //         if (checkInterval) clearInterval(checkInterval);
        //     };

        //     // Execute with streaming output simulation
        //     ksu.execAndLog(`${globalAccPath || accPath} -t 2>&1`, callback);

        //     // Simulate progress updates since we can't get real-time streaming
        //     let dots = 0;
        //     const progressMessages = [
        //         '📋 Analyzing battery interface...',
        //         '🔌 Testing charging switches...',
        //         '⚡ Checking switch compatibility...',
        //         '🔍 Validating results...',
        //         '📊 Compiling test report...'
        //     ];
        //     let msgIndex = 0;

        //     checkInterval = setInterval(() => {
        //         dots = (dots + 1) % 4;
        //         const dotString = '.'.repeat(dots);
        //         const currentMsg = progressMessages[msgIndex % progressMessages.length];
        //         outputElement.textContent = `Starting switch test...\n\n⏳ This may take several minutes. Testing charging switches${dotString}\n\n${currentMsg}\n\nPlease wait, this process cannot be interrupted safely.`;
        //         msgIndex++;
        //     }, 3000);

        //     await info("Charging switches test started");
        // } catch (e) {
        //     outputElement.textContent += `\n❌ Error: ${e}`;
        //     await error(`Switch test error: ${e}`);
        //     runBtn.style.display = 'inline-block';
        //     stopBtn.style.display = 'none';
        //     if (checkInterval) clearInterval(checkInterval);
        // }
    });

    $('stop-test-switches').addEventListener('click', () => {
        const runBtn = $('run-test-switches');
        const stopBtn = $('stop-test-switches');
        runBtn.style.display = '';
        stopBtn.style.display = 'none';
        // $('test-switches-modal').style.display = 'none';
        showNotification("Test cancelled", 'info');
    });

    $('close-test-switches').addEventListener('click', () => {
        const runBtn = $('run-test-switches');
        const stopBtn = $('stop-test-switches');
        runBtn.style.display = '';
        stopBtn.style.display = 'none';
        $('test-switches-modal').style.display = 'none';
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    //todo 和refrsh status按钮做个合并，实现手动和自动刷新保持一致
    setInterval(loadStatus, 10000);
    setInterval(loadLogs, 30000);
}
/**
初始化主导航标签并绑定切换逻辑。
Initialize main navigation tabs for the WebUI.
@returns {void}
 */
function initializeMainTabs() {
    const navButtons = document.querySelectorAll('.nav-button');

    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-main-tab');

            document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.main-tab-pane').forEach(pane => pane.classList.remove('active'));

            this.classList.add('active');
            $(tabId).classList.add('active');

            printLogToFile(`Switched to tab: ${tabId}`, 'INFO');
        });
    });
}

async function loadStatus() {
    await updateStatus();
}

// Initialize debug mode from localStorage
function initializeDebugMode() {
    const debugConsoleCard = $('debug-console-card');
    const debugModeToggle = $('debug-mode-toggle');

    // Load saved preference (default: disabled)
    const debugModeEnabled = localStorage.getItem('debugModeEnabled') === 'true';

    // Set the toggle value
    debugModeToggle.value = debugModeEnabled ? 'true' : 'false';

    // Apply the setting
    if (debugModeEnabled) {
        debugConsoleCard.classList.add('enabled');
    } else {
        debugConsoleCard.classList.remove('enabled');
    }

    // Listen for changes
    debugModeToggle.addEventListener('change', function () {
        const isEnabled = this.value === 'true';
        localStorage.setItem('debugModeEnabled', isEnabled);

        if (isEnabled) {
            debugConsoleCard.classList.add('enabled');
            showNotification('Debug console enabled - visible on all pages', 'info');
        } else {
            debugConsoleCard.classList.remove('enabled');
            showNotification('Debug console disabled', 'info');
        }

        printLogToFile(`Debug mode ${isEnabled ? 'enabled' : 'disabled'}`, 'INFO');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        initializeMainTabs();

        if (!checkKSUEnvironment()) {
            showNotification("KernelSU API not available.", 'ERROR');
            return;
        }
        printLogToConsole("KernelSU API available, initializing...", 'INFO');


        try {
            await initLogDirectory();
        } catch (e) {
            printLogToConsole(`Logging initialization failed: ${e}`, 'WARN');
        }
        printLogToFile("WebView starting", 'INFO');


        if (!initAccPath()) {
            printLogToConsole("ACC binary not found");
            return;
        }


        await verifySystem();

        initializeConfigUI();

        // Initialize debug mode toggle
        initializeDebugMode();
    } catch (e) {
        showNotification(`Initialization failed: ${e}`, 'ERROR');
    }
});

