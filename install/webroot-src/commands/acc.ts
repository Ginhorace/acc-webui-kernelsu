import { execAndLog,ExecResults, runSpawn } from '../env/ksu';
import { printToConsole, config } from '../config/logger';

const { binDir, execDir } = config;

const ACC_PATHS: string[] = [
    'acc',
    `${execDir}/acc`,
    '/dev/acc',
    '/system/bin/acc',
    `${binDir}/acc`
];

let globalAccPath: string = '';
let globalAccVersion: string = '';

/**
 * 获得acc执行路径
 * @returns 
 */
function getAccPath(): string {
    return globalAccPath;
}

/**
 * 获得acc版本号
 * @returns 
 */
function getAccVersion(): string {
    return globalAccVersion;
}

/**
 * 初始化，获得acc路径和版本
 * @returns 成功返回true，找不到返回false
 */
async function initAccPath(): Promise<boolean> {
    if (typeof window.ACC !== 'undefined' && window.ACC && window.ACC.accPath) {
        ACC_PATHS.unshift(window.ACC.accPath);
    }
    for (const path of ACC_PATHS) {
        try {
            const result = await execAndLog(path, ['-v']);
            if (result.errno === 0) {
                printToConsole(`ACC found at ${path}, version: ${result.stdout}`);
                globalAccPath = path;
                globalAccVersion = result.stdout.trim();
                return true;
            }
        } catch (e) {
            printToConsole(`Not found at ${path}: ${e}`, 'ERROR');
        }
    }
    return false;
}

/**
 * 执行acc相关指令
 * @param args 
 * @returns 
 */
async function execAccAndLog(args: string[] = []): Promise<ExecResults> {
    if (!globalAccPath) {
        return { errno: -1, stdout: '', stderr: 'ACC path not initialized' };
    }
    return execAndLog(globalAccPath, args);
}


/**
 * -i|--info [case insensitive egrep regex (default: ".")]   Show battery info
 */
async function showInfo(): Promise<ExecResults> {
    return execAccAndLog(['-i']);
}

/**
 * -s|--set   Print current config
 */
async function printConfig(): Promise<ExecResults> {
    return execAccAndLog(['-s']);
}

/**
 * -H|--health <mAh>   Print estimated battery health
 * @param capacity 单位mAh
 */
async function printHealth(capacity: string | undefined): Promise<ExecResults> {
    return execAccAndLog(['-H', capacity?.trim() || '']);
}

/**
 *   -d|--disable [#%, #s, #m, #h or #mv (optional)]   Disable charging
 *  e.g.,
 *    acc -d 70% (do not recharge until capacity <= 70%)
 *    acc -d 1h (do not recharge until 1 hour has passed)
 *    acc -d 4000mv (do not recharge until battery voltage <= 4000mV)
 * @param input #%, #s, #m, #h or #mv
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function disableChargingSpawn(
    input: string,
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return runSpawn(globalAccPath, ['-d', input.trim()], options);
}

/**
 *   -e|--enable [#%, #s, #m, #h or #mv (optional)]   Enable charging
 *  e.g.,
 *    acc -e 75% (recharge to 75%)
 *    acc -e 30m (recharge for 30 minutes)
 *    acc -e 4000mv (recharge to 4000mV)
 * @param input #%, #s, #m, #h or #mv
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function enableChargingSpawn(
    input: string,
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return runSpawn(globalAccPath, ['-e', input.trim()], options);
}

/**
 * -f|--force|--full [capacity] [-a] [additional opts/args]   Charge once to a given capacity (default: 100%), without restrictions
 *  e.g.,
 *    acc -f 95 (charge to 95%)
 *    acc -f (charge to 100%)
 *    acc -f -s mcc=500 (charge to 100% with a 500 mA limit)
 *    acc -f 90 -a (the -a (auto) tries to restart accd automatically shortly after the charger is unplugged; not supported by all devices)
 * @param input 
 */
async function forceCharging(input: string = ''): Promise<ExecResults> {
    return execAccAndLog(['-f', input.trim()]);
}

/**
 *   -R|--resetbs   Reset battery stats
 *    e.g., acc -R
 * @returns 
 */
async function resetStats(): Promise<ExecResults> {
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
async function restartAccd(): Promise<ExecResults> {
    return execAccAndLog(['-D', 'restart']);
}

async function startAccd(): Promise<ExecResults> {
    return execAccAndLog(['-D', 'start']);
}

async function stopAccd(): Promise<ExecResults> {
    return execAccAndLog(['-D', 'stop']);
}

/**
 * @returns "accd version is running (PID pid)" or "accd is not running"
 */
async function checkAccd(): Promise<ExecResults> {
    return execAccAndLog(['-D']);
}

/**
 *   -l|--log -e|--export   Export all logs to /sdcard/Download/acc-logs-$deviceName.tgz
 *    e.g., acc -l -e
 *
 *  -le   Same as -l -e
 */
async function exportLogs(): Promise<ExecResults> {
    return execAccAndLog(['-le']);
}

/**
 *   -u|--upgrade [-c|--changelog] [-f|--force] [-n|--non-interactive]   Online upgrade/downgrade
 *    e.g.,
 *      acc -u dev (upgrade to the latest dev version)
 *      acc -u (latest version from the current branch)
 *      acc -u master^1 -f (previous stable release)
 *      acc -u -f dev^2 (two dev versions below the latest dev)
 *      acc -u v2020.4.8-beta --force (force upgrade/downgrade to v2020.4.8-beta)
 *      acc -u -c -n (if update is available, prints version code (integer) and changelog)
 *      acc -u -c (same as above, but with install prompt)
 */
async function printVersionCode(): Promise<ExecResults> {
    return execAccAndLog(['-u', '-c', '-n']);
}

/**
 *   -u|--upgrade [-c|--changelog] [-f|--force] [-n|--non-interactive]   Online upgrade/downgrade
 *    e.g.,
 *      acc -u dev (upgrade to the latest dev version)
 *      acc -u (latest version from the current branch)
 *      acc -u master^1 -f (previous stable release)
 *      acc -u -f dev^2 (two dev versions below the latest dev)
 *      acc -u v2020.4.8-beta --force (force upgrade/downgrade to v2020.4.8-beta)
 *      acc -u -c -n (if update is available, prints version code (integer) and changelog)
 *      acc -u -c (same as above, but with install prompt)
 */
async function upgrade(): Promise<ExecResults> {
    return execAccAndLog(['-u', '-f']);
}

/**
 *   -U|--uninstall   Completely remove acc and AccA
 *    e.g., acc -U
 * @returns 
 */
async function uninstall(): Promise<ExecResults> {
    return execAccAndLog(['-U']);
}

/**
 * -b|--rollback [nv]   Restore previous installation; with "n" flag, the config is not restored; with "v" flag, nothing is done other than printing the version that would have been restored
 * @param input 
 */
async function rollback(input: string | undefined): Promise<ExecResults> {
    return execAccAndLog(['-b', input?.trim() || '']);
}

/**
 *  -v|--version   Print acc version and version code
 *    e.g., acc -v
 * @returns 
 */
async function version(): Promise<ExecResults> {
    return execAccAndLog(['-v']);
}

/**
 *   -s|--set s:|chargingSwitch:   List known charging switches
 *    e.g., acc -s s:
 *
 *  -ss:   Same as above
 * @returns 
 */
async function loadingSwitch(): Promise<ExecResults> {
    return execAccAndLog(['-s', 's:']);
}

/**
 *   -s|--set prop1=value "prop2=value1 value2"   Set [multiple] properties
 *    e.g.,
 *      acc -s charging_switch=
 *      acc -s pause_capacity=60 resume_capacity=55 (shortcuts: acc -s pc=60 rc=55, acc 60 55)
 *      acc -s "charging_switch=battery/charging_enabled 1 0" resume_capacity=55 pause_capacity=60
 *    Note: all properties have short aliases for faster typing; run "acc -c cat" to see them
 * @param input 
 */
async function setConfig(input: string): Promise<ExecResults> {
    return execAccAndLog(['-s', input.trim()]);
}

/**
 *   -s|--set r|--reset [a]   Restore default config ("a" is for "all": config and control file blacklists, essentially a hard reset)
 *    e.g.,
 *      acc -s r
 *
 *  -sr [a]   Same as above
 */
async function resetConfig(): Promise<ExecResults> {
    return execAccAndLog(['-sr']);
}

/**
 *   -t|--test [ctrl file(s)]   Test charging switches
 *    e.g.,
 *      acc -t (automatic)
 *      acc -t /sys/class/power_supply/battery/charging_enabled
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function testSwitch(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return runSpawn(globalAccPath, ['-t'], options);
}

export {
    execAccAndLog,
    getAccPath,
    getAccVersion,
    initAccPath,
    showInfo,
    printConfig,
    printHealth,
    disableChargingSpawn,
    enableChargingSpawn,
    forceCharging,
    resetStats,
    restartAccd,
    startAccd,
    stopAccd,
    checkAccd,
    exportLogs,
    printVersionCode,
    upgrade,
    uninstall,
    rollback,
    version,
    loadingSwitch,
    setConfig,
    resetConfig,
    testSwitch
};
