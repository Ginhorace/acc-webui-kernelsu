// ACC Configuration Manager
import { execAndLog,printLogToConsole, printLogToFile, showNotification, hideNotification } from './logger.js';
import {createProfileDir} from './command.js'
import { execAccAndLog } from './acc.js';
// Shorthand for document.getElementById
function $(id) {
    return document.getElementById(id);
}
function initializeConfigUI() {
    $('settings-panel').classList.add('loading');

    Promise.all([
        loadCurrentConfig(),
        loadChargingSwitches()
    ]).finally(() => {
        $('settings-panel').classList.remove('loading');
    });

    $('load-config-btn').addEventListener('click', () => {
        $('settings-panel').classList.add('loading');
        loadCurrentConfig().finally(() => {
            $('settings-panel').classList.remove('loading');
        });
    });

    $('save-config-btn').addEventListener('click', () => {
        if (confirm("Are you sure you want to save these settings?")) {
            $('settings-panel').classList.add('loading');
            saveConfig().finally(() => {
                $('settings-panel').classList.remove('loading');
            });
        }
    });

    $('reset-config-btn').addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all settings to defaults?")) {
            $('settings-panel').classList.add('loading');
            resetConfig().finally(() => {
                $('settings-panel').classList.remove('loading');
            });
        }
    });

    $('save-profile-btn').addEventListener('click', async () => {
        const profileName = prompt("Enter profile name:");
        if (profileName && profileName.trim()) {
            try {
                await createProfileDir();
                const config = await execAccAndLog(['-s']);
                await execAndLog('sh', ['-c', `echo '${config.replace(/'/g, "'\\''")}' > /data/adb/vr25/acc-data/profiles/${profileName.trim()}.conf`]);
                showNotification(`Profile "${profileName}" saved successfully!`, 'success');
                setTimeout(hideNotification, 3000);
            } catch (e) {
                showNotification(`Failed to save profile: ${e}`, 'error');
            }
        }
    });

    $('load-profile-btn').addEventListener('click', async () => {
        const profileName = prompt("Enter profile name to load:");
        if (profileName && profileName.trim()) {
            try {
                const profileConfig = await execAndLog('cat', [`/data/adb/vr25/acc-data/profiles/${profileName.trim()}.conf`]);
                const lines = profileConfig.split('\n').filter(l => l.trim() && l.includes('='));

                for (const line of lines) {
                    await execAccAndLog(['-s', line.trim()]);
                }

                await loadCurrentConfig();
                showNotification(`Profile "${profileName}" loaded successfully!`, 'success');
                setTimeout(hideNotification, 3000);

                try {
                    await execAccAndLog(['-D', 'restart']);
                } catch (e) {
                    printLogToConsole(`Could not restart accd: ${e}`, 'WARN');
                }
            } catch (e) {
                showNotification(`Failed to load profile: ${e}`, 'error');
            }
        }
    });

    $('test-functionality-btn').addEventListener('click', async () => {
        if (!confirm("This will test ACC functionality by toggling charging on/off. Continue?")) return;

        showNotification("Testing ACC functionality...", 'info');
        try {
            await execAccAndLog(['-d']);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const status1 = await execAccAndLog(['-i']);

            await execAccAndLog(['-e']);
            await new Promise(resolve => setTimeout(resolve, 2000));
            await execAccAndLog(['-i']);

            if (status1.includes('Discharging') || status1.includes('Not charging')) {
                showNotification("✅ ACC functionality test passed!", 'success');
            } else {
                showNotification("⚠️ ACC test completed but results inconclusive. Check logs.", 'info');
            }

            setTimeout(hideNotification, 5000);
            printLogToFile("Functionality test completed", 'INFO');
        } catch (e) {
            showNotification(`Functionality test failed: ${e}`, 'error');
        }
    });
}

// Load current ACC configuration
async function loadCurrentConfig() {
    try {
        const config = await execAccAndLog(['-s']);
        const configLines = config.split('\n').filter(line => line.trim());

        // Parse config
        const configMap = {};
        configLines.forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                configMap[match[1].trim()] = match[2].trim();
            }
        });
        $('pause-capacity').value = configMap.pause_capacity || '';
        $('resume-capacity').value = configMap.resume_capacity || '';
        $('shutdown-capacity').value = configMap.shutdown_capacity || '';
        $('capacity-mask').value = configMap.capacity_mask || 'false';
        $('max-current').value = configMap.max_charging_current || '';
        $('max-voltage').value = configMap.max_charging_voltage || '';
        $('temp-level').value = configMap.temp_level || '0';
        $('prioritize-idle').value = configMap.prioritize_batt_idle_mode || 'true';
        $('force-off').value = configMap.force_off || 'false';
        $('reboot-resume').value = configMap.reboot_resume || 'false';
        $('reset-batt-stats-on-pause').value = configMap.reset_batt_stats_on_pause || 'false';
        $('reset-batt-stats-on-plug').value = configMap.reset_batt_stats_on_plug || 'false';
        $('reset-batt-stats-on-unplug').value = configMap.reset_batt_stats_on_unplug || 'false';
        $('cooldown-capacity').value = configMap.cooldown_capacity || '101';
        $('cooldown-temp').value = configMap.cooldown_temp || '45';
        $('cooldown-current').value = configMap.cooldown_current || '';
        $('cooldown-charge').value = configMap.cooldown_charge || '';
        $('cooldown-pause').value = configMap.cooldown_pause || '';
        $('charging-switch').value = configMap.charging_switch || '';
        $('batt-status-override').value = configMap.batt_status_override || '';
        $('idle-apps').value = configMap.idle_apps || '';
        $('run-cmd-on-pause').value = configMap.run_cmd_on_pause || '';
        $('apply-on-boot').value = configMap.apply_on_boot || '';
        $('apply-on-plug').value = configMap.apply_on_plug || '';

        printLogToFile("Configuration loaded into UI", 'INFO');
    } catch (e) {
        showNotification(`Failed to load configuration: ${e}`);
    }
}

// Load available charging switches
async function loadChargingSwitches() {
    try {
        const switches = await execAccAndLog(['-s', 's:']);
        const switchSelect = $('charging-switch');

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
        printLogToConsole(`Failed to load charging switches: ${e}`, 'ERROR');
    }
}

// Save configuration to ACC
async function saveConfig() {
    try {
        let commands = [];

        // Basic settings
        if ($('pause-capacity').value) {
            commands.push(`pause_capacity=${$('pause-capacity').value}`);
        }
        if ($('resume-capacity').value) {
            commands.push(`resume_capacity=${$('resume-capacity').value}`);
        }
        if ($('shutdown-capacity').value) {
            commands.push(`shutdown_capacity=${$('shutdown-capacity').value}`);
        }
        commands.push(`capacity_mask=${$('capacity-mask').value}`);

        // Limits
        if ($('max-current').value) {
            commands.push(`max_charging_current=${$('max-current').value}`);
        }
        if ($('max-voltage').value) {
            commands.push(`max_charging_voltage=${$('max-voltage').value}`);
        }
        if ($('temp-level').value) {
            commands.push(`temp_level=${$('temp-level').value}`);
        }

        // Advanced settings
        commands.push(`prioritize_batt_idle_mode=${$('prioritize-idle').value}`);
        commands.push(`force_off=${$('force-off').value}`);
        commands.push(`reboot_resume=${$('reboot-resume').value}`);
        commands.push(`reset_batt_stats_on_pause=${$('reset-batt-stats-on-pause').value}`);
        commands.push(`reset_batt_stats_on_plug=${$('reset-batt-stats-on-plug').value}`);
        commands.push(`reset_batt_stats_on_unplug=${$('reset-batt-stats-on-unplug').value}`);

        // Cooldown settings
        if ($('cooldown-capacity').value) {
            commands.push(`cooldown_capacity=${$('cooldown-capacity').value}`);
        }
        if ($('cooldown-temp').value) {
            commands.push(`cooldown_temp=${$('cooldown-temp').value}`);
        }
        if ($('cooldown-current').value) {
            commands.push(`cooldown_current=${$('cooldown-current').value}`);
        }
        if ($('cooldown-charge').value && $('cooldown-pause').value) {
            commands.push(`cooldown_charge=${$('cooldown-charge').value}`);
            commands.push(`cooldown_pause=${$('cooldown-pause').value}`);
        }

        // Other settings
        if ($('charging-switch').value) {
            commands.push(`charging_switch=${$('charging-switch').value}`);
        }
        if ($('batt-status-override').value) {
            commands.push(`batt_status_override=${$('batt-status-override').value}`);
        }
        if ($('idle-apps').value) {
            commands.push(`idle_apps=${$('idle-apps').value}`);
        }
        if ($('run-cmd-on-pause').value) {
            commands.push(`run_cmd_on_pause=${$('run-cmd-on-pause').value}`);
        }
        if ($('apply-on-boot').value) {
            commands.push(`apply_on_boot=${$('apply-on-boot').value}`);
        }
        if ($('apply-on-plug').value) {
            commands.push(`apply_on_plug=${$('apply-on-plug').value}`);
        }

        // Execute all commands
        for (const cmd of commands) {
            await execAccAndLog(['-s', cmd]);
        }

        showNotification("Configuration saved successfully!");
        setTimeout(hideNotification, 3000);

        // Restart accd to apply changes
        try {
            await execAccAndLog(['-D', 'restart']);
        } catch (e) {
            printLogToConsole(`Could not restart accd: ${e}`, 'WARN');
        }
    } catch (e) {
        showNotification(`Failed to save configuration: ${e}`);
    }
}

// Reset configuration to defaults
async function resetConfig() {
    try {
        await execAccAndLog(['-s', '--reset']);
        await loadCurrentConfig();
        showNotification("Configuration reset to defaults!");
        setTimeout(hideNotification, 3000);

        // Restart accd to apply changes
        try {
            await execAccAndLog(['-D', 'restart'])
        } catch (e) {
            printLogToConsole(`Could not restart accd: ${e}`, 'WARN');
        }
    } catch (e) {
        showNotification(`Failed to reset configuration: ${e}`);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            $(tabId).classList.add('active');
        });
    });
});

export { initializeConfigUI }
