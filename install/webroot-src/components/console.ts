// Settings Tab - Profile settings management
import * as logger from '@/env/logger';
import { LogLevel } from '@/data/state';
import { $ } from '@/components/base';
import { localStorageKey } from '@/config/setting';

logger.setConsoleListener((message, level) => {
    switch (level) {
        case LogLevel.ERROR: console.error(message); break;
        case LogLevel.WARN: console.warn(message); break;
        case LogLevel.INFO: console.info(message); break;
        default: console.log(message);
    }
    // Debug console elements
    const debugConsole = $('debug-console');
    const lastUpdated = $('last-updated');
    if (debugConsole && debugConsole.style.display != 'none') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        debugConsole.textContent += `${logMessage}\n`;
        debugConsole.scrollTop = debugConsole.scrollHeight;
        if (lastUpdated) lastUpdated.textContent = new Date().toLocaleString();
    }
});
/**
 *  Initialize debug mode from localStorage
 */
function initializeDebugMode(): void {
    const debugConsoleCard = $('debug-console-card');
    const debugModeToggle = $('debug-mode-toggle') as HTMLSelectElement | null;

    const debugModeEnabled = localStorage.getItem(localStorageKey.debugModeToggle) === 'true';

    if (debugModeToggle) debugModeToggle.value = debugModeEnabled ? 'true' : 'false';

    if (debugConsoleCard) {
        if (debugModeEnabled) {
            debugConsoleCard.classList.add('enabled');
            logger.setLogLevel(LogLevel.DEBUG);
        } else {
            debugConsoleCard.classList.remove('enabled');
            logger.setLogLevel(LogLevel.INFO);
        }
    }

    debugModeToggle?.addEventListener('change', (e) => {
        handleDebugModeChange(e.target as HTMLSelectElement, debugConsoleCard);
    });
}

/**
 *  Handle debug mode toggle change
 * @param select 
 * @param debugConsoleCard 
 */
function handleDebugModeChange(select: HTMLSelectElement, debugConsoleCard: HTMLElement | null): void {
    const isEnabled = select.value === 'true';
    localStorage.setItem(localStorageKey.debugModeToggle, String(isEnabled));

    if (debugConsoleCard) {
        if (isEnabled) {
            debugConsoleCard.classList.add('enabled');
            logger.setLogLevel(LogLevel.DEBUG);
        } else {
            debugConsoleCard.classList.remove('enabled');
            logger.setLogLevel(LogLevel.INFO);
        }
    }
}


export { initializeDebugMode }
