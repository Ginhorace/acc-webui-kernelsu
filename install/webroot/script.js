// Debug console elements
const debugConsole = document.getElementById('debug-console');
const lastUpdated = document.getElementById('last-updated');

// Enhanced logging system
const logManager = {
    logDir: '/data/adb/farrukh2002/acc/logs',
    logFile: '/data/adb/farrukh2002/acc/logs/webview-acc.log',
    maxLogLines: 500,
    logLevel: 'DEBUG',

    ensureLogDirectory: async function() {
        try {
            await this.executeCommand(`mkdir -p "${this.logDir}" && chmod 755 "${this.logDir}"`);
            await this.info(`Log directory ensured at ${this.logDir}`);
            return true;
        } catch (e) {
            console.error(`Failed to create log directory: ${e}`);
            return false;
        }
    },

    executeCommand: async function(command) {
        return new Promise((resolve, reject) => {
            if (typeof ksu !== 'undefined' && ksu.exec) {
                const callback = `log_callback_${Date.now()}`;
                window[callback] = function(errno, stdout, stderr) {
                    delete window[callback];
                    if (errno === 0) {
                        resolve(stdout);
                    } else {
                        reject(stderr || `Command failed with error ${errno}`);
                    }
                };
                ksu.exec(command, callback);
            } else {
                reject("KernelSU API not available");
            }
        });
    },

    writeLogInternal: async function(level, message) {
        if (this.shouldLog(level)) {
            try {
                const timestamp = new Date().toISOString();
                const logEntry = `[${timestamp}] [${level}] ${message}`;
                await this.executeCommand(`echo '${logEntry.replace(/'/g, "'\\''")}' >> "${this.logFile}"`);
                return true;
            } catch (e) {
                console.error(`Failed to write log: ${e}`);
                return false;
            }
        }
        return false;
    },

    shouldLog: function(level) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    },

    debug: function(message) { return this.writeLogInternal('DEBUG', message); },
    info: function(message) { return this.writeLogInternal('INFO', message); },
    warn: function(message) { return this.writeLogInternal('WARN', message); },
    error: function(message) { return this.writeLogInternal('ERROR', message); },

    readLogs: async function() {
        try {
            if (!(await this.ensureLogDirectory())) return "Log directory not accessible";

            const fileExists = await this.executeCommand(`[ -f "${this.logFile}" ] && echo "exists"`)
                .then(output => output.includes('exists'))
                .catch(() => false);

            if (!fileExists) {
                await this.executeCommand(`touch "${this.logFile}" && chmod 644 "${this.logFile}"`);
                return "New log file created";
            }

            let logs = await this.executeCommand(`cat "${this.logFile}"`);
            const lineCount = logs.split('\n').filter(line => line.trim()).length;
            
            if (lineCount > this.maxLogLines) {
                await this.rotateLogs();
                logs = await this.executeCommand(`cat "${this.logFile}"`);
            }

            return logs || "No logs available";
        } catch (e) {
            return `Error reading logs: ${e}`;
        }
    },

    rotateLogs: async function() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedFile = `${this.logFile}.${timestamp}`;
            await this.executeCommand(`mv "${this.logFile}" "${rotatedFile}" && touch "${this.logFile}" && chmod 644 "${this.logFile}"`);
            await this.info(`Logs rotated to ${rotatedFile}`);
            return true;
        } catch (e) {
            await this.error(`Log rotation failed: ${e}`);
            return false;
        }
    },

    clearLogs: async function() {
        try {
            await this.executeCommand(`echo "" > "${this.logFile}"`);
            await this.info("Logs cleared");
            return true;
        } catch (e) {
            await this.error(`Failed to clear logs: ${e}`);
            return false;
        }
    },

    getRecentLogs: async function(lines = 100) {
        try {
            const logs = await this.executeCommand(`tail -n ${lines} "${this.logFile}"`);
            return logs || "No recent logs available";
        } catch (e) {
            return `Error getting recent logs: ${e}`;
        }
    }
};

function debugLog(message, level = 'DEBUG') {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    debugConsole.textContent += `${logMessage}\n`;
    debugConsole.scrollTop = debugConsole.scrollHeight;
    lastUpdated.textContent = new Date().toLocaleString();
    
    switch(level) {
        case 'ERROR': logManager.error(message); break;
        case 'WARN': logManager.warn(message); break;
        case 'INFO': logManager.info(message); break;
        default: logManager.debug(message);
    }
}

const commandExecutor = {
    exec: function(command, args = [], timeout = 5000) {
        return new Promise((resolve, reject) => {
            debugLog(`Executing: ${command} ${args.join(' ')}`, 'DEBUG');
            
            if (typeof ksu !== 'undefined' && ksu.exec) {
                const callback = `cmd_callback_${Date.now()}`;
                let timedOut = false;
                const timer = setTimeout(() => {
                    timedOut = true;
                    delete window[callback];
                    reject(`Command timed out after ${timeout}ms`);
                }, timeout);
                
                window[callback] = function(errno, stdout, stderr) {
                    if (timedOut) return;
                    clearTimeout(timer);
                    delete window[callback];
                    
                    if (errno === 0) {
                        resolve(stdout);
                    } else {
                        reject(stderr || `Command failed with error ${errno}`);
                    }
                };
                
                const fullCmd = [command, ...args].map(arg => 
                    arg.includes(' ') ? `"${arg.replace(/"/g, '\\"')}"` : arg
                ).join(' ');
                
                try {
                    ksu.exec(fullCmd, callback);
                } catch (e) {
                    clearTimeout(timer);
                    reject(`Execution error: ${e}`);
                }
            } else {
                reject("KernelSU API not available");
            }
        });
    }
};

function showError(message) {
    const errorBox = document.getElementById('error-display');
    errorBox.textContent = message;
    errorBox.style.display = 'block';
    debugLog(`ERROR: ${message}`, 'ERROR');
}

function hideError() {
    document.getElementById('error-display').style.display = 'none';
}

function updateStatusClass(element, value) {
    element.className = 'status-value';
    if (!value || value.includes('Not running') || value.includes('Disconnected') || value.includes('Error')) {
        element.classList.add('bad');
    } else if (value.includes('Running') || value.includes('Connected') || value.includes('OK')) {
        element.classList.add('good');
    } else if (value.includes('Warning') || value.includes('Partial')) {
        element.classList.add('warning');
    }
}

async function verifySystem() {
    try {
        const idResult = await commandExecutor.exec('id');
        document.getElementById('root-status').textContent = 
            idResult.includes('uid=0') ? 'Root access OK' : 'Root access failed';
        updateStatusClass(document.getElementById('root-status'), idResult);
        
        if (!idResult.includes('uid=0')) throw new Error("Root access not granted");
        
        let accPath = 'acc';
        try {
            const version = await commandExecutor.exec(accPath, ['-v']);
            document.getElementById('acc-install-status').textContent = 'Found in PATH';
            document.getElementById('acc-version').textContent = version.trim();
            updateStatusClass(document.getElementById('acc-install-status'), 'OK');
            updateStatusClass(document.getElementById('acc-version'), version);
            
            document.getElementById('control-panel').style.display = 'block';
            document.getElementById('config-panel').style.display = 'block';
            document.getElementById('log-panel').style.display = 'block';
            
            await initializeUI(accPath);
            return;
        } catch (e) {
            debugLog(`ACC not in PATH: ${e}`, 'DEBUG');
        }
        
        const ACC_PATHS = [
            '/data/adb/vr25/acc/acc',
            '/data/adb/modules/acc/acc.sh',
            '/dev/acc',
            '/system/bin/acc',
            '/data/adb/vr25/bin/acc'
        ];
        
        for (const path of ACC_PATHS) {
            try {
                const version = await commandExecutor.exec(path, ['-v']);
                accPath = path;
                document.getElementById('acc-install-status').textContent = `Found at ${path}`;
                document.getElementById('acc-version').textContent = version.trim();
                updateStatusClass(document.getElementById('acc-install-status'), 'OK');
                updateStatusClass(document.getElementById('acc-version'), version);
                
                document.getElementById('control-panel').style.display = 'block';
                document.getElementById('config-panel').style.display = 'block';
                document.getElementById('log-panel').style.display = 'block';
                
                await initializeUI(accPath);
                return;
            } catch (e) {
                debugLog(`Not found at ${path}: ${e}`, 'DEBUG');
            }
        }
        
        throw new Error("ACC binary not found");
    } catch (e) {
        showError(`System verification failed: ${e}`);
        updateStatusClass(document.getElementById('root-status'), 'Failed');
        updateStatusClass(document.getElementById('acc-install-status'), 'Failed');
    }
}

async function ensureAccdRunning(accPath) {
    try {
        const running = await commandExecutor.exec('pgrep', ['-f', 'accd']);
        if (!running.trim()) {
            debugLog("Starting accd", 'INFO');
            await commandExecutor.exec(accPath, ['--init']);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (e) {
        debugLog(`accd start failed: ${e}`, 'ERROR');
        throw new Error("Failed to start accd");
    }
}

async function loadLogs() {
    try {
        const logs = await logManager.getRecentLogs(100);
        document.getElementById('log-display').textContent = logs;
        document.getElementById('log-display').scrollTop = document.getElementById('log-display').scrollHeight;
        await logManager.info("Logs viewed");
    } catch (e) {
        document.getElementById('log-display').textContent = `Error loading logs: ${e}`;
        await logManager.error(`Log load error: ${e}`);
    }
}

async function initializeUI(accPath) {
    debugLog(`Initializing with ACC path: ${accPath}`, 'INFO');
    
    try {
        await ensureAccdRunning(accPath);
    } catch (e) {
        showError(`Start accd manually: 'su -c "accd --init"`);
        return;
    }

    const refreshBtn = document.getElementById('refresh-btn');
    const restartBtn = document.getElementById('restart-btn');
    const stopBtn = document.getElementById('stop-btn');
    const startBtn = document.getElementById('start-btn');
    const refreshLogsBtn = document.getElementById('refresh-logs-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    
    async function loadStatus() {
        try {
            const output = await commandExecutor.exec(accPath, ['-i']);
            debugLog(`Raw acc -i output:\n${output}`, 'DEBUG');
            
            // Debug: Log each line of output
            console.log("Parsing acc -i output lines:");
            const lines = output.split('\n').filter(line => line.trim());
            lines.forEach((line, i) => console.log(`${i}: ${line}`));
            
            // Parse the output
            const status = {
                battery: lines.find(l => l.startsWith('level'))?.split(/\s+/)[1] || '-',
                charging: lines.find(l => l.startsWith('status'))?.split(/\s+/)[1] || '-',
                temp: lines.find(l => l.startsWith('temp'))?.split(/\s+/)[1] || '-',
                current: lines.find(l => l.startsWith('current_now'))?.split(/\s+/)[1] || '-',
                voltage: lines.find(l => l.startsWith('voltage_now'))?.split(/\s+/)[1] || '-',
                power: lines.find(l => l.startsWith('power_now'))?.split(/\s+/)[1] || '-'
            };

            // Update the UI
            document.getElementById('daemon-status').textContent = 'Running';
            document.getElementById('battery-level').textContent = status.battery;
            document.getElementById('charging-status').textContent = status.charging;
            document.getElementById('current-limit').textContent = status.current;
            document.getElementById('voltage-limit').textContent = status.voltage;
            document.getElementById('temperature').textContent = status.temp;

            // Update power display if element exists
            const powerElement = document.getElementById('power-display');
            if (powerElement) {
                powerElement.textContent = status.power;
            }

            // Update status classes
            updateStatusClass(document.getElementById('daemon-status'), 'Running');
            updateStatusClass(document.getElementById('charging-status'), status.charging);
            updateStatusClass(document.getElementById('temperature'), status.temp);

            hideError();
            await logManager.info("Status refreshed");
        } catch (e) {
            showError(`Status load failed: ${e}`);
            document.getElementById('daemon-status').textContent = 'Error';
            updateStatusClass(document.getElementById('daemon-status'), 'Error');
            await logManager.error(`Status error: ${e}`);
        }
    }
    
    async function loadConfig() {
        try {
            const config = await commandExecutor.exec(accPath, ['-s']);
            const configLines = config.split('\n');
            
            document.getElementById('charge-limit').textContent = 
                configLines.find(l => l.includes('capacity')) || '-';
            document.getElementById('resume-charge').textContent = 
                configLines.find(l => l.includes('resume')) || '-';
            document.getElementById('pause-at').textContent = 
                configLines.find(l => l.includes('pause')) || '-';
            await logManager.info("Config loaded");
        } catch (e) {
            await logManager.error(`Config error: ${e}`);
        }
    }
    
    refreshBtn.addEventListener('click', async () => {
        await logManager.info("Manual refresh");
        await loadStatus();
        await loadConfig();
    });
    
    restartBtn.addEventListener('click', async () => {
        try {
            await logManager.info("Restarting accd");
            await commandExecutor.exec('pkill', ['-f', 'accd']);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await commandExecutor.exec(accPath, ['--init']);
            await loadStatus();
        } catch (e) {
            showError(`Restart failed: ${e}`);
            await logManager.error(`Restart error: ${e}`);
        }
    });
    
    stopBtn.addEventListener('click', async () => {
        try {
            await commandExecutor.exec('pkill', ['-f', 'accd']);
            await logManager.info("accd stopped");
            await loadStatus();
        } catch (e) {
            showError(`Stop failed: ${e}`);
            await logManager.error(`Stop error: ${e}`);
        }
    });
    
    startBtn.addEventListener('click', async () => {
        try {
            await commandExecutor.exec(accPath, ['--init']);
            await logManager.info("accd started");
            await loadStatus();
        } catch (e) {
            showError(`Start failed: ${e}`);
            await logManager.error(`Start error: ${e}`);
        }
    });
    
    refreshLogsBtn.addEventListener('click', loadLogs);
    
    clearLogsBtn.addEventListener('click', async () => {
        try {
            const success = await logManager.clearLogs();
            if (success) {
                await loadLogs();
            } else {
                showError("Clear logs failed");
            }
        } catch (e) {
            showError(`Clear logs error: ${e}`);
        }
    });
    
    await logManager.ensureLogDirectory();
    await loadStatus();
    await loadConfig();
    await loadLogs();
    
    setInterval(loadStatus, 10000);
    setInterval(loadLogs, 30000);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await logManager.ensureLogDirectory();
        await logManager.info("WebView starting");
        await verifySystem();
    } catch (e) {
        console.error("Initialization failed:", e);
        showError("Initialization failed. Check console for details.");
    }
});