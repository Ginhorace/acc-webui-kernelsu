import { execAndLog } from "./logger.js";

async function checkAccd(){
    return execAndLog('pgrep', ['-f', 'accd'], 3000)
}
async function checkId() {
    return execAndLog('id');
}
async function showReadme() {
    return execAndLog('cat', ['/data/adb/vr25/acc/README.md']);
}
async function  showLogTail(params) {
    //todo 引用logger的路径
    // -T|--logtail ['egrep regex, with "," in place of "|"']   Monitor accd log (tail -F)
    return execAndLog('sh', ['-c', 'tail -n 100 /data/adb/vr25/acc-data/logs/acc-*.log 2>/dev/null || echo "No logs found"']);
}


async function createProfileDir() {
    return execAndLog('mkdir', ['-p', '/data/adb/vr25/acc-data/profiles']);
}
async function name() {
    
}

export {checkAccd,checkId,showReadme,showLogTail,createProfileDir};