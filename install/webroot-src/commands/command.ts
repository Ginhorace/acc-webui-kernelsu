import {  ExecResults } from 'env/ksu';
import { execAndLog, config } from '../config/logger';

const { dataDir } = config;

async function checkId(): Promise<ExecResults> {
    return execAndLog('id');
}
//todo 国际化
async function showReadme(): Promise<ExecResults> {
    return execAndLog('cat', [`${dataDir}/README.md`]);
}

async function createProfileDir(): Promise<ExecResults> {
    return execAndLog('mkdir', ['-p', `${dataDir}/profiles`]);
}
/**
 * 保存的是数据解析过print current config到前端的情况，所以与config.txt和 $TMPDIR/.config不同
 * @param profileName 
 * @param configContent 
 * @returns 
 */
async function saveProfileConfig(profileName: string, configContent: string): Promise<ExecResults> {
    
    const escapedConfig = configContent.replace(/'/g, "'\\''");
    return execAndLog(`printf '%s\\n' '${escapedConfig}' > ${dataDir}/profiles/${profileName}.conf`);
}

async function loadProfileConfig(profileName: string): Promise<ExecResults> {
    return execAndLog('cat', [`${dataDir}/profiles/${profileName}.conf`]);
}

export {  checkId, showReadme, createProfileDir, saveProfileConfig, loadProfileConfig };
