import { execAndLog, printLogToFile } from './logger.js'
const ACC_PATHS = [
    'acc',
    '/data/adb/vr25/acc/acc',
    '/dev/acc',
    '/system/bin/acc',
    '/data/adb/vr25/bin/acc'
];
let globalAccPath = '';
let globalAccVersion = '';
/**
 * 
 * @returns 获得acc执行路径
 */
function getAccPath() {
    return globalAccPath;
}
/**
 * 
 * @returns 获得acc版本号
 */
function getAccVersion() {
    return globalAccVersion;
}
/**
 * 初始化，获得acc路径和版本
 * @returns 成功返回true，找不到返回false
 */
async function initAccPath() {
    ACC_PATHS.unshift(window.ACC.accPath)
    for (const path of ACC_PATHS) {
        try {
            const version = await execAndLog(path, ['-v']);
            printLogToFile(`ACC found at ${path}, version: ${version}`, 'INFO');
            globalAccPath = path;
            globalAccVersion = version.trim();
            return true;
        } catch (e) {
            printLogToFile(`Not found at ${path}: ${e}`, 'WARN');
        }
    }
    return false;
}
/**
 * 执行acc相关指令
 * @param {*} args 
 * @param {*} timeout 
 * @returns 
 */
async function execAccAndLog(args = [], timeout = 10000) {
    if (!globalAccPath) return;
    return execAndLog(globalAccPath, args, timeout);
}

async function testSwitch(params) {
    execAccAndLog('-t 2>&1');
}
/**
 * -i|--info [case insensitive egrep regex (default: ".")]   Show battery info
 */
async function showInfo() {
    return execAccAndLog(['-i']);
}
/**
 * -s|--set   Print current config
 */
async function printConfig() {
    return execAccAndLog(['-s']);
}
/**
 * -H|--health <mAh>   Print estimated battery health
 * @param {number} capacity 单位mAh
 */
async function printHealth(capacity) {
    return execAccAndLog(['-H',capacity.trim()]);
}
/**
 *   -d|--disable [#%, #s, #m, #h or #mv (optional)]   Disable charging
 *  e.g.,
 *    acc -d 70% (do not recharge until capacity <= 70%)
 *    acc -d 1h (do not recharge until 1 hour has passed)
 *    acc -d 4000mv (do not recharge until battery voltage <= 4000mV)
 * @param {*} input #%, #s, #m, #h or #mv
 */
async function disableCharging(input='') {
    execAccAndLog(['-d', input.trim()])
}
/**
 *   -e|--enable [#%, #s, #m, #h or #mv (optional)]   Enable charging
 *  e.g.,
 *    acc -e 75% (recharge to 75%)
 *    acc -e 30m (recharge for 30 minutes)
 *    acc -e 4000mv (recharge to 4000mV)
 * @param {*} input 
 */
async function enableCharging(input='') {
    execAccAndLog(['-e', input.trim()])
}

/**
 * -f|--force|--full [capacity] [-a] [additional opts/args]   Charge once to a given capacity (default: 100%), without restrictions
 *  e.g.,
 *    acc -f 95 (charge to 95%)
 *    acc -f (charge to 100%)
 *    acc -f -s mcc=500 (charge to 100% with a 500 mA limit)
 *    acc -f 90 -a (the -a (auto) tries to restart accd automatically shortly after the charger is unplugged; not supported by all devices)
 * @param {*} input 
 */
async function forceCharging(input='') {
    execAccAndLog(['-f', input.trim()])
}
/**
 *   -R|--resetbs   Reset battery stats
    e.g., acc -R
 * @returns 
 */
async function resetStats() {
    return execAccAndLog(['-R']);
}
/**
 *   -D|--daemon [start|stop|restart]   Manage daemon
 *  e.g.,
 *    acc -D start (alias: accd)
 *    acc -D restart (alias: accd)
 *    accd -D stop (alias: "accd.")
 * @returns 
 */
async function restartAccd() {
    return execAccAndLog(['-D', 'restart']);
}
async function startAccd() {
    return execAccAndLog(['-D', 'start']);
}
async function stopAccd() {
    return execAccAndLog(['-D', 'stop']);
}
/**
 * 
 * @returns "accd version is running (PID pid)" or "accd is not running"
 */
async function checkAccd(){
    return execAccAndLog(['-D']);
}
/**
 *   -l|--log -e|--export   Export all logs to /sdcard/Download/acc-logs-$deviceName.tgz
    e.g., acc -l -e

  -le   Same as -l -e
 */
async function exportLogs() {
    return execAccAndLog(['-le']);
}
/**
 *   -u|--upgrade [-c|--changelog] [-f|--force] [-n|--non-interactive]   Online upgrade/downgrade
    e.g.,
      acc -u dev (upgrade to the latest dev version)
      acc -u (latest version from the current branch)
      acc -u master^1 -f (previous stable release)
      acc -u -f dev^2 (two dev versions below the latest dev)
      acc -u v2020.4.8-beta --force (force upgrade/downgrade to v2020.4.8-beta)
      acc -u -c -n (if update is available, prints version code (integer) and changelog)
      acc -u -c (same as above, but with install prompt)
 */
async function printVersionCode() {
    return execAccAndLog(['-u', '-c', '-n'])
}
/**
 *   -u|--upgrade [-c|--changelog] [-f|--force] [-n|--non-interactive]   Online upgrade/downgrade
    e.g.,
      acc -u dev (upgrade to the latest dev version)
      acc -u (latest version from the current branch)
      acc -u master^1 -f (previous stable release)
      acc -u -f dev^2 (two dev versions below the latest dev)
      acc -u v2020.4.8-beta --force (force upgrade/downgrade to v2020.4.8-beta)
      acc -u -c -n (if update is available, prints version code (integer) and changelog)
      acc -u -c (same as above, but with install prompt)
 * @param {*} params 
 */
async function upgrade(params) {
    return execAccAndLog(['-u', '-f'])
} 
/**
 *   -U|--uninstall   Completely remove acc and AccA
    e.g., acc -U
 * @returns 
 */
async function uninstall() {
    return execAccAndLog(['-U'])
}
/**
 * -b|--rollback [nv]   Restore previous installation; with "n" flag, the config is not restored; with "v" flag, nothing is done other than printing the version that would have been restored
 * @param {*} input 
 */
async function  rollback(input) {
    return execAccAndLog(['-b',input.trim()]);
}
/**
 *  -v|--version   Print acc version and version code
    e.g., acc -v
 * @returns 
 */
async function version() {
    return execAccAndLog(['-v']);
}
/**
 *   -s|--set s:|chargingSwitch:   List known charging switches
    e.g., acc -s s:

  -ss:   Same as above
 * @returns 
 */
async function loadingSwitch() {
    return execAccAndLog(['-s', 's:']);
}
/**
 *   -s|--set r|--reset [a]   Restore default config ("a" is for "all": config and control file blacklists, essentially a hard reset)
    e.g.,
      acc -s r

  -sr [a]   Same as above
 */
async function resetConfig() {
    execAccAndLog(['-sr'])
}
export { execAccAndLog, getAccPath, getAccVersion, initAccPath };
