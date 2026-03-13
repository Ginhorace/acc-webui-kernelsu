import { ExecResults } from '@/env/ksu';
import * as logger from '@/env/logger';
import { getAccPath } from '@/commands/acc';
import { getAccProfilePath } from '@/data/state';

/**
 * 执行acca相关指令 支持
 * -D #查看状态
 * -i #打印信息
 * -s = #设置多条配置
 * -s d #打印默认属性
 * -s p #打印当前属性
 * @param args 
 * @returns 
 */
async function execAcca(args: string[] = []): Promise<ExecResults> {
    if (!getAccPath()) {
        return { errno: -1, stdout: '', stderr: 'ACC path not initialized' };
    }
    return logger.exec(getAccPath() + 'a', args);
}
function getAccaPAth(){
    return getAccPath() + 'a';
}
/**
 * acca [config] [option] 
 *   -s|--set prop1=value "prop2=value1 value2"   Set [multiple] properties
 *    e.g.,
 *      acc -s charging_switch=
 *      acc -s pause_capacity=60 resume_capacity=55 (shortcuts: acc -s pc=60 rc=55, acc 60 55)
 *      acc -s "charging_switch=battery/charging_enabled 1 0" resume_capacity=55 pause_capacity=60
 *    Note: all properties have short aliases for faster typing; run "acc -c cat" to see them
 * @param input 
 */
async function setConfig(input: string): Promise<ExecResults> {
    return execAcca([getAccProfilePath(),'-s', input.trim()]);
}
/**
 * -s|--set   Print  config
 */
async function printDefaultConfig(): Promise<ExecResults> {
    return execAcca(['-s','d']);
}
/**
 * -s|--set   Print default config
 */
async function printConfig(profilePath:string): Promise<ExecResults> {
    return execAcca([profilePath,'-s','p']);
}

/**
 * -i|--info [case insensitive egrep regex (default: ".")]   Show battery info
 */
async function showInfo(): Promise<ExecResults> {
    return execAcca([getAccProfilePath(),'-i']);
}

/**
 *   -D|--daemon [start|stop|restart]   Manage daemon
 *  e.g.,
 *    acc -D start (alias: accd)
 *    acc -D restart (alias: accd)
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function restartAccdSpawn(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    ///从apatch启动accd会出现当apatch关闭时，accd也会被关闭的问题，所以使用了“双重脱离”脚本
        // return logger.spawn(getAccaPAth(), [getAccProfilePath(),'-D', 'restart'], options);
    return logger.spawn(`su -c "sh -c 'nohup setsid ${getAccPath()} ${getAccProfilePath()} -D restart >/dev/null 2>&1 &' &"`,[], options);
}
/**
 *    -D|--daemon [start|stop|restart]   Manage daemon
 *  e.g.,
 *    accd -D stop (alias: "accd.")
 * @param options 选项（包含回调）
 * @returns AbortController 用于取消进程
 */
function stopAccdSpawn(
    options: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onExit?: (code: number) => void;
        onError?: (err: any) => void;
    } = {}
): AbortController {
    return logger.spawn(getAccaPAth(), ['-D', 'stop'], options);
}


export { setConfig,printDefaultConfig,printConfig,showInfo,restartAccdSpawn,stopAccdSpawn }