// Status Tab - System status and battery information
import * as logger from '../config/logger';
import * as acc from '../commands/acc';
import { $ } from './base';

/**
 * Load config for display in profile-tab
 */
async function loadConfigDisplay(): Promise<void> {
    try {
        const config = await acc.printConfig() || '';
        const configLines = config.split('\n').filter((l: string) => l.trim());
        const configMap: Record<string, string> = {};

        configLines.forEach((line: string) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                configMap[match[1].trim()] = match[2].trim();
            }
        });

        const chargeLimit = configMap.pause_capacity || configMap.capacity || '-';
        const resumeCharge = configMap.resume_capacity || '-';
        const pauseAt = `${chargeLimit}%`;
        //控制profile界面的数据
        ($('charge-limit') as HTMLElement).textContent = chargeLimit + (chargeLimit !== '-' ? '%' : '');
        ($('resume-charge') as HTMLElement).textContent = resumeCharge + (resumeCharge !== '-' ? '%' : '');
        ($('pause-at') as HTMLElement).textContent = pauseAt;

        logger.printToConsole('Config loaded');
    } catch (e) {
        logger.printToConsole(`Config error: ${e}`, 'ERROR');
    }
}
//todo 可能会添加切换profile的功能
function initializeProfileTab(): void{}

export {loadConfigDisplay,initializeProfileTab}