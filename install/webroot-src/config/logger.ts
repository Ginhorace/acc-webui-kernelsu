import { buildCommand, exec, ExecResults, spawn, SpawnOptions } from '../env/ksu';
// Logger module extracted from script.ts
// Provides logging functions for use across the WebUI

// 配置
export const config = {
    binDir: '/data/adb/vr25/bin',
    execDir: '/data/adb/vr25/acc',
    dataDir: '/data/adb/vr25/acc-data',
    logDir: '/data/adb/vr25/acc-data/logs',
    logFile: '/data/adb/vr25/acc-data/logs/webview-acc.log',
    logLevel: 'INFO' as LogLevel
};

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const logLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

type printLog = (message: string, logLevel: LogLevel) => void;

var notificationListener: printLog = () => { };
var consoleListener: printLog = (message) => { console.error(message) };

/**
 * 保证logs文件夹存在
 * @returns 
 */
async function initLogDirectory(): Promise<ExecResults> {
    return exec(`mkdir -p "${config.logDir}" && chmod 755 "${config.logDir}"`);

}

async function clearLogs(): Promise<ExecResults> {
    return exec(`: > "${config.logFile}"`);
}



function setNotificationListener(printLog: printLog) {
    notificationListener = printLog
}
function setConsoleListener(printLog: printLog) {
    consoleListener = printLog
}
/**
 * 显示通知
 * @param message
 * @param type
 */
function printToNotify(message: string, level: LogLevel = 'INFO'): void {
    if (notificationListener) {
        notificationListener(message, level);
    }
    printToConsole(message, level);
}
/**
 * 打印信息到console中
 * @param message
 * @param level
 */
function printToConsole(message: string, level: LogLevel = 'INFO'): void {
    if (consoleListener && shouldLog(level)) {
        consoleListener(message, level);
    }
    printToFile(message, level);
}
/**
 * 打印信息到文件中
 * @param message 
 * @param level 
 */
async function printToFile(message: string, level: LogLevel = 'INFO'): Promise<boolean> {
    if (!shouldLog(level)) {
        return false;
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    const escapedEntry = logEntry.replace(/'/g, "'\\''");
    const result = await exec(`printf '%s\\n' '${escapedEntry}' >> "${config.logFile}"`);
    if (result.errno !== 0) {
        consoleListener(`Failed to write log: ${result.stderr}`, "ERROR");
        return false;
    }
    return true;

}
/**
 * 执行指令并返回完整结果（底层 API）
 * @param command 命令
 * @param args 参数数组
 * @returns 完整的执行结果，包含 errno、stdout、stderr
 */
async function execAndLog(command: string, args: string[] = []): Promise<ExecResults> {
    const fullCmd = buildCommand(command, args);
    printToConsole(`[exec] ${fullCmd}`, 'DEBUG');
    return await exec(fullCmd);
}
function spawnAndLog(
    command: string,
    args: string[] = [],
    options: SpawnOptions = {}
): AbortController {
    const fullCmd = buildCommand(command, args);
    printToConsole(`[exec] ${fullCmd}`, 'DEBUG');
    return spawn(command, args, options);
}
/**
 * 根据日志等级控制是否打印
 * @param level 
 * @returns 
 */
function shouldLog(level: LogLevel): boolean {
    const currentLevel = logLevels.indexOf(config.logLevel);
    const targetLevel = logLevels.indexOf(level);
    if (targetLevel === -1) return false;
    return targetLevel >= currentLevel;
}
function setLogLevel(level: LogLevel) {
    config.logLevel = level;
}

export {
    setLogLevel,
    initLogDirectory,
    setNotificationListener,
    setConsoleListener,
    printToNotify,
    printToConsole,
    printToFile,
    clearLogs,
    execAndLog,
    spawnAndLog
};

export type { LogLevel };
