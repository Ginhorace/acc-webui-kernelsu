import { exec } from '../env/ksu';
// Logger module extracted from script.ts
// Provides logging functions for use across the WebUI

//logConfig
const config = {
    logDir: '/data/adb/vr25/acc-data/logs',
    logFile: '/data/adb/vr25/acc-data/logs/webview-acc.log',
    maxLogLines: 500,
    logLevel: 'INFO' as LogLevel
};

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const logLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

/**
 * 保证logs文件夹存在
 * @returns 
 */
async function initLogDirectory(): Promise<boolean> {
    try {
        await exec(`mkdir -p "${config.logDir}" && chmod 755 "${config.logDir}"`);

        return true;
    } catch (e) {
        console.error(`Failed to create log directory: ${e}`);
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
    if (shouldLog(level)) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [${level}] ${message}`;
            await exec(`echo '${logEntry.replace(/'/g, "'\\''")}' >> "${config.logFile}"`);
            return true;
        } catch (e) {
            console.error(`Failed to write log: ${e}`);
            return false;
        }
    }
    return false;
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
function setLogLevel(level:LogLevel){
    config.logLevel=level;
}




/**
 * 执行并打印打文件中
 * @param command 
 * @param args 
 * @param timeout 
 * @returns 
 */
async function execAndLog(command: string, args: string[] = [], timeout: number = 10000): Promise<string> {
    await printToConsole(`Executing: ${command} ${args.join(' ')}`, 'DEBUG');
    return exec(command, args, timeout);
}

async function readLogs(): Promise<string> {
    try {
        if (!(await initLogDirectory())) return 'Log directory not accessible';

        const fileExists = await exec(`[ -f "${config.logFile}" ] && echo "exists"`)
            .then(output => output.includes('exists'))
            .catch(() => false);

        if (!fileExists) {
            await exec(`touch "${config.logFile}" && chmod 644 "${config.logFile}"`);
            return "New log file created";
        }

        let logs = await exec(`cat "${config.logFile}"`);
        const lineCount = logs.split('\n').filter((line: string) => line.trim()).length;

        if (lineCount > config.maxLogLines) {
            await rotateLogs();
            logs = await exec(`cat "${config.logFile}"`);
        }

        return logs || 'No logs available';
    } catch (e) {
        return `Error reading logs: ${e}`;
    }
}

async function rotateLogs(): Promise<boolean> {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${config.logFile}.${timestamp}`;
        await exec(`mv "${config.logFile}" "${rotatedFile}" && touch "${config.logFile}" && chmod 644 "${config.logFile}"`);
        return true;
    } catch (e) {
        console.error(`Log rotation failed: ${e}`);
        return false;
    }
}

async function clearLogs(): Promise<boolean> {
    try {
        await exec(`echo "" > "${config.logFile}"`);
        console.info("Logs cleared");
        return true;
    } catch (e) {
        console.error(`Failed to clear logs: ${e}`);
        return false;
    }
}

async function getRecentLogs(lines: number = 100): Promise<string> {
    try {
        const logs = await exec(`tail -n ${lines} "${config.logFile}"`);
        return logs || "No recent logs available";
    } catch (e) {
        return `Error getting recent logs: ${e}`;
    }
}


export {
    setLogLevel,
    initLogDirectory,
    execAndLog,
    setNotificationListener,
    setConsoleListener,
    printToNotify,
    printToConsole,
    printToFile,
    readLogs,
    rotateLogs,
    clearLogs,
    getRecentLogs,
};

export type { LogLevel };
