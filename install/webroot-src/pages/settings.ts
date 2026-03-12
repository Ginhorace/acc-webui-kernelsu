// Settings Tab - Profile settings management
import * as logger from '@/env/logger';
import * as acc from '@/commands/acc';
import * as acca from '@/commands/acca';
import { customConfirm } from '@/components/confirm';
import * as base from '@/components/base';
import { getAccProfilePath, LogLevel } from '@/data/state';
import { defaultProfilePath, startupProfilePath } from '@/config/setting';

/**
 * Config field mapping between UI element and ACC config name
 */
interface ConfigMapping {
    elementName: string;
    configName: string;
    required?: boolean; // If true, always include even when empty
}

/**
 * Config mappings for all settings fields
 */
const CONFIG_MAPPINGS: ConfigMapping[] = [
    // Basic settings
    { elementName: 'pause-capacity', configName: 'pause_capacity' },
    { elementName: 'resume-capacity', configName: 'resume_capacity' },
    { elementName: 'shutdown-capacity', configName: 'shutdown_capacity' },
    { elementName: 'capacity-mask', configName: 'capacity_mask', required: true },

    // Limits
    { elementName: 'max-current', configName: 'max_charging_current' },
    { elementName: 'max-voltage', configName: 'max_charging_voltage' },
    { elementName: 'temp-level', configName: 'temp_level' },

    // Advanced settings
    { elementName: 'prioritize-idle', configName: 'prioritize_batt_idle_mode', required: true },
    { elementName: 'force-off', configName: 'force_off', required: true },
    { elementName: 'reboot-resume', configName: 'reboot_resume', required: true },
    { elementName: 'reset-batt-stats-on-pause', configName: 'reset_batt_stats_on_pause', required: true },
    { elementName: 'reset-batt-stats-on-plug', configName: 'reset_batt_stats_on_plug', required: true },
    { elementName: 'reset-batt-stats-on-unplug', configName: 'reset_batt_stats_on_unplug', required: true },

    // Cooldown settings
    { elementName: 'cooldown-capacity', configName: 'cooldown_capacity' },
    { elementName: 'cooldown-temp', configName: 'cooldown_temp' },
    { elementName: 'cooldown-current', configName: 'cooldown_current' },
    { elementName: 'cooldown-charge', configName: 'cooldown_charge' },
    { elementName: 'cooldown-pause', configName: 'cooldown_pause' },

    // Other settings
    { elementName: 'charging-switch', configName: 'charging_switch' },
    { elementName: 'batt-status-override', configName: 'batt_status_override' },
    { elementName: 'idle-apps', configName: 'idle_apps' },
    { elementName: 'run-cmd-on-pause', configName: 'run_cmd_on_pause' },
    { elementName: 'apply-on-boot', configName: 'apply_on_boot' },
    { elementName: 'apply-on-plug', configName: 'apply_on_plug' },
];

let ProfilePanelName = "current-profile-settings";

/**
 * Initialize settings tab event listeners
 */
function initializeSettingsTab(): void {
    loadChargingSwitches();
    //todo -c|--config h string 点击选项上文本打印帮助
    base.setOnClick('load-default-config-btn', handleLoadDefaultConfig);
    base.setOnClick('save-config-btn', handleSaveConfig);
    // Tab switching within settings
    document.querySelectorAll('.tab-button').forEach((button: Element) => {
        button.addEventListener('click', handleTabButtonClick);
    });
}


async function refreshSettings(): Promise<void> {
    base.setButtonLoading(base.$('settings-panel') as HTMLDivElement, true);

    setTimeout(async () => {
        try {
            await base.checkAccdProfile(ProfilePanelName);
            let currentProfile = getAccProfilePath();
            if (base.isForceCharging(currentProfile)) {
                logger.printToNotify('ForceCharging configuration should not be modified.',LogLevel.ERROR)
                return;
            }
            await loadCurrentConfig(currentProfile);
            base.setButtonLoading(base.$('settings-panel') as HTMLDivElement, false);
            logger.printToNotify(`${(!currentProfile||currentProfile.includes(startupProfilePath))?'Startup Profile':currentProfile.split('/').pop()} is being edited`)
        }
        catch (e) {
            logger.printToNotify(`refresh failed:${e}`, LogLevel.ERROR);
        }
    }, 0);
}

/**
 * Get input/select element value
 * @param id
 * @returns 
 */
function getVal(id: string): string {
    const el = base.$(id);
    return el ? (el as HTMLInputElement | HTMLSelectElement).value : '';
}



/**
 * Build config commands from current UI values
 * @returns Array of config commands
 */
function buildConfigCommands(): string[] {
    const commands: string[] = [];
    const cooldownChargeVal = getVal('cooldown-charge');
    const cooldownPauseVal = getVal('cooldown-pause');
    const hasCooldownPair = cooldownChargeVal && cooldownPauseVal;

    for (const mapping of CONFIG_MAPPINGS) {
        // Special handling for cooldown pair
        if ((mapping.elementName === 'cooldown-charge' || mapping.elementName === 'cooldown-pause') && !hasCooldownPair) {
            continue;
        }

        const value = getVal(mapping.elementName);
        if (mapping.required || value) {
            commands.push(`${mapping.configName}=${value}`);
        }
    }

    return commands;
}






// Handle settings tab button click
function handleTabButtonClick(e: Event): void {
    const button = e.target as HTMLButtonElement;
    document.querySelectorAll('.tab-button').forEach((btn: Element) => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((pane: Element) => pane.classList.remove('active'));

    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    if (tabId) {
        const tab = base.$(tabId);
        if (tab) tab.classList.add('active');
    }
}

/**
 * Load current ACC Profile
 */
async function loadCurrentConfig(currentProfile: string): Promise<void> {
    try {
        const configResult = await acca.printConfig(currentProfile);
        if (configResult.errno === 0 && configResult.stdout) {
            const configMap = base.parseConfig(configResult.stdout?.trim());
            // Apply config values to UI elements
            for (const mapping of CONFIG_MAPPINGS) {
                const el = base.$(mapping.elementName);
                if (el) {
                    (el as HTMLInputElement | HTMLSelectElement).value = configMap[mapping.configName] || '';
                }
            }
        }
    } catch (e) {
        logger.printToConsole(`Failed to load Profile: ${e}`, LogLevel.ERROR);
    }
}

/**
 * Load available charging switches
 */
async function loadChargingSwitches(): Promise<void> {
    try {
        const switchesResult = await acc.loadingSwitch();
        const switches = switchesResult?.stdout || '';
        const switchSelect = base.$('charging-switch') as HTMLSelectElement | null;
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
        logger.printToConsole(`Failed to load charging switches: ${e}`, LogLevel.ERROR);
    }
}


/**
 * Handle save config button click
 */
async function handleSaveConfig(): Promise<void> {
    const panel = base.$('settings-panel') as HTMLDivElement;
    if (await customConfirm('Are you sure you want to save these settings?')) {
        base.setButtonLoading(panel, true);
        setTimeout(async () => {
            try {
                const commands = buildConfigCommands();
                // Execute all commands
                for (const cmd of commands) {
                    await acca.setConfig(cmd);
                }
                logger.printToNotify('Profile saved and restart!');
                acca.restartAccdSpawn({});
            }
            catch (e) {
                logger.printToConsole(`${e}`,LogLevel.ERROR);
            }
            finally {
                base.setButtonLoading(panel, false);
            }
        }, 0);


    }
}

/**
 * Handle reset config button click
 */
async function handleLoadDefaultConfig(): Promise<void> {
    const panel = base.$('settings-panel') as HTMLDivElement;
    base.setButtonLoading(panel, true);
    try {
        await loadCurrentConfig(defaultProfilePath);

    } catch (e) {
        logger.printToNotify(`Failed to reset Profile: ${e}`, LogLevel.ERROR);
    }
    finally {
        base.setButtonLoading(panel, false);
    }
}

export { initializeSettingsTab, refreshSettings };
