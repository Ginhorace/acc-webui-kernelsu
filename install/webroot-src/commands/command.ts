import { ExecResults,execAndLog } from '../env/ksu';
import { config } from '../config/logger';

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

async function saveProfileConfig(profileName: string, config: string): Promise<ExecResults> {
    return execAndLog('sh', ['-c', `echo '${config.replace(/'/g, "'\\''")}' > ${dataDir}/profiles/${profileName}.conf`]);
}

async function loadProfileConfig(profileName: string): Promise<ExecResults> {
    return execAndLog('cat', [`${dataDir}/profiles/${profileName}.conf`]);
}

export {  checkId, showReadme, createProfileDir, saveProfileConfig, loadProfileConfig };
