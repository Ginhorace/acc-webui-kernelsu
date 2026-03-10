// Settings Tab - Profile settings management
import * as logger from '../config/logger';
import { createProfileDir } from '../commands/command';
import * as acc from '../commands/acc';
import { printToNotify } from '../config/logger';
import { printToConsole } from '../config/logger';
import { customPrompt } from './dialog';
import { customConfirm } from './confirm';
import { $, setOnClick } from './base';

/**
 * Initialize settings tab event listeners
 */
function initializeSettingsTab(): void {
    const panelClassList = ($('settings-panel') as HTMLDivElement).classList;

    // Load config and switches on init
    panelClassList.add('loading');
    Promise.all([
        loadChargingSwitches(),
        loadCurrentConfig()
    ]).finally(() => {
        panelClassList.remove('loading');
    });

    setOnClick('load-config-btn', handleLoadConfig);
    setOnClick('save-config-btn', handleSaveConfig);
    setOnClick('reset-config-btn', handleResetConfig);
    setOnClick('save-profile-btn', handleSaveProfile);
    setOnClick('load-profile-btn', handleLoadProfile);
    setOnClick('test-functionality-btn', handleTestFunctionality);

    // Tab switching within settings
    document.querySelectorAll('.tab-button').forEach((button: Element) => {
        button.addEventListener('click', handleTabButtonClick);
    });
}

// Handle settings tab button click
function handleTabButtonClick(e: Event): void {
    const button = e.target as HTMLButtonElement;
    document.querySelectorAll('.tab-button').forEach((btn: Element) => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((pane: Element) => pane.classList.remove('active'));

    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    if (tabId) {
        const tab = $(tabId);
        if (tab) tab.classList.add('active');
    }
}


/**
 * Get input/select element value
 * @param id
 * @returns 
 */
function getVal(id: string): string {
    const el = $(id);
    return el ? (el as HTMLInputElement | HTMLSelectElement).value : '';
}

/**
 * Load current ACC Profile
 */
async function loadCurrentConfig(): Promise<void> {
    try {
        const config = await acc.printConfig() || '';
        const configLines = config.split('\n').filter((line: string) => line.trim());

        const configMap: Record<string, string> = {};
        configLines.forEach((line: string) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                configMap[match[1].trim()] = match[2].replaceAll('"','').trim();
            }
        });

        const setVal = (id: string, key: string): void => {
            const el = $(id);
            if (el) (el as HTMLInputElement | HTMLSelectElement).value = configMap[key] || '';
        };
        //todo 要格式化https://github.com/farrukh2002/acc-webui-kernelsu
        setVal('pause-capacity', 'pause_capacity');
        setVal('resume-capacity', 'resume_capacity');
        setVal('shutdown-capacity', 'shutdown_capacity');
        setVal('capacity-mask', 'capacity_mask');
        setVal('max-current', 'max_charging_current');
        setVal('max-voltage', 'max_charging_voltage');
        setVal('temp-level', 'temp_level');
        setVal('prioritize-idle', 'prioritize_batt_idle_mode');
        setVal('force-off', 'force_off');
        setVal('reboot-resume', 'reboot_resume');
        setVal('reset-batt-stats-on-pause', 'reset_batt_stats_on_pause');
        setVal('reset-batt-stats-on-plug', 'reset_batt_stats_on_plug');
        setVal('reset-batt-stats-on-unplug', 'reset_batt_stats_on_unplug');
        setVal('cooldown-capacity', 'cooldown_capacity');
        setVal('cooldown-temp', 'cooldown_temp');
        setVal('cooldown-current', 'cooldown_current');
        setVal('cooldown-charge', 'cooldown_charge');
        setVal('cooldown-pause', 'cooldown_pause');
        setVal('charging-switch', 'charging_switch');
        setVal('batt-status-override', 'batt_status_override');
        setVal('idle-apps', 'idle_apps');
        setVal('run-cmd-on-pause', 'run_cmd_on_pause');
        setVal('apply-on-boot', 'apply_on_boot');
        setVal('apply-on-plug', 'apply_on_plug');

        logger.printToConsole('Profile loaded into UI');
    } catch (e) {
        printToNotify(`Failed to load Profile: ${e}`,'ERROR');
    }
}

/**
 * Load available charging switches
 */
async function loadChargingSwitches(): Promise<void> {
    try {
        const switches = await acc.loadingSwitch() || '';
        const switchSelect = $('charging-switch') as HTMLSelectElement | null;
        if (!switchSelect) return;

        // Clear existing options except the first (Automatic)
        while (switchSelect.options.length > 1) {
            switchSelect.remove(1);
        }

        switches.split('\n').forEach((line: string) => {
            if (line.trim()) {
                const option = document.createElement('option');
                option.value = line;
                option.textContent = line;
                switchSelect.appendChild(option);
            }
        });
    } catch (e) {
        printToConsole(`Failed to load charging switches: ${e}`, 'ERROR');
    }
}

/**
 * Save Profile to ACC
 */
async function saveConfig(): Promise<void> {
    try {
        const commands: string[] = [];

        // Basic settings
        if (getVal('pause-capacity')) {
            commands.push(`pause_capacity=${getVal('pause-capacity')}`);
        }
        if (getVal('resume-capacity')) {
            commands.push(`resume_capacity=${getVal('resume-capacity')}`);
        }
        if (getVal('shutdown-capacity')) {
            commands.push(`shutdown_capacity=${getVal('shutdown-capacity')}`);
        }
        commands.push(`capacity_mask=${getVal('capacity-mask')}`);

        // Limits
        if (getVal('max-current')) {
            commands.push(`max_charging_current=${getVal('max-current')}`);
        }
        if (getVal('max-voltage')) {
            commands.push(`max_charging_voltage=${getVal('max-voltage')}`);
        }
        if (getVal('temp-level')) {
            commands.push(`temp_level=${getVal('temp-level')}`);
        }

        // Advanced settings
        commands.push(`prioritize_batt_idle_mode=${getVal('prioritize-idle')}`);
        commands.push(`force_off=${getVal('force-off')}`);
        commands.push(`reboot_resume=${getVal('reboot-resume')}`);
        commands.push(`reset_batt_stats_on_pause=${getVal('reset-batt-stats-on-pause')}`);
        commands.push(`reset_batt_stats_on_plug=${getVal('reset-batt-stats-on-plug')}`);
        commands.push(`reset_batt_stats_on_unplug=${getVal('reset-batt-stats-on-unplug')}`);

        // Cooldown settings
        if (getVal('cooldown-capacity')) {
            commands.push(`cooldown_capacity=${getVal('cooldown-capacity')}`);
        }
        if (getVal('cooldown-temp')) {
            commands.push(`cooldown_temp=${getVal('cooldown-temp')}`);
        }
        if (getVal('cooldown-current')) {
            commands.push(`cooldown_current=${getVal('cooldown-current')}`);
        }
        if (getVal('cooldown-charge') && getVal('cooldown-pause')) {
            commands.push(`cooldown_charge=${getVal('cooldown-charge')}`);
            commands.push(`cooldown_pause=${getVal('cooldown-pause')}`);
        }

        // Other settings
        if (getVal('charging-switch')) {
            commands.push(`charging_switch=${getVal('charging-switch')}`);
        }
        if (getVal('batt-status-override')) {
            commands.push(`batt_status_override=${getVal('batt-status-override')}`);
        }
        if (getVal('idle-apps')) {
            commands.push(`idle_apps=${getVal('idle-apps')}`);
        }
        if (getVal('run-cmd-on-pause')) {
            commands.push(`run_cmd_on_pause=${getVal('run-cmd-on-pause')}`);
        }
        if (getVal('apply-on-boot')) {
            commands.push(`apply_on_boot=${getVal('apply-on-boot')}`);
        }
        if (getVal('apply-on-plug')) {
            commands.push(`apply_on_plug=${getVal('apply-on-plug')}`);
        }

        // Execute all commands
        for (const cmd of commands) {
            await acc.setConfig(cmd);
        }

        printToNotify('Profile saved successfully!');

        // Restart accd to apply changes
        try {
            await acc.restartAccd();
        } catch (e) {
            printToConsole(`Could not restart accd: ${e}`,'ERROR');
        }
    } catch (e) {
        printToNotify(`Failed to save Profile: ${e}`,'ERROR');
    }
}

/**
 * Reset Profile to defaults
 */
async function resetConfig(): Promise<void> {
    try {
        await acc.resetConfig();
        await loadCurrentConfig();
        printToNotify('Profile reset to defaults!');

        try {
            await acc.restartAccd();
        } catch (e) {
            printToConsole(`Could not restart accd: ${e}`,'ERROR');
        }
    } catch (e) {
        printToNotify(`Failed to reset Profile: ${e}`,'ERROR');
    }
}

/**
 * Handle load config button click
 */
function handleLoadConfig(): void {
    const panelClassList = ($('settings-panel') as HTMLDivElement).classList;
    panelClassList.add('loading');
    loadCurrentConfig().finally(() => {
        panelClassList.remove('loading');
    });
}

/**
 * Handle save config button click
 */
async function handleSaveConfig(): Promise<void> {
    const panelClassList = ($('settings-panel') as HTMLDivElement).classList;
    if (await customConfirm('Are you sure you want to save these settings?')) {
        panelClassList.add('loading');
        saveConfig().finally(() => {
            panelClassList.remove('loading');
        });
    }
}

/**
 * Handle reset config button click
 */
async function handleResetConfig(): Promise<void> {
    const panelClassList = ($('settings-panel') as HTMLDivElement).classList;
    if (await customConfirm('Are you sure you want to reset all settings to defaults?')) {
        panelClassList.add('loading');
        resetConfig().finally(() => {
            panelClassList.remove('loading');
        });
    }
}

/**
 * Handle save profile button click
 */
async function handleSaveProfile(): Promise<void> {
    const profileName = await customPrompt('Enter profile name:');
    if (profileName && profileName.trim()) {
        try {
            await createProfileDir();
            const config = await acc.printConfig() || '';
            await logger.execAndLog('sh', ['-c', `echo '${config.replace(/'/g, "'\\''")}' > /data/adb/vr25/acc-data/profiles/${profileName.trim()}.conf`]);
            printToNotify(`Profile "${profileName}" saved successfully!`);
        } catch (e) {
            printToNotify(`Failed to save profile: ${e}`,'ERROR');
        }
    }
}

/**
 * Handle load profile button click
 */
async function handleLoadProfile(): Promise<void> {
    const profileName = await customPrompt('Enter profile name to load:');
    if (profileName && profileName.trim()) {
        try {
            const profileConfig = await logger.execAndLog('cat', [`/data/adb/vr25/acc-data/profiles/${profileName.trim()}.conf`]);
            const lines = profileConfig.split('\n').filter((l: string) => l.trim() && l.includes('='));

            for (const line of lines) {
                await acc.setConfig(line.trim());
            }

            await loadCurrentConfig();
            printToNotify(`Profile "${profileName}" loaded successfully!`);

            try {
                await acc.restartAccd();
            } catch (e) {
                printToConsole(`Could not restart accd: ${e}`, 'ERROR');
            }
        } catch (e) {
            printToNotify(`Failed to load profile: ${e}`,'ERROR');
        }
    }
}

/**
 * Handle test functionality button click
 */
async function handleTestFunctionality(): Promise<void> {
    if (!await customConfirm('This will test ACC functionality by toggling charging on/off. Continue?')) return;

    printToNotify('Testing ACC functionality...');
    try {
        await acc.disableCharging();
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status1 = await acc.showInfo() || '';

        await acc.enableCharging();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await acc.showInfo();

        if (status1.includes('Discharging') || status1.includes('Not charging')) {
            printToNotify('✅ ACC functionality test passed!');
        } else {
            printToNotify('⚠️ ACC test completed but results inconclusive. Check logs.');
        }
    } catch (e) {
        printToNotify(`Functionality test failed: ${e}`,'ERROR');
    }
}

export { initializeSettingsTab};
