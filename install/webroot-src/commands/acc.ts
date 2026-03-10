import { ExecResults } from '@/env/ksu';
import * as logger from '@/env/logger';
import { getAccPath, getAccVersion, setAccPath, setAccVersion } from '@/data/state';
import { binDir, execDir } from '@/config/setting';

const ACC_PATHS: string[] = [
    'acc',
    `${execDir}/acc`,
    '/dev/acc',
    '/system/bin/acc',
    `${binDir}/acc`
];

/**
 * 初始化，获得acc路径和版本
 * @returns 成功返回true，找不到返回false
 */
async function initAccPath(): Promise<boolean> {
    if (typeof window.ACC !== 'undefined' && window.ACC && window.ACC.accPath) {
        ACC_PATHS.unshift(window.ACC.accPath);
    }
    for (const path of ACC_PATHS) {
        const result = await logger.exec(path, ['-v']);
        if (result.errno === 0) {
            logger.printToConsole(`ACC found at ${path}, version: ${result.stdout}`);
            setAccPath(path);
            setAccVersion(result.stdout.trim());
            return true;
        }
    }
    return false;
}

/**
 * 执行acc相关指令
 * @param args 
 * @returns 
 */
async function execAcc(args: string[] = []): Promise<ExecResults> {
    if (!getAccPath()) {
        return { errno: -1, stdout: '', stderr: 'ACC path not initialized' };
    }
    return logger.exec(getAccPath(), args);
}

/**
 * 执行acc相关指令（spawn模式）
 * @param args 
 * @param options 
 * @returns 
 */
function spawnAcc(
    args: string[] = [],
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return logger.spawn(getAccPath(), args, options);
}


/**
 * -H|--health <mAh>   Print estimated battery health
 * @param capacity 单位mAh
 */
async function printHealth(capacity: string | undefined): Promise<ExecResults> {
    return execAcc(['-H', capacity?.trim() || '']);
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
    return spawnAcc(['-d', input.trim()], options);
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
    return spawnAcc(['-e', input.trim()], options);
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
    return execAcc(['-f', input.trim()]);
}

/**
 *   -R|--resetbs   Reset battery stats
 *    e.g., acc -R
 * @returns 
 */
async function resetStats(): Promise<ExecResults> {
    return execAcc(['-R']);
}



/**
 *   -D|--daemon   Print daemon status, (and if running) version and PID
    e.g., acc -D (alias: "accd,")
 * @returns "accd version is running (PID pid)" or "accd is not running"
 */
async function checkAccd(): Promise<ExecResults> {
    return execAcc(['-D']);
}

/**
 *   -l|--log -e|--export   Export all logs to /sdcard/Download/acc-logs-$deviceName.tgz
 *    e.g., acc -l -e
 *
 *  -le   Same as -l -e
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function exportLogsSpawn(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return spawnAcc(['-le'], options);
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
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function printVersionCodeSpawn(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return spawnAcc(['-u', '-c', '-n'], options);
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
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function upgradeSpawn(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return spawnAcc(['-u', '-f'], options);
}

/**
 *   -U|--uninstall   Completely remove acc and AccA
 *    e.g., acc -U
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function uninstallSpawn(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return logger.spawn('sh', ['-c', `echo yes | "${getAccPath()}" -U`], options);
}

/**
 * -b|--rollback [nv]   Restore previous installation; with "n" flag, the config is not restored; with "v" flag, nothing is done other than printing the version that would have been restored
 * @param input 
 */
async function rollback(input: string | undefined): Promise<ExecResults> {
    return execAcc(['-b', input?.trim() || '']);
}

/**
 *  -v|--version   Print acc version and version code
 *    e.g., acc -v
 * @returns 
 */
async function version(): Promise<ExecResults> {
    return execAcc(['-v']);
}

/**
 *   -s|--set s:|chargingSwitch:   List known charging switches
 *    e.g., acc -s s:
 *  todo 可能需要运行一次-t 测试开关才行
 *  -ss:   Same as above
 * @returns 
 */
async function loadingSwitch(): Promise<ExecResults> {
    return execAcc(['-s', 's:']);
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
    return spawnAcc(['-t'], options);
}

export {
    getAccPath,
    getAccVersion,
    initAccPath,
    printHealth,
    disableChargingSpawn,
    enableChargingSpawn,
    forceCharging,
    resetStats,
    checkAccd,
    exportLogsSpawn,
    printVersionCodeSpawn,
    upgradeSpawn,
    uninstallSpawn,
    rollback,
    version,
    loadingSwitch,
    testSwitch
};
