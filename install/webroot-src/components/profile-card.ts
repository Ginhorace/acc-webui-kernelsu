// ProfileCard - Single profile panel component
import * as logger from '@/env/logger';
import * as acca from '@/commands/acca';
import { parseConfig } from '@/components/base';
import { LogLevel } from '@/data/state';

export interface ProfileCardOptions {
    configPath: string;
    isStartup: boolean;
    onApply?: (card: ProfileCard) => void | Promise<void>;
    onCopy?: (card: ProfileCard) => void | Promise<void>;
    onDelete?: (card: ProfileCard) => void | Promise<void>;
    onSelect?: (card: ProfileCard) => void;
}

export class ProfileCard {
    private configPath: string;
    private isStartup: boolean;
    private container: HTMLElement;
    private callbacks: ProfileCardOptions;
    private isActive: boolean = false;
    private isExpanded: boolean = false;

    private elements: {
        name: HTMLElement;
        chargeLimit: HTMLElement;
        resumeCharge: HTMLElement;
        pauseAt: HTMLElement;
        buttonGroup: HTMLElement | null;
        btnApply: HTMLButtonElement | null;
        btnCopy: HTMLButtonElement | null;
        btnDelete: HTMLButtonElement | null;
    };

    constructor(options: ProfileCardOptions) {
        this.configPath = options.configPath;
        this.isStartup = options.isStartup;
        this.callbacks = options;

        this.container = document.createElement('div');
        this.container.className = 'card profile-panel';
        this.container.dataset.path = this.configPath;

        this.elements = {
            name: null as any,
            chargeLimit: null as any,
            resumeCharge: null as any,
            pauseAt: null as any,
            buttonGroup: null,
            btnApply: null,
            btnCopy: null,
            btnDelete: null
        };

        this.render();
        this.bindEvents();
    }

    /**
     * Get config path
     */
    getConfigPath(): string {
        return this.configPath;
    }

    /**
     * Get profile name from path
     */
    private getProfileName(): string {
        if (this.isStartup) {
            return 'Startup Profile';
        }
        const parts = this.configPath.split('/');
        const fileName = parts[parts.length - 1];
        return fileName.replace(/\.(conf|txt)$/i, '');
    }

    /**
     * Render HTML structure
     */
    private render(): void {
        const buttonsHtml = `<button class="primary-button" data-action="apply">Apply</button>
               <button class="success-button" data-action="copy">Copy</button>
               <button class="danger-button" data-action="delete"${this.isStartup ? ' disabled' : ''}>Delete</button>`;

        this.container.innerHTML = `
            <h2 class="profile-name">${this.getProfileName()}</h2>
            <div class="profile-display">
                <div class="status-item">
                    <span class="status-key">Charge Limit:</span>
                    <span class="status-value charge-limit">-</span>
                </div>
                <div class="status-item">
                    <span class="status-key">Resume Charge:</span>
                    <span class="status-value resume-charge">-</span>
                </div>
                <div class="status-item">
                    <span class="status-key">Pause at:</span>
                    <span class="status-value pause-at">-</span>
                </div>
            </div>
            <div class="button-group collapsed">${buttonsHtml}</div>
        `;

        // Cache DOM references
        this.elements.name = this.container.querySelector('.profile-name')!;
        this.elements.chargeLimit = this.container.querySelector('.charge-limit')!;
        this.elements.resumeCharge = this.container.querySelector('.resume-charge')!;
        this.elements.pauseAt = this.container.querySelector('.pause-at')!;
        this.elements.buttonGroup = this.container.querySelector('.button-group');
        this.elements.btnApply = this.container.querySelector('[data-action="apply"]');
        this.elements.btnCopy = this.container.querySelector('[data-action="copy"]');
        this.elements.btnDelete = this.container.querySelector('[data-action="delete"]');
    }

    /**
     * Bind event listeners
     */
    private bindEvents(): void {
        // Card selection - toggle button-group
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.matches('button')) {
                this.toggle();
            }
        });

        // Button actions
        this.elements.btnApply?.addEventListener('click', () => this.handleApply());
        this.elements.btnCopy?.addEventListener('click', () => this.handleCopy());
        this.elements.btnDelete?.addEventListener('click', () => this.handleDelete());
    }

    /**
     * Toggle button-group visibility
     */
    toggle(): void {
        this.isExpanded = !this.isExpanded;
        if (this.elements.buttonGroup) {
            this.elements.buttonGroup.classList.toggle('collapsed', !this.isExpanded);
        }
        this.callbacks.onSelect?.(this);
    }

    /**
     * Expand button-group
     */
    expand(): void {
        this.isExpanded = true;
        if (this.elements.buttonGroup) {
            this.elements.buttonGroup.classList.remove('collapsed');
        }
    }

    /**
     * Collapse button-group
     */
    collapse(): void {
        this.isExpanded = false;
        if (this.elements.buttonGroup) {
            this.elements.buttonGroup.classList.add('collapsed');
        }
    }

    /**
     * Check if expanded
     */
    getIsExpanded(): boolean {
        return this.isExpanded;
    }

    /**
     * Handle apply button click
     */
    private async handleApply(): Promise<void> {
        if (this.elements.btnApply) {
            this.elements.btnApply.disabled = true;
        }
        try {
            await this.callbacks.onApply?.(this);
        } finally {
            // Only re-enable if not active (current profile)
            if (this.elements.btnApply && !this.isActive) {
                this.elements.btnApply.disabled = false;
            }
        }
    }

    /**
     * Handle copy button click
     */
    private async handleCopy(): Promise<void> {
        if (this.elements.btnCopy) {
            this.elements.btnCopy.disabled = true;
        }
        try {
            await this.callbacks.onCopy?.(this);
        } finally {
            if (this.elements.btnCopy) {
                this.elements.btnCopy.disabled = false;
            }
        }
    }

    /**
     * Handle delete button click
     */
    private async handleDelete(): Promise<void> {
        if (this.elements.btnDelete) {
            this.elements.btnDelete.disabled = true;
        }
        try {
            await this.callbacks.onDelete?.(this);
        } finally {
            if (this.elements.btnDelete) {
                this.elements.btnDelete.disabled = false;
            }
        }
    }

    /**
     * Load config and update display
     */
    async loadConfig(): Promise<void> {
        try {
            const result = await acca.printConfig(this.configPath);
            if (result.errno === 0 && result.stdout) {
                const configMap = parseConfig(result.stdout);
                this.updateDisplay(configMap);
                logger.printToConsole(`Profile loaded: ${this.getProfileName()}`,LogLevel.DEBUG);
            } else {
                logger.printToConsole(`Failed to load profile: ${this.getProfileName()}`, LogLevel.ERROR);
            }
        } catch (e) {
            logger.printToConsole(`Config error: ${e}`, LogLevel.ERROR);
        }
    }

    /**
     * Update display with config data
     */
    updateDisplay(configMap: Record<string, string>): void {
        const chargeLimit = configMap.pause_capacity || configMap.capacity || '-';
        const resumeCharge = configMap.resume_capacity || '-';
        const pauseAt = `${chargeLimit}%`;

        this.elements.chargeLimit.textContent = chargeLimit + (chargeLimit !== '-' ? '%' : '');
        this.elements.resumeCharge.textContent = resumeCharge + (resumeCharge !== '-' ? '%' : '');
        this.elements.pauseAt.textContent = pauseAt;
    }

    /**
     * Set active state (highlight current profile)
     */
    setActive(active: boolean): void {
        this.isActive = active;
        if (active) {
            this.container.classList.add('active-profile');
            // Disable apply and delete buttons when active
            if (this.elements.btnApply) {
                this.elements.btnApply.disabled = true;
            }
            if (this.elements.btnDelete) {
                this.elements.btnDelete.disabled = true;
            }
        } else {
            this.container.classList.remove('active-profile');
            // Re-enable buttons when inactive (delete remains disabled if default profile)
            if (this.elements.btnApply) {
                this.elements.btnApply.disabled = false;
            }
            if (this.elements.btnDelete) {
                this.elements.btnDelete.disabled = this.isStartup;
            }
        }
    }

    /**
     * Check if active
     */
    getIsActive(): boolean {
        return this.isActive;
    }

    /**
     * Get container element
     */
    getElement(): HTMLElement {
        return this.container;
    }

    /**
     * Destroy card (remove from DOM)
     */
    destroy(): void {
        this.container.remove();
    }
}
