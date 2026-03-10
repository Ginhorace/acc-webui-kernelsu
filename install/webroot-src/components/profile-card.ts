// ProfileCard - Single profile panel component
import * as logger from '@/env/logger';
import * as acca from '@/commands/acca';
import { parseConfig } from '@/components/base';
import { LogLevel } from '@/data/state';

export interface ProfileCardOptions {
    configPath: string;
    isDefault: boolean;
    onApply?: (card: ProfileCard) => void | Promise<void>;
    onCopy?: (card: ProfileCard) => void | Promise<void>;
    onDelete?: (card: ProfileCard) => void | Promise<void>;
    onSelect?: (card: ProfileCard) => void;
}

export class ProfileCard {
    private configPath: string;
    private isDefault: boolean;
    private container: HTMLElement;
    private callbacks: ProfileCardOptions;
    private isActive: boolean = false;

    private elements: {
        name: HTMLElement;
        chargeLimit: HTMLElement;
        resumeCharge: HTMLElement;
        pauseAt: HTMLElement;
        btnApply: HTMLButtonElement | null;
        btnCopy: HTMLButtonElement | null;
        btnDelete: HTMLButtonElement | null;
    };

    constructor(options: ProfileCardOptions) {
        this.configPath = options.configPath;
        this.isDefault = options.isDefault;
        this.callbacks = options;

        this.container = document.createElement('div');
        this.container.className = 'card profile-panel';
        this.container.dataset.path = this.configPath;

        this.elements = {
            name: null as any,
            chargeLimit: null as any,
            resumeCharge: null as any,
            pauseAt: null as any,
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
        if (this.isDefault) {
            return 'Default Profile';
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
               <button class="danger-button" data-action="delete"${this.isDefault ? ' disabled' : ''}>Delete</button>`;

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
            <div class="button-group">${buttonsHtml}</div>
        `;

        // Cache DOM references
        this.elements.name = this.container.querySelector('.profile-name')!;
        this.elements.chargeLimit = this.container.querySelector('.charge-limit')!;
        this.elements.resumeCharge = this.container.querySelector('.resume-charge')!;
        this.elements.pauseAt = this.container.querySelector('.pause-at')!;
        this.elements.btnApply = this.container.querySelector('[data-action="apply"]');
        this.elements.btnCopy = this.container.querySelector('[data-action="copy"]');
        this.elements.btnDelete = this.container.querySelector('[data-action="delete"]');
    }

    /**
     * Bind event listeners
     */
    private bindEvents(): void {
        // Card selection
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.matches('button')) {
                this.callbacks.onSelect?.(this);
            }
        });

        // Button actions
        this.elements.btnApply?.addEventListener('click', () => this.handleApply());
        this.elements.btnCopy?.addEventListener('click', () => this.handleCopy());
        this.elements.btnDelete?.addEventListener('click', () => this.handleDelete());
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
            if (this.elements.btnApply) {
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
                logger.printToConsole(`Profile loaded: ${this.getProfileName()}`);
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
        } else {
            this.container.classList.remove('active-profile');
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
