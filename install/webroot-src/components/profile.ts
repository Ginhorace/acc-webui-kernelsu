// Status Tab - System status and battery information
import * as logger from '../config/logger';
import * as acc from '../commands/acc';
import { $, parseConfig } from './base';

/**
 * Load config for display in profile-tab
 */
async function loadConfigDisplay(): Promise<void> {
    try {
        const result = await acc.printConfig();
        const config = result?.stdout || '';
        const configMap = parseConfig(config);
        
        // todo 从文件中读取config -s|--set file
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