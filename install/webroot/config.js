// ACC Configuration Manager
document.addEventListener('DOMContentLoaded', function() {
    // Shared ACC namespace
    window.ACC = window.ACC || {};
    let accPath = window.ACC.accPath;
    
    // Enhanced command executor specifically for ACC
    async function executeAccCommand(args = [], timeout = 5000) {
        const pathsToTry = [
            accPath,
            '/data/adb/vr25/acc/acc',
            '/data/adb/modules/acc/acc',
            '/dev/acc',
            '/system/bin/acc',
            '/data/adb/vr25/bin/acc',
            'acc' // Try PATH as last resort
        ].filter((path, index, self) => path && self.indexOf(path) === index);
        
        let lastError;
        
        for (const path of pathsToTry) {
            try {
                debugLog(`Trying ACC path: ${path} ${args.join(' ')}`, 'DEBUG');
                const result = await commandExecutor.exec(path, args, timeout);
                
                // If successful, update the accPath
                if (path !== accPath) {
                    accPath = path;
                    window.ACC.accPath = path;
                    debugLog(`Discovered ACC at: ${path}`, 'INFO');
                }
                
                return result;
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        
        throw new Error(`All ACC paths failed. Last error: ${lastError}`);
    }

    // Show settings panel when system verification is complete
    const originalVerifySystem = window.verifySystem;
    window.verifySystem = async function() {
        try {
            const result = await originalVerifySystem.apply(this, arguments);
            
            // If accPath wasn't set by the original verifySystem, discover it
            if (!window.ACC.accPath) {
                try {
                    const version = await executeAccCommand(['-v']);
                    debugLog(`Verified ACC version: ${version.trim()}`, 'INFO');
                } catch (e) {
                    showError("Could not verify ACC installation. Some features may not work.");
                    logManager.error(`ACC verification failed: ${e}`);
                }
            }
            
            document.getElementById('settings-panel').style.display = 'block';
            initializeConfigUI();
            return result;
        } catch (e) {
            showError(`System verification failed: ${e}`);
            logManager.error(`VerifySystem error: ${e}`);
            throw e;
        }
    };

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Initialize config UI
    function initializeConfigUI() {
        document.getElementById('settings-panel').classList.add('loading');
        
        Promise.all([
            loadCurrentConfig(),
            loadChargingSwitches()
        ]).finally(() => {
            document.getElementById('settings-panel').classList.remove('loading');
        });
        
        document.getElementById('load-config-btn').addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('loading');
            loadCurrentConfig().finally(() => {
                document.getElementById('settings-panel').classList.remove('loading');
            });
        });
        
        document.getElementById('save-config-btn').addEventListener('click', () => {
            if (confirm("Are you sure you want to save these settings?")) {
                document.getElementById('settings-panel').classList.add('loading');
                saveConfig().finally(() => {
                    document.getElementById('settings-panel').classList.remove('loading');
                });
            }
        });
        
        document.getElementById('reset-config-btn').addEventListener('click', () => {
            if (confirm("Are you sure you want to reset all settings to defaults?")) {
                document.getElementById('settings-panel').classList.add('loading');
                resetConfig().finally(() => {
                    document.getElementById('settings-panel').classList.remove('loading');
                });
            }
        });
    }

    // Load current ACC configuration
    async function loadCurrentConfig() {
        try {
            const config = await executeAccCommand(['-s']);
            const configLines = config.split('\n');
            
            // Parse basic settings
            const capacityLine = configLines.find(l => l.includes('capacity='));
            if (capacityLine) {
                const capacities = capacityLine.match(/\(([^)]+)\)/)?.[1].split(/\s+/) || [];
                if (capacities.length >= 5) {
                    document.getElementById('pause-capacity').value = capacities[3];
                    document.getElementById('resume-capacity').value = capacities[2];
                    document.getElementById('shutdown-capacity').value = capacities[0];
                    document.getElementById('capacity-mask').value = capacities[4];
                }
            }
            
            // Parse limits
            const currentLine = configLines.find(l => l.includes('maxChargingCurrent='));
            if (currentLine) {
                const current = currentLine.match(/\(([^)]+)\)/)?.[1].split(/\s+/)[0];
                if (current) document.getElementById('max-current').value = current;
            }
            
            const voltageLine = configLines.find(l => l.includes('maxChargingVoltage='));
            if (voltageLine) {
                const voltage = voltageLine.match(/\(([^)]+)\)/)?.[1].split(/\s+/)[0];
                if (voltage) document.getElementById('max-voltage').value = voltage;
            }
            
            const tempLevelLine = configLines.find(l => l.includes('tempLevel='));
            if (tempLevelLine) {
                document.getElementById('temp-level').value = tempLevelLine.split('=')[1].trim();
            }
            
            // Parse advanced settings
            const idleLine = configLines.find(l => l.includes('prioritizeBattIdleMode='));
            if (idleLine) {
                document.getElementById('prioritize-idle').value = idleLine.split('=')[1].trim();
            }
            
            const forceOffLine = configLines.find(l => l.includes('forceOff='));
            if (forceOffLine) {
                document.getElementById('force-off').value = forceOffLine.split('=')[1].trim();
            }
            
            const rebootLine = configLines.find(l => l.includes('rebootResume='));
            if (rebootLine) {
                document.getElementById('reboot-resume').value = rebootLine.split('=')[1].trim();
            }
            
            // Parse cooldown settings
            const cooldownCapacityLine = configLines.find(l => l.includes('cooldownCapacity='));
            if (cooldownCapacityLine) {
                document.getElementById('cooldown-capacity').value = cooldownCapacityLine.split('=')[1].trim();
            }
            
            const cooldownTempLine = configLines.find(l => l.includes('cooldownTemp='));
            if (cooldownTempLine) {
                document.getElementById('cooldown-temp').value = cooldownTempLine.split('=')[1].trim();
            }
            
            const cooldownCurrentLine = configLines.find(l => l.includes('cooldownCurrent='));
            if (cooldownCurrentLine) {
                document.getElementById('cooldown-current').value = cooldownCurrentLine.split('=')[1].trim();
            }
            
            const cooldownRatioLine = configLines.find(l => l.includes('cooldownRatio='));
            if (cooldownRatioLine) {
                const ratios = cooldownRatioLine.match(/\(([^)]+)\)/)?.[1].split(/\s+/) || [];
                if (ratios.length >= 2) {
                    document.getElementById('cooldown-charge').value = ratios[0];
                    document.getElementById('cooldown-pause').value = ratios[1];
                }
            }
            
            logManager.info("Configuration loaded into UI");
        } catch (e) {
            showError(`Failed to load configuration: ${e}`);
            logManager.error(`Config load error: ${e}`);
        }
    }

    // Load available charging switches
    async function loadChargingSwitches() {
        try {
            const switches = await executeAccCommand(['-s', 's::']);
            const switchSelect = document.getElementById('charging-switch');
            
            // Clear existing options except the first (Automatic)
            while (switchSelect.options.length > 1) {
                switchSelect.remove(1);
            }
            
            switches.split('\n').forEach(line => {
                if (line.trim()) {
                    const option = document.createElement('option');
                    option.value = line.split(' ')[0];
                    option.textContent = line;
                    switchSelect.appendChild(option);
                }
            });
        } catch (e) {
            console.error("Failed to load charging switches:", e);
            logManager.error(`Failed to load charging switches: ${e}`);
        }
    }

    // Save configuration to ACC
    async function saveConfig() {
        try {
            let commands = [];
            
            // Basic settings
            commands.push(`capacity=(${document.getElementById('shutdown-capacity').value} ${document.getElementById('cooldown-capacity').value} ${document.getElementById('resume-capacity').value} ${document.getElementById('pause-capacity').value} ${document.getElementById('capacity-mask').value})`);
            
            // Limits
            if (document.getElementById('max-current').value) {
                commands.push(`maxChargingCurrent=(${document.getElementById('max-current').value})`);
            }
            if (document.getElementById('max-voltage').value) {
                commands.push(`maxChargingVoltage=(${document.getElementById('max-voltage').value})`);
            }
            if (document.getElementById('temp-level').value) {
                commands.push(`tempLevel=${document.getElementById('temp-level').value}`);
            }
            
            // Advanced settings
            if (document.getElementById('charging-switch').value) {
                commands.push(`chargingSwitch=${document.getElementById('charging-switch').value}`);
            }
            commands.push(`prioritizeBattIdleMode=${document.getElementById('prioritize-idle').value}`);
            commands.push(`forceOff=${document.getElementById('force-off').value}`);
            commands.push(`rebootResume=${document.getElementById('reboot-resume').value}`);
            
            // Cooldown settings
            if (document.getElementById('cooldown-capacity').value) {
                commands.push(`cooldownCapacity=${document.getElementById('cooldown-capacity').value}`);
            }
            if (document.getElementById('cooldown-temp').value) {
                commands.push(`cooldownTemp=${document.getElementById('cooldown-temp').value}`);
            }
            if (document.getElementById('cooldown-current').value) {
                commands.push(`cooldownCurrent=${document.getElementById('cooldown-current').value}`);
            }
            commands.push(`cooldownRatio=(${document.getElementById('cooldown-charge').value} ${document.getElementById('cooldown-pause').value})`);
            
            // Execute all commands
            for (const cmd of commands) {
                await executeAccCommand(['-s', cmd]);
            }
            
            logManager.info("Configuration saved");
            showError("Configuration saved successfully!");
            setTimeout(hideError, 3000);
            
            // Restart accd to apply changes
            try {
                await commandExecutor.exec('pkill', ['-f', 'accd']);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await executeAccCommand(['--init']);
            } catch (e) {
                console.warn("Could not restart accd:", e);
            }
        } catch (e) {
            showError(`Failed to save configuration: ${e}`);
            logManager.error(`Config save error: ${e}`);
        }
    }

    // Reset configuration to defaults
    async function resetConfig() {
        try {
            await executeAccCommand(['-s', '--reset']);
            await loadCurrentConfig();
            logManager.info("Configuration reset to defaults");
            showError("Configuration reset to defaults!");
            setTimeout(hideError, 3000);
            
            // Restart accd to apply changes
            try {
                await commandExecutor.exec('pkill', ['-f', 'accd']);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await executeAccCommand(['--init']);
            } catch (e) {
                console.warn("Could not restart accd:", e);
            }
        } catch (e) {
            showError(`Failed to reset configuration: ${e}`);
            logManager.error(`Config reset error: ${e}`);
        }
    }
});