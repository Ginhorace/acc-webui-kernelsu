// Profile Tab - Profile management with ProfileCard components
import * as logger from '@/env/logger';
import * as acca from '@/commands/acca';
import * as command from '@/commands/command';
import { getAccProfilePath, LogLevel, setAccProfilePath } from '@/data/state';
import { dataDir, startupProfilePath } from '@/config/setting';
import { ProfileCard } from '@/components/profile-card';
import { customPrompt } from '@/components/dialog';
import { checkAccdProfile, setProfilePanel } from '@/components/base';



// ProfileManager state
const cards: Map<string, ProfileCard> = new Map();
let activePath: string = '';
let container: HTMLElement | null = null;
let ProfilePanelName = 'current-profile-profile';
/**
 * Initialize profile tab
 */
async function initializeProfileTab(): Promise<void> {
}
function clearCard(): HTMLElement | null {
    container = document.getElementById('profile-container');
    if (!container) {
        logger.printToConsole('Profile container not found', LogLevel.ERROR);
        return null;
    }

    // Clear existing cards
    cards.clear();
    container.innerHTML = '';
    return container;
}
/**
 * Refresh all profiles
 */
async function refreshProfile(): Promise<void> {
    clearCard();
    setTimeout(async () => {
        await checkAccdProfile(ProfilePanelName);
        // Get current running accd config path
        let currentProfile = getAccProfilePath();
        if (currentProfile) {
            setProfilePanel(ProfilePanelName, currentProfile);
        }

        // Load startup profile
        await addCard(startupProfilePath, true);

        // Load other profiles
        const profilesResult = await command.loadProfilesPath();
        if (profilesResult.errno === 0 && profilesResult.stdout) {
            profilesResult.stdout
                .trim()
                .split('\n')
                .filter(line => line.trim())
                .forEach(filePath => {
                    addCard(filePath.trim(), false);
                });
        }

        // Set active card based on current config
        activePath = currentProfile;
        setActiveCard(activePath);
    }, 0);

}

/**
 * Handle card selection (collapse other cards)
 */
function handleSelect(selectedCard: ProfileCard): void {
    cards.forEach((card) => {
        if (card !== selectedCard && card.getIsExpanded()) {
            card.collapse();
        }
    });
}

/**
 * Add a profile card
 */
async function addCard(configPath: string, isStartup: boolean): Promise<ProfileCard> {
    const card = new ProfileCard({
        configPath,
        isStartup: isStartup,
        onApply: handleApply,
        onCopy: handleCopy,
        onDelete: handleDelete,
        onSelect: handleSelect,
    });

    cards.set(configPath, card);
    container?.appendChild(card.getElement());
    await card.loadConfig();

    return card;
}

/**
 * Set active card (highlight current profile)
 */
function setActiveCard(path: string): void {
    activePath = path;
    cards.forEach((card, cardPath) => {
        card.setActive(cardPath === path);
    });
}
/**
 * Handle apply profile
 */
async function handleApply(card: ProfileCard): Promise<void> {
    const path = card.getConfigPath();
    await setAccProfilePath(path);
    return new Promise((resolve) => {
        acca.restartAccdSpawn({
            onExit: (code) => {
                if (code === 0) {
                    setProfilePanel(ProfilePanelName, path);
                    setActiveCard(path);
                    logger.printToNotify(`Profile applied : ${path}`);
                } else {
                    logger.printToConsole(`Failed to apply profile (exit code: ${code})`, LogLevel.ERROR);
                }
                resolve();
            },
            onError: (err) => {
                logger.printToConsole(`Apply error: ${err}`, LogLevel.ERROR);
                resolve();
            }
        });
    });
}

/**
 * Handle copy profile
 */
async function handleCopy(card: ProfileCard): Promise<void> {
    const path = card.getConfigPath();
    const profileName = await customPrompt('please input new Profile Name(without blank):')
    if (profileName === null || !profileName) {
        return;
    }
    try {
        // Ensure profiles directory exists
        await command.createProfileDir();
        const newPath = `${dataDir}/profiles/${profileName.replaceAll(' ', '')}.conf`;
        const result = await command.copyProfile(path, newPath);
        if (result.errno === 0) {
            await addCard(newPath, false);
        } else {
            logger.printToConsole(`Failed to copy profile: ${result.stderr}`, LogLevel.ERROR);
        }
    } catch (e) {
        logger.printToConsole(`Copy error: ${e}`, LogLevel.ERROR);
    }
    finally {
        refreshProfile();
    }
}

/**
 * Handle delete profile
 */
async function handleDelete(card: ProfileCard): Promise<void> {
    const path = card.getConfigPath();

    // Cannot delete startup profile
    if (path === startupProfilePath) {
        logger.printToNotify('Cannot delete startup profile', LogLevel.WARN);
        return;
    }
    try {
        // Delete file
        const result = await command.deleteProfile(path);
        if (result.errno === 0) {
            cards.delete(path);
            card.destroy();
        } else {
            logger.printToConsole(`Failed to delete profile: ${result.stderr}`, LogLevel.ERROR);
        }
    } catch (e) {
        logger.printToConsole(`Delete error: ${e}`, LogLevel.ERROR);
    }
    finally {
        refreshProfile();
    }
}

export { initializeProfileTab, refreshProfile };
