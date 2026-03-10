import { exec as ksuExec, spawn as ksuSpawn, exit } from 'kernelsu';

/**
 * 日志打印函数类型
 */
type LogPrinter = (message: string, level?: string) => void | Promise<void>;

let logPrinter: LogPrinter | undefined;

/**
 * 设置日志打印器
 * @param printer 日志打印函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setLogPrinter(printer: ((message: string, level?: any) => void | Promise<void>) | undefined) {
    logPrinter = printer;
}

/**
 * 执行结果（与 kernelsu 包类型一致）
 */
interface ExecResults {
    errno: number,
    stdout: string,
    stderr: string
}

declare global {
    var ksu: any;
    interface Window {
        [key: string]: any;
    }
}

/**
 * 检查是否是ksu环境
 */
function checkKSUEnvironment(): boolean {
    return !!(typeof ksu !== 'undefined');
}

/**
 * 构造完整命令字符串
 * @param command 命令
 * @param args 参数数组
 * @returns 完整命令字符串
 */
function buildCommand(command: string, args: string[] = []): string {
    return args.length
        ? [command, ...args].map(a => a.includes(' ') ? `"${a}"` : a).join(' ')
        : command;
}
/**
 * 执行指令并返回完整结果（底层 API）
 * @param command 命令
 * @param args 参数数组
 * @returns 完整的执行结果，包含 errno、stdout、stderr
 */
async function exec(command: string, args: string[] = []): Promise<ExecResults> {
    if (!checkKSUEnvironment()) {
        return { errno: -1, stdout: '', stderr: 'KernelSU API not available' };
    }
    const fullCmd = buildCommand(command, args);
    return await ksuExec(fullCmd);
}
/**
 * 执行指令并返回完整结果（底层 API）
 * @param command 命令
 * @param args 参数数组
 * @returns 完整的执行结果，包含 errno、stdout、stderr
 */
async function execAndLog(command: string, args: string[] = []): Promise<ExecResults> {
    if (!checkKSUEnvironment()) {
        return { errno: -1, stdout: '', stderr: 'KernelSU API not available' };
    }
    const fullCmd = buildCommand(command, args);
    logPrinter?.(`[exec] ${fullCmd}`, 'DEBUG');
    return await ksuExec(fullCmd);
}
/**
 * Spawn 选项
 */
interface SpawnOptions {
    /** stdout 数据回调 */
    onStdout?: (data: string) => void;
    /** stderr 数据回调 */
    onStderr?: (data: string) => void;
    /** 进程退出回调 */
    onExit?: (code: number) => void;
    /** 错误回调 */
    onError?: (error: any) => void;
}

/**
 * 使用 spawn 执行命令（返回 AbortController 用于取消进程）
 * @param command 命令
 * @param args 参数数组
 * @param options 选项
 * @returns AbortController 用于取消进程
 * @example
 * ```ts
 * const controller = runSpawn('logcat', [], {
 *   onStdout: (data) => console.log('out:', data),
 *   onStderr: (data) => console.error('err:', data),
 *   onExit: (code) => console.log('exit:', code),
 * });
 *
 * // 取消进程
 * setTimeout(() => controller.abort(), 3000);
 * ```
 */
function runSpawn(
    command: string,
    args: string[] = [],
    options: SpawnOptions = {}
): AbortController {
    const { onStdout, onStderr, onExit, onError } = options;

    const abortController = new AbortController();

    if (!checkKSUEnvironment()) {
        abortController.abort('KernelSU API not available');
        onError?.('KernelSU API not available');
        return abortController;
    }

    const fullCmd = buildCommand(command, args);
    logPrinter?.(`[spawn] ${fullCmd}`, 'DEBUG');
    const child = ksuSpawn(fullCmd);

    let stopped = false;

    const stop = () => {
        if (!stopped) {
            stopped = true;
            exit();
        }
    };

    // 监听 abort
    abortController.signal.addEventListener('abort', () => {
        stop();
        onError?.(abortController.signal.reason);
    });

    // 监听输出
    child.stdout.on('data', (data: string) => {
        if (!stopped) {
            onStdout?.(data);
        }
    });

    child.stderr.on('data', (data: string) => {
        if (!stopped) {
            onStderr?.(data);
        }
    });

    // 监听退出
    child.on('exit', (code: number) => {
        stopped = true;
        onExit?.(code);
    });

    // 监听错误
    child.on('error', (err: any) => {
        stopped = true;
        onError?.(err);
    });

    return abortController;
}

export { checkKSUEnvironment, exec,execAndLog, runSpawn, setLogPrinter };
export type { ExecResults, SpawnOptions };
