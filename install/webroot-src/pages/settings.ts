// Settings Tab - Profile settings management
import * as logger from '@/env/logger';
import { createProfileDir, saveProfileConfig, loadProfileConfig } from '@/commands/command';
import * as acc from '@/commands/acc';
import * as acca from '@/commands/acca';
import { customPrompt } from '@/components/dialog';
import { customConfirm } from '@/components/confirm';
import { $, setButtonLoading, setOnClick, parseConfig, setProfilePanel } from '@/components/base';
import { getAccProfilePath, LogLevel } from '@/data/state';

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
 * Get input/select element value
 * @param id
 * @returns 
 */
function getVal(id: string): string {
    const el = $(id);
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


/**
 * todo  -s|--set l|--lang   Change language
    e.g., acc -s l
 */

/**
 *  todo -s|--set p|--print [egrep regex (default: ".")]   Print current config without blank lines (refer to previous examples)

  -sp [egrep regex (default: ".")]   Same as above
 */
/**
 * Initialize settings tab event listeners
 */
function initializeSettingsTab(): void {
    //todo 可以通过-c|--config h string打印帮助?
    setOnClick('load-config-btn', handleLoadConfig);
    setOnClick('save-config-btn', handleSaveConfig);
    setOnClick('reset-config-btn', handleResetConfig);
    setOnClick('save-profile-btn', handleSaveProfile);
    setOnClick('load-profile-btn', handleLoadProfile);
    // Tab switching within settings
    document.querySelectorAll('.tab-button').forEach((button: Element) => {
        button.addEventListener('click', handleTabButtonClick);
    });
}


async function updateSettings(): Promise<void> {
    //todo 要解决forcecharging与其他profile在本页面的冲突。
    setButtonLoading($('settings-panel') as HTMLDivElement,true);
    try{
    await loadChargingSwitches();
    await loadCurrentConfig();
    }
    catch(e){
        logger.printToNotify(`refresh failed:${e}`,LogLevel.ERROR);
    }
    finally{
          setButtonLoading($('settings-panel') as HTMLDivElement,false);
    }
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
 * Load current ACC Profile
 */
async function loadCurrentConfig(): Promise<void> {
    try {
        let currentProfile = getAccProfilePath();
        if (currentProfile) {
            setProfilePanel(ProfilePanelName, currentProfile);
        }
        const configResult = await acca.printConfig();
        const config = configResult?.stdout || '';
        const configMap = parseConfig(config);

        // Apply config values to UI elements
        for (const mapping of CONFIG_MAPPINGS) {
            const el = $(mapping.elementName);
            if (el) {
                (el as HTMLInputElement | HTMLSelectElement).value = configMap[mapping.configName] || '';
            }
        }

        logger.printToConsole('Profile loaded into UI');
    } catch (e) {
        logger.printToNotify(`Failed to load Profile: ${e}`, LogLevel.ERROR);
    }
}

/**
 * Load available charging switches
 */
async function loadChargingSwitches(): Promise<void> {
    try {
        const switchesResult = await acc.loadingSwitch();
        const switches = switchesResult?.stdout || '';
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
        logger.printToConsole(`Failed to load charging switches: ${e}`, LogLevel.ERROR);
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
    const panel = $('settings-panel') as HTMLDivElement;
    if (await customConfirm('Are you sure you want to save these settings?')) {
        setButtonLoading(panel, true);
        setTimeout(async () => {
            try {
                const commands = buildConfigCommands();
                // Execute all commands
                for (const cmd of commands) {
                    await acca.setConfig(cmd);
                }
                logger.printToNotify('Profile saved successfully!');
                acca.restartAccdSpawn({});
            }
            catch (e) {
                logger.printToConsole(`${e}`);
            }
            finally {
                setButtonLoading(panel, false);
            }
        }, 0);


    }
}

/**
 * Handle reset config button click
 */
async function handleResetConfig(): Promise<void> {
    const panel = $('settings-panel') as HTMLDivElement;
    if (await customConfirm('Are you sure you want to reset all settings to defaults?')) {
        setButtonLoading(panel, true);
        setTimeout(async () => {
            try {
                await acca.resetConfig();
                await loadCurrentConfig();
                logger.printToNotify('Profile reset to defaults!');

            } catch (e) {
                logger.printToNotify(`Failed to reset Profile: ${e}`, LogLevel.ERROR);
            }
            finally {
                setButtonLoading(panel, false);
            }
        }, 0);
    }
}

/**
 * Handle save profile button click
 */
async function handleSaveProfile(button: HTMLButtonElement): Promise<void> {
    const profileName = await customPrompt('Enter profile name:');
    if (profileName && profileName.trim()) {
        setButtonLoading(button, true);
        setTimeout(async () => {
            try {
                await createProfileDir();
                const config = buildConfigCommands().join("\n\n");
                await saveProfileConfig(profileName.trim(), config);
                logger.printToNotify(`Profile "${profileName}" saved successfully!`);
            } catch (e) {
                logger.printToNotify(`Failed to save profile: ${e}`, LogLevel.ERROR);
            } finally {
                setButtonLoading(button, false);
            }
        }, 0);
    }
}

/**
 * Handle load profile button click
 */
async function handleLoadProfile(button: HTMLButtonElement): Promise<void> {
    ///todo 这里改成select 选择
    const profileName = await customPrompt('Enter profile name to load:');
    if (profileName && profileName.trim()) {
        setButtonLoading(button, true);
        setTimeout(async () => {
            try {
                const profileResult = await loadProfileConfig(profileName.trim());
                if (profileResult.errno === 0 && profileResult.stdout) {
                    const configMap = parseConfig(profileResult.stdout);
                    // Apply config values to UI elements
                    for (const mapping of CONFIG_MAPPINGS) {
                        const el = $(mapping.elementName);
                        if (el) {
                            (el as HTMLInputElement | HTMLSelectElement).value = configMap[mapping.configName] || '';
                        }
                    }
                    logger.printToNotify(`Profile "${profileName}" loaded successfully!`);
                }
                else {
                    logger.printToNotify(`Failed to load profile: ${profileResult.stderr}`, LogLevel.ERROR);
                }

            } catch (e) {
                logger.printToNotify(`Failed to load profile: ${e}`, LogLevel.ERROR);
            } finally {
                setButtonLoading(button, false);
            }
        }, 0);
    }
}

export { initializeSettingsTab,updateSettings };
