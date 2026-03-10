import { innerExec } from "./ksu.js";
// Logger module extracted from script.js
// Provides logging functions for use across the WebUI

// Configuration
const config = {
    logDir: '/data/adb/vr25/acc-data/logs',
    logFile: '/data/adb/vr25/acc-data/logs/webview-acc.log',
    maxLogLines: 500,
    logLevel: 'DEBUG'
};
const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
/**
 * 保证logs文件夹存在
 * @returns 
 */
async function initLogDirectory() {
    try {
        await innerExec(`mkdir -p "${config.logDir}" && chmod 755 "${config.logDir}"`);
        await info(`Log directory ensured at ${config.logDir}`);
        return true;
    } catch (e) {
        console.error(`Failed to create log directory: ${e}`);
        return false;
    }
}
async function execAndLog(command, args = [], timeout = 10000) {
    await printLogToFile(`Executing: ${command} ${args.join(' ')}`, 'DEBUG');
    return innerExec(command, args, timeout);
}

// Shorthand for document.getElementById
function $(id) {
    return document.getElementById(id);
}

/**
 * 显示通知
 * @param {*} message 
 * @param {*} type 
 */
function showNotification(message, type = 'error') {
    const errorBox = $('error-display');
    errorBox.textContent = message;
    errorBox.className = `error-box ${type}`;
    errorBox.style.display = 'block';
    printLogToConsole(`${type.toUpperCase()}: ${message}`, 'INFO');
    setTimeout(hideNotification, 5000);
}
/**
 * 关闭通知
 */
function hideNotification() {
    $('error-display').style.display = 'none';
}
/**
 * 打印信息到console中
 * @param {*} message 
 * @param {*} level 
 */
function printLogToConsole(message, level = 'DEBUG') {
    switch (level) {
        case 'ERROR': console.error(message); break;
        case 'WARN': console.warn(message); break;
        case 'INFO': console.info(message); break;
        default: console.log(message);
    }
    printLogToWindow(message, level);
}


/**
 * 打印信息到控制台窗口
 * @param {*} message 
 * @param {*} level 
 */
function printLogToWindow(message, level = 'DEBUG') {
    // Debug console elements
    const debugConsole = $('debug-console');
    const lastUpdated = $('last-updated');
    if (debugConsole.style.display != 'none') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        debugConsole.textContent += `${logMessage}\n`;
        debugConsole.scrollTop = debugConsole.scrollHeight;
        lastUpdated.textContent = new Date().toLocaleString();
    }
    printLogToFile(message, level);
}
/**
 * 打印信息到文件中
 * @param {*} message 
 * @param {*} level 
 */
async function printLogToFile(message, level = 'DEBUG') {
    if (shouldLog(level)) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [${level}] ${message}`;
            await innerExec(`echo '${logEntry.replace(/'/g, "'\\''")}' >> "${config.logFile}"`);
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
 * @param {*} level 
 * @returns 
 */
function shouldLog(level) {
    return logLevels.indexOf(level) >= logLevels.indexOf(config.logLevel);
}

async function readLogs() {
    try {
        if (!(await initLogDirectory())) return "Log directory not accessible";

        const fileExists = await innerExec(`[ -f "${config.logFile}" ] && echo "exists"`)
            .then(output => output.includes('exists'))
            .catch(() => false);

        if (!fileExists) {
            await innerExec(`touch "${config.logFile}" && chmod 644 "${config.logFile}"`);
            return "New log file created";
        }

        let logs = await innerExec(`cat "${config.logFile}"`);
        const lineCount = logs.split('\n').filter(line => line.trim()).length;

        if (lineCount > config.maxLogLines) {
            await rotateLogs();
            logs = await innerExec(`cat "${config.logFile}"`);
        }

        return logs || "No logs available";
    } catch (e) {
        return `Error reading logs: ${e}`;
    }
}

async function rotateLogs() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${config.logFile}.${timestamp}`;
        await innerExec(`mv "${config.logFile}" "${rotatedFile}" && touch "${config.logFile}" && chmod 644 "${config.logFile}"`);
        await info(`Logs rotated to ${rotatedFile}`);
        return true;
    } catch (e) {
        await error(`Log rotation failed: ${e}`);
        return false;
    }
}

async function clearLogs() {
    try {
        await innerExec(`echo "" > "${config.logFile}"`);
        await info("Logs cleared");
        return true;
    } catch (e) {
        await error(`Failed to clear logs: ${e}`);
        return false;
    }
}

async function getRecentLogs(lines = 100) {
    try {
        const logs = await innerExec(`tail -n ${lines} "${config.logFile}"`);
        return logs || "No recent logs available";
    } catch (e) {
        return `Error getting recent logs: ${e}`;
    }
}


export {
    initLogDirectory,
    execAndLog,
    showNotification,
    hideNotification,
    printLogToConsole,
    printLogToFile,
    readLogs,
    rotateLogs,
    clearLogs,
    getRecentLogs,
};
