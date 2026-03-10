import { execAndLog } from '../config/logger';

async function checkAccd(): Promise<string> {
    return execAndLog('pgrep', ['-f', 'accd'], 3000);
}

async function checkId(): Promise<string> {
    return execAndLog('id');
}
//todo 国际化
async function showReadme(): Promise<string> {
    return execAndLog('cat', ['/data/adb/vr25/acc-data/README.md']);
}

async function createProfileDir(): Promise<string> {
    return execAndLog('mkdir', ['-p', '/data/adb/vr25/acc-data/profiles']);
}

export { checkAccd, checkId, showReadme, createProfileDir };
