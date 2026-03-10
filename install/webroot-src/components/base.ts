// Base utilities - Common DOM and UI helper functions

import { startupProfilePath, forceChargingPath } from "@/config/setting";
import * as command from '@/commands/command';
import { printToConsole } from "@/env/logger";
import { LogLevel, setAccProfilePath } from "@/data/state";

// Extend HTMLButtonElement to support abort controller
interface ButtonWithAbort extends HTMLButtonElement {
    _abortController?: AbortController | null;
}

/**
 * 简化getElementById方法
 * @param id Element ID
 * @returns HTMLElement or null
 */
function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

/**
 * Add click event listener to element by ID
 * @param id - Element ID
 * @param handler - Click event handler, receives the button element
 */
function setOnClick(id: string, handler: (btn: HTMLButtonElement) => void | Promise<void>): void {
    const element = $(id) as HTMLButtonElement | null;
    element?.addEventListener('click', () => handler(element));
}


/**
 * Toggle button state with cancelable operation
 * @param button Button with _abortController
 * @param onActivate Called when activating, receives AbortController
 */
async function activateWithAbort(
    button: ButtonWithAbort,
    onActivate: (btn: ButtonWithAbort) => Promise<AbortController | null>
): Promise<void> {
    if (button._abortController) {
        button._abortController.abort();
        button._abortController = null;
        button.classList.remove('activate');
    } else {
        const controller = await onActivate(button);
        if (controller) {
            button._abortController = controller;
            button.classList.add('activate');
        }
    }
}
/**
 * Set button loading state
 * @param button Button element
 * @param loading Loading state
 */
function setButtonLoading(button: HTMLButtonElement | HTMLDivElement, loading: boolean = true): void {
    if (!button) return;
    if (loading) {
        button.classList.add('loading');
        if (button instanceof HTMLButtonElement) {
            button.disabled = true;
        }
    } else {
        button.classList.remove('loading');
        if (button instanceof HTMLButtonElement) {
            button.disabled = false;
        }

    }
}

/**
 * Update status class based on content
 * @param element Target element
 * @param value Value to check
 */
function updateStatusClass(element: HTMLElement | null, value: boolean | '' = ''): void {
    if (!element) return;
    element.classList.remove('status-good', 'status-bad');
    if (value == true) {
        element.classList.add('status-good');
    } else if (value == false) {
        element.classList.add('status-bad');
    }
}

/**
 * Parse config string into key-value map
 * @param config Config string with lines like "key=value"
 * @returns Record of config key-value pairs
 */
function parseConfig(config: string): Record<string, string> {
    const configMap: Record<string, string> = {};
    const configLines = config.split('\n').filter((line: string) => line.trim() && line.includes('='));

    configLines.forEach((line: string) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            configMap[match[1].trim()] = match[2].replaceAll('"', '').trim();
        }
    });

    return configMap;
}

/**
 * 检查配置文件路径并更新panel
 * @param profilePanel 
 */
async function checkAccdProfile(profilePanel: string) {
    const configResult = await command.checkAccdProfile();
    if (configResult.errno === 0) {
        printToConsole(configResult.stdout, LogLevel.DEBUG);
        const currentProfile = configResult.stdout?.trim() || startupProfilePath;
        setProfilePanel(profilePanel, currentProfile);
        setAccProfilePath(currentProfile);
    }
    else {
        //accd没有运行时
        setProfilePanel(profilePanel, '');
        setAccProfilePath('');
    }
}
/**
 * 根据配置路径结果设置panel内容
 * @param panelName 
 * @param path 
 */
function setProfilePanel(panelName: string, path: string) {
    const el = $(panelName);
    if (el) {
        let displayName: string;
        if (!path) {
            displayName = 'accd: Not Running';
        } else if (path === forceChargingPath) {
            displayName = 'accd: Force Charging';
        } else if (path === startupProfilePath) {
            displayName = 'accd profile:Startup';
        } else {
            displayName = 'accd profile:' + (path.split('/').pop() || path);
        }
        el.textContent = displayName;
    }
}
/**
 * 检查是否时强制充电配置路径
 * @param path 
 * @returns 
 */
function isForceCharging(path: string) {
    return path.includes(forceChargingPath);
}

export { $, setOnClick, activateWithAbort, setButtonLoading, updateStatusClass, setProfilePanel, parseConfig, isForceCharging, checkAccdProfile }
export type { ButtonWithAbort };