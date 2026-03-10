/**
 * 检查是否是ksu环境
 * @returns 
 */
function checkKSUEnvironment(){
    return !!(typeof ksu !== 'undefined' && ksu && ksu.exec);
}
/**
 * 执行指令
 * @param {*} command 
 * @param {*} args 
 * @param {*} timeout 
 * @returns 
 */
async function innerExec(command, args = [], timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (checkKSUEnvironment()) {
            const callback = `cmd_callback_${Date.now()}`;
            let timedOut = false;
            const timer = setTimeout(() => {
                timedOut = true;
                delete window[callback];
                reject(`Command timed out after ${timeout}ms`);
            }, timeout);

            window[callback] = function (errno, stdout, stderr) {
                if (timedOut) return;
                clearTimeout(timer);
                delete window[callback];

                if (errno === 0) {
                    resolve(stdout);
                } else {
                    reject(stderr || `Command failed with error ${errno}`);
                }
            };

            const fullCmd = [command, ...args].map(arg =>
                arg.includes(' ') ? `"${arg.replace(/"/g, '\\"')}"` : arg
            ).join(' ');

            try {
                ksu.exec(fullCmd, callback);
            } catch (e) {
                clearTimeout(timer);
                reject(`Execution error: ${e}`);
            }
        } else {
            reject("KernelSU API not available");
        }
    });
}
export {checkKSUEnvironment,innerExec};