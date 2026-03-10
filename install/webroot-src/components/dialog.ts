/**
 * 通过 ID 获取 DOM 元素的简写函数
 * @param id - 元素的 ID 属性值
 * @returns 找到的 HTMLElement 或 null
 */
function getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function ensurePromptDom(): void {
    if (getElementById('custom-prompt-mask') && getElementById('custom-prompt-dialog')) return;

    const mask = document.createElement('div');
    mask.id = 'custom-prompt-mask';
    Object.assign(mask.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.4)', display: 'none', zIndex: '9998'
    });

    const dialog = document.createElement('div');
    dialog.id = 'custom-prompt-dialog';
    Object.assign(dialog.style, {
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        background: '#1e1e1e', color: '#fff', padding: '16px', borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '90%', maxWidth: '420px', zIndex: '9999'
    });

    // 使用 DOM API 创建元素，避免 XSS 风险
    const messageEl = document.createElement('div');
    messageEl.id = 'cp-message';
    Object.assign(messageEl.style, { marginBottom: '12px', fontSize: '14px', lineHeight: '1.4' });

    const inputEl = document.createElement('input');
    inputEl.id = 'cp-input';
    inputEl.type = 'text';
    Object.assign(inputEl.style, {
        width: '100%', padding: '10px 12px', borderRadius: '6px',
        border: '1px solid #444', background: '#121212', color: '#fff',
        outline: 'none', boxSizing: 'border-box'
    });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' });

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cp-cancel';
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
        padding: '8px 14px', borderRadius: '6px', border: '1px solid #555',
        background: '#2b2b2b', color: '#ddd', cursor: 'pointer'
    });

    const okBtn = document.createElement('button');
    okBtn.id = 'cp-ok';
    okBtn.textContent = 'OK';
    Object.assign(okBtn.style, {
        padding: '8px 14px', borderRadius: '6px', border: '1px solid #0a7',
        background: '#0a7', color: '#fff', cursor: 'pointer'
    });

    buttonContainer.append(cancelBtn, okBtn);
    dialog.append(messageEl, inputEl, buttonContainer);

    document.body.appendChild(mask);
    document.body.appendChild(dialog);
}

/**
 * 自定义 prompt 对话框（异步实现）
 * @param message - 提示消息
 * @param defaultValue - 输入框默认值
 * @returns 用户输入的字符串，或 null（用户取消）
 */
function customPrompt(message: string, defaultValue: string = ''): Promise<string | null> {
    ensurePromptDom();
    const mask = getElementById('custom-prompt-mask') as HTMLDivElement;
    const dialog = getElementById('custom-prompt-dialog') as HTMLDivElement;
    const msgEl = dialog.querySelector('#cp-message') as HTMLDivElement;
    const inputEl = dialog.querySelector('#cp-input') as HTMLInputElement;
    const okBtn = dialog.querySelector('#cp-ok') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#cp-cancel') as HTMLButtonElement;

    msgEl.textContent = message || '';
    inputEl.value = defaultValue || '';

    return new Promise((resolve) => {
        function cleanup(): void {
            mask.style.display = 'none';
            dialog.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKey);
            mask.removeEventListener('click', onMaskClick);
        }
        function onOk(): void {
            const v = inputEl.value;
            cleanup();
            resolve(v);
        }
        function onCancel(): void {
            cleanup();
            resolve(null);
        }
        function onKey(e: KeyboardEvent): void {
            if (e.key === 'Enter') onOk();
            if (e.key === 'Escape') onCancel();
        }
        function onMaskClick(e: MouseEvent): void {
            if ((e.target as HTMLElement) === mask) onCancel();
        }

        mask.style.display = 'block';
        dialog.style.display = 'block';
        setTimeout(() => inputEl.focus(), 0);

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKey);
        mask.addEventListener('click', onMaskClick);
    });
}

/**
 * 兼容性 prompt 函数，优先使用原生 prompt，失败时回退到自定义对话框
 * 注意：window.prompt 在 KernelSU 等 WebUI 环境中可能不生效
 * @param message - 提示消息
 * @param defaultValue - 输入框默认值
 * @returns 用户输入的字符串，或 null（用户取消）
 */
async function promptCompat(message: string, defaultValue: string = ''): Promise<string | null> {
    try {
        if (typeof window.prompt === 'function') {
            const v = window.prompt(message, defaultValue);
            if (typeof v === 'string' || v === null) return v;
        }
    } catch (_) { /* ignore and fallback */ }
    return customPrompt(message, defaultValue);
}

export { customPrompt, promptCompat };
