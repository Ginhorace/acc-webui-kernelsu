import { checkKSUEnvironment } from '@/env/ksu';
import * as logger from '@/env/logger';
import { checkId, initLogDirectory } from '@/commands/command';
import * as acc from '@/commands/acc';
import { LogLevel } from '@/data/state';

import { $, updateStatusClass } from '@/components/base';
// Import tab modules
import { initializeStatusTab, refreshStatus } from '@/pages/status';
import { initializeLogsTab } from '@/pages/logs';
import { initializeMaintenanceTab } from '@/pages/maintenance';
import { initializeSettingsTab, refreshSettings } from '@/pages/settings';
import { initializeDebugMode } from '@/components/console';
import { initializeProfileTab, refreshProfile } from '@/pages/profile';
import '@/components/notification'; // side effect: register notification listener

/**
 * 验证系统环境要求
 * 
 * 验证流程：
 * 1. 检查 Root 权限 - 通过 `id` 命令确认是否具有 root 权限
 * 2. 检查 ACC 安装 - 确认 ACC 二进制文件是否存在并获取版本
 * 3. 初始化 UI - 系统验证通过后初始化用户界面
 * 
 * 验证失败时会显示错误通知并更新状态指示器
 */
async function verifySystem(): Promise<void> {
    logger.printToConsole('Starting system verification...');
    // 挂载到全局对象，便于调试调用
    (window as Record<string, unknown>).verifySystem = verifySystem;

    // 获取状态显示元素
    const rootStatus = $('root-status');
    const accInstallStatus = $('acc-install-status');

    // 初始化状态显示为检查中
    if (rootStatus) {
        rootStatus.textContent = 'Checking...';
        updateStatusClass($('root-status'), false);
    }
    if (accInstallStatus) {
        accInstallStatus.textContent = 'Checking...';
        updateStatusClass($('acc-install-status'), false);
    }

    try {
        // === 步骤1: 检查 Root 权限 ===
        await verifyRootAccess();

        // === 步骤2: 检查 ACC 安装状态 ===
        verifyAccInstallation();

        // === 步骤3: 初始化 UI ===
        await initializeUI();
    } catch (e) {
        // 验证失败处理
        logger.printToNotify(`System verification failed: ${e}`, LogLevel.ERROR);

    } finally {
        // 无论成功失败，都隐藏加载遮罩
        hideLoadingOverlay();
    }
}

/**
 * 验证 Root 权限
 * @param statusEl 状态显示元素
 * @throws 如果未获取到 root 权限
 */
async function verifyRootAccess(): Promise<void> {
    logger.printToConsole('Checking root access...');
    // 获取状态显示元素
    const rootStatus = $('root-status');
    const idResult = await checkId();
    const hasRoot = idResult.errno === 0 && idResult.stdout.includes('uid=0');
    if (rootStatus) {
        rootStatus.textContent = hasRoot ? 'Root access OK' : 'Root access failed';
        updateStatusClass(rootStatus, hasRoot);
    }
    if (!hasRoot) {
        throw new Error('Root access not granted');
    }
}

/**
 * 验证 ACC 安装状态
 * @param statusEl 状态显示元素
 */
function verifyAccInstallation(): void {
    // 初始化状态显示为检查中
    const accPath = acc.getAccPath();
    if (accPath) {
        const accInstallStatus = $('acc-install-status');
        if (accInstallStatus) {
            accInstallStatus.textContent = `Found at ${accPath}`;
            updateStatusClass(accInstallStatus, true);
        }

        const accVersionEl = $('acc-version');
        if (accVersionEl) {
            const version = acc.getAccVersion();
            accVersionEl.textContent = version;
            updateStatusClass(accVersionEl, true);
        }
    }
}

/**
 * Initialize UI components
 */
async function initializeUI(): Promise<void> {
    const controlPanel = $('control-panel');
    const profilePanel = $('profile-container');
    const logPanel = $('log-panel');
    const maintenancePanel = $('maintenance-panel');
    const settingsPanel = $('settings-panel');

    if (controlPanel) controlPanel.style.display = 'block';
    if (profilePanel) profilePanel.style.display = 'block';
    if (logPanel) logPanel.style.display = 'block';
    if (maintenancePanel) maintenancePanel.style.display = 'block';
    if (settingsPanel) settingsPanel.style.display = 'block';

    initializeMainTabs();
    // Initialize debug mode toggle
    initializeDebugMode();
    // Initialize all tab modules
    initializeStatusTab();
    initializeLogsTab();
    initializeMaintenanceTab();
    initializeSettingsTab();
    initializeProfileTab();
    // Close modals when clicking outside
    window.addEventListener('click', handleModalClick);
    refreshStatus();
}

// Handle modal click to close when clicking outside
function handleModalClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal')) {
        target.style.display = 'none';
    }
}

/**
 * Initialize main navigation tabs
 */
function initializeMainTabs(): void {
    const navButtons = document.querySelectorAll('.nav-button');

    navButtons.forEach((button: Element) => {
        button.addEventListener('click', handleNavButtonClick);
    });
}

// Handle navigation button click
function handleNavButtonClick(e: Event): void {
    const button = e.currentTarget as HTMLElement;
    const tabId = button.getAttribute('data-main-tab');
    // 如果点击的是当前已激活的按钮，不做任何操作
    if (button.classList.contains('active')) {
        return;
    }
    document.querySelectorAll('.nav-button').forEach((btn: Element) => btn.classList.remove('active'));
    document.querySelectorAll('.main-tab-pane').forEach((pane: Element) => pane.classList.remove('active'));
    button.classList.add('active');
    if (tabId) {
        const tab = $(tabId);
        if (tab) tab.classList.add('active');
        switch (tabId) {
            case 'status-tab': refreshStatus(); break;
            case 'profile-tab': refreshProfile(); break;
            case 'settings-tab': refreshSettings(); break;
            default: break;
        }
    }
    logger.printToConsole(`Switched to tab: ${tabId}`, LogLevel.DEBUG);
}
/**
 * Hide loading overlay
 */
function hideLoadingOverlay(): void {
    const overlay = $('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {

        if (!checkKSUEnvironment()) {
            logger.printToNotify('KernelSU API not available.', LogLevel.ERROR);
            return;
        }
        const initLogResult = await initLogDirectory()
        if (initLogResult.errno !== 0) {
            logger.printToNotify(`Logging initialization failed`, LogLevel.ERROR);
            return;
        }
        if (!acc.initAccPath()) {
            logger.printToNotify('ACC binary not found', LogLevel.ERROR);
            return;
        }
        await verifySystem();

    } catch (e) {
        logger.printToNotify(`Initialization failed: ${e}`, LogLevel.ERROR);
    }
});
