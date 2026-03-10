import {  ExecResults } from '@/env/ksu';
import * as logger from '@/env/logger';
import { dataDir } from '@/config/setting';

async function checkId(): Promise<ExecResults> {
    return logger.exec('id');
}
//todo 国际化
async function showReadme(): Promise<ExecResults> {
    return logger.exec('cat', [`${dataDir}/README.md`]);
}

async function createProfileDir(): Promise<ExecResults> {
    return logger.exec('mkdir', ['-p', `${dataDir}/profiles`]);
}
/**
 * 保存的是数据解析过print current config到前端的情况，所以与config.txt和 $TMPDIR/.config不同
 * @param profileName 
 * @param configContent 
 * @returns 
 */
async function saveProfileConfig(profileName: string, configContent: string): Promise<ExecResults> {
    
    const escapedConfig = configContent.replace(/'/g, "'\\''");
    return logger.exec(`printf '%s\\n' '${escapedConfig}' > ${dataDir}/profiles/${profileName}.conf`);
}

async function loadProfileConfig(profileName: string): Promise<ExecResults> {
    return logger.exec('cat', [`${dataDir}/profiles/${profileName}.conf`]);
}

async function checkAccdProfile() {
    return logger.exec(`ps -ef | grep [a]ccd.sh | tail -n 1 | sed 's/.*accd\.sh //'`);
    
}
async function loadProfilesPath() {
        return logger.exec(`[ -d "${dataDir}/profiles" ] && find "${dataDir}/profiles" -maxdepth 1 -type f`);
}

async function deleteProfile(profilePath: string): Promise<ExecResults> {
    return logger.exec('rm', [profilePath]);
}

async function copyProfile(sourcePath: string, destPath: string): Promise<ExecResults> {
    return logger.exec('cp', [sourcePath, destPath]);
}

export {  checkId, showReadme, createProfileDir, saveProfileConfig, loadProfileConfig, loadProfilesPath, checkAccdProfile, deleteProfile, copyProfile};
