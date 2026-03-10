// Settings Tab - Profile settings management
import * as logger from '../config/logger';
import { $ } from './base';
logger.setConsoleListener((message, level) => {
    switch (level) {
        case 'ERROR': console.error(message); break;
        case 'WARN': console.warn(message); break;
        case 'INFO': console.info(message); break;
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
// Initialize debug mode from localStorage
function initializeDebugMode(): void {
    const debugConsoleCard = $('debug-console-card');
    const debugModeToggle = $('debug-mode-toggle') as HTMLSelectElement | null;

    const debugModeEnabled = localStorage.getItem('debugModeEnabled') === 'true';

    if (debugModeToggle) debugModeToggle.value = debugModeEnabled ? 'true' : 'false';

    if (debugConsoleCard) {
        if (debugModeEnabled) {
            debugConsoleCard.classList.add('enabled');
            logger.setLogLevel('DEBUG');
        } else {
            debugConsoleCard.classList.remove('enabled');
            logger.setLogLevel('INFO');
        }
    }

    debugModeToggle?.addEventListener('change', (e) => {
        handleDebugModeChange(e.target as HTMLSelectElement, debugConsoleCard);
    });
}

// Handle debug mode toggle change
function handleDebugModeChange(select: HTMLSelectElement, debugConsoleCard: HTMLElement | null): void {
    const isEnabled = select.value === 'true';
    localStorage.setItem('debugModeEnabled', String(isEnabled));

    if (debugConsoleCard) {
        if (isEnabled) {
            debugConsoleCard.classList.add('enabled');
            logger.printToNotify('Debug console enabled - visible on all pages');
            logger.setLogLevel('DEBUG');
        } else {
            debugConsoleCard.classList.remove('enabled');
            logger.printToNotify('Debug console disabled');
            logger.setLogLevel('INFO');
        }
    }
}


export { initializeDebugMode }