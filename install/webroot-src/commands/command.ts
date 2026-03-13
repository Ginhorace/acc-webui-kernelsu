
import * as logger from '@/env/logger';
import { dataDir } from '@/config/setting';
import { exec as ksuExec, ExecResults } from '@/env/ksu';
import { logDir, logFile } from '@/config/setting';
/**
 * 保证logs文件夹存在
 * @returns 
 */
async function initLogDirectory(): Promise<ExecResults> {
    return ksuExec(`mkdir -p "${logDir}" && chmod 755 "${logDir}"`);

}

/**
 * 根据id检查是否再root环境中
 * @returns 
 */
async function checkId(): Promise<ExecResults> {
    return logger.exec('id');
}
/**
 * 打印readme
 * @returns 
 */
async function showReadme(): Promise<ExecResults> {
    return logger.exec('cat', [`${dataDir}/README.md`]);
}
/**
 * 确保profiles文件夹存在
 * @returns 
 */
async function createProfileDir(): Promise<ExecResults> {
    return logger.exec('mkdir', ['-p', `${dataDir}/profiles`]);
}

/**
 * 检查accd.sh执行使用的配置文件 ,使用$3 == 1 过滤产生的子进程
 * @returns 未运行返回errno 1，使用startup配置返回''，使用配置时返回具体配置路径
 */
async function checkAccdProfile() {
    return logger.exec(`ps -ef | awk '$3 == 1 && /[a]ccd\\.sh/{sub(/.*accd\\.sh[ \\t]*/,"");if($0)print;f=1} END{exit!f}'`);

}
/**
 * 检查accd.sh执行使用的配置文件 
 * @returns 未运行返回errno 1，使用startup配置返回''，使用配置时返回具体配置路径
 */
async function checkAccdResult() {
    return logger.exec(`ps -ef | grep [a]ccd.sh`);

}
/**
 * 获取电池容量
 * @returns 
 */
// 到/sys/class/power_supply/*/charge_full_design，或者是/sys/class/power_supply/battery/uevent，找到POWER_SUPPLY_CHARGE_FULL_DESIGN 
async function checkBatteryCapacity() {
    return logger.exec(`cat /sys/class/power_supply/*/charge_full_design`);
}
/**
 * 读取profiles文件夹下的配置
 * @returns 
 */
async function loadProfilesPath() {
    return logger.exec(`[ -d "${dataDir}/profiles" ] && find "${dataDir}/profiles" -maxdepth 1 -type f`);
}
/**
 * 删除配置
 * @param profilePath 
 * @returns 
 */
async function deleteProfile(profilePath: string): Promise<ExecResults> {
    return logger.exec('rm', [profilePath]);
}
/**
 * 复制配置
 * @param sourcePath 
 * @param destPath 
 * @returns 
 */
async function copyProfile(sourcePath: string, destPath: string): Promise<ExecResults> {
    return logger.exec('cp', [sourcePath, destPath]);
}
/**
 * 清空日志文件
 * @returns 
 */
async function clearLogs(): Promise<ExecResults> {
    return ksuExec(`: > "${logFile}"`);
}

export { initLogDirectory, checkId, showReadme, createProfileDir, loadProfilesPath, checkAccdProfile, deleteProfile, copyProfile, clearLogs,checkBatteryCapacity ,checkAccdResult};
