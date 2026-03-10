// Global application state

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

let globalAccPath: string = '';
let globalAccVersion: string = '';
let globalAccProfilePath: string = '';
let globalLogLevel: LogLevel = LogLevel.INFO;

function setAccPath(path: string): void {
    globalAccPath = path;
}
function getAccPath(): string {
    return globalAccPath;
}

function setAccVersion(version: string): void {
    globalAccVersion = version;
}
function getAccVersion(): string {
    return globalAccVersion;
}
function setAccProfilePath(path: string): void {
    globalAccProfilePath = path;
}
function getAccProfilePath(): string {
    return globalAccProfilePath;
}
function setLogLevel(level: LogLevel): void {
    globalLogLevel = level;
}
function getLogLevel(): LogLevel {
    return globalLogLevel;
}
export {
    setAccPath, getAccPath, setAccVersion, getAccVersion, setAccProfilePath, getAccProfilePath,
    setLogLevel, getLogLevel
}