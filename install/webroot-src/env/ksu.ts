/**
 * KernelSU 原生 API 接口（运行环境注入的全局对象）
 */
interface KernelSUNative {
    exec(command: string): string;
    exec(command: string, callback: string): void;
}

declare global {
    // eslint-disable-next-line no-var
    var ksu: KernelSUNative | undefined;
    interface Window {
        [key: string]: any;
    }
}

/**
 * 检查是否是ksu环境
 */
function checkKSUEnvironment(): boolean {
    return !!(typeof ksu !== 'undefined' && ksu?.exec);
}

/**
 * 执行指令
 * @param command 命令
 * @param args 参数数组
 * @param timeout 超时时间(ms)
 */
async function exec(command: string, args: string[] = [], timeout: number = 10000): Promise<string> {
    if (!checkKSUEnvironment()) {
        return Promise.reject('KernelSU API not available');
    }

    return new Promise((resolve, reject) => {
        const callback = `cmd_callback_${Date.now()}`;
        const timer = setTimeout(() => {
            delete window[callback];
            reject(`Command timed out after ${timeout}ms`);
        }, timeout);

        window[callback] = (errno: number, stdout: string, stderr: string) => {
            clearTimeout(timer);
            delete window[callback];
            errno === 0 
                ? resolve(stdout) 
                : reject(stderr || `Command failed with errno ${errno}`);
        };

        const fullCmd = args.length 
            ? [command, ...args].map(a => a.includes(' ') ? `"${a}"` : a).join(' ')
            : command;

        try {
            ///see :https://github.com/tiann/KernelSU/blob/423eefe38598ba8090bdc43144e7d5d25a412031/manager/app/src/main/java/me/weishu/kernelsu/ui/webui/WebViewInterface.kt#L36
            ksu!.exec(fullCmd, callback);
        } catch (e) {
            clearTimeout(timer);
            delete window[callback];
            reject(`Execution error: ${e}`);
        }
    });
}

export { checkKSUEnvironment, exec };
