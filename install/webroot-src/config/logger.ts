import { exec,setLogPrinter} from '../env/ksu';
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

/**
 * 保证logs文件夹存在
 * @returns 
 */
async function initLogDirectory(): Promise<boolean> {
    const result = await exec(`mkdir -p "${config.logDir}" && chmod 755 "${config.logDir}"`);
    if (result.errno === 0) {
        return true;
    }
    else {
        console.error(`Failed to create log directory: ${result.stderr}`);
        return false;
    }
}

async function clearLogs(): Promise<boolean> {
    const result = await exec(`: > "${config.logFile}"`);
    if (result.errno === 0) {
        console.info("Logs cleared");
        return true;
    } else {
        console.error(`Failed to clear logs: ${result.stderr}`);
        return false;
    }
}


type printLog = ((message: string, logLevel: LogLevel) => (void | Promise<void>)) | undefined;
var notificationListener: printLog = undefined;
var consoleListener: printLog = undefined;

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
        console.error(`Failed to write log: ${result.stderr}`);
        return false;
    }
    return true;

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


// 初始化：注入日志打印器到 ksu 模块
setLogPrinter(printToConsole);

export {
    setLogLevel,
    initLogDirectory,
    setNotificationListener,
    setConsoleListener,
    printToNotify,
    printToConsole,
    printToFile,
    clearLogs,
};

export type { LogLevel };
