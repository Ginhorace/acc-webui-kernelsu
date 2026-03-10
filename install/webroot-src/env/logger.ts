import { buildCommand, exec as ksuExec, ExecResults, spawn as keuSpawn, SpawnOptions } from '@/env/ksu';
import {  logFile } from '@/config/setting';
import { getLogLevel, setLogLevel, LogLevel } from '@/data/state';
// Logger module extracted from script.ts
// Provides logging functions for use across the WebUI

const logLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];

type printLog = (message: string, logLevel: LogLevel) => void;

var notificationListener: printLog = () => { };
var consoleListener: printLog = (message) => { console.error(message) };




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
function printToNotify(message: string, level: LogLevel = LogLevel.INFO): void {
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
function printToConsole(message: string, level: LogLevel = LogLevel.INFO): void {
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
async function printToFile(message: string, level: LogLevel = LogLevel.INFO): Promise<boolean> {
    if (!shouldLog(level)) {
        return false;
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    const escapedEntry = logEntry.replace(/'/g, "'\\''");
    const result = await ksuExec(`printf '%s\\n' '${escapedEntry}' >> "${logFile}"`);
    if (result.errno !== 0) {
        consoleListener(`Failed to write log: ${result.stderr}`, LogLevel.ERROR);
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
async function exec(command: string, args: string[] = []): Promise<ExecResults> {
    const fullCmd = buildCommand(command, args);
    printToConsole(`[exec] ${fullCmd}`, LogLevel.DEBUG);
    return await ksuExec(fullCmd);
}
function spawn(
    command: string,
    args: string[] = [],
    options: SpawnOptions = {}
): AbortController {
    const fullCmd = buildCommand(command, args);
    printToConsole(`[exec] ${fullCmd}`, LogLevel.DEBUG);
    return keuSpawn(command, args, options);
}
/**
 * 根据日志等级控制是否打印
 * @param level 
 * @returns 
 */
function shouldLog(level: LogLevel): boolean {
    const currentLevel = logLevels.indexOf(getLogLevel());
    const targetLevel = logLevels.indexOf(level);
    if (targetLevel === -1) return false;
    return targetLevel >= currentLevel;
}

export {
    setLogLevel,
    setNotificationListener,
    setConsoleListener,
    printToNotify,
    printToConsole,
    exec,
    spawn
};
