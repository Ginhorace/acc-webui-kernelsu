/**
 * Custom Confirm Dialog - window.confirm replacement
 * 自定义确认对话框 - 替代 window.confirm
 */

function getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
}

function ensureConfirmDom(): void {
    if (getElementById('custom-confirm-mask') && getElementById('custom-confirm-dialog')) return;

    const mask = document.createElement('div');
    mask.id = 'custom-confirm-mask';
    Object.assign(mask.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.4)', display: 'none', zIndex: '9998'
    });

    const dialog = document.createElement('div');
    dialog.id = 'custom-confirm-dialog';
    Object.assign(dialog.style, {
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        background: '#1e1e1e', color: '#fff', padding: '16px', borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '90%', maxWidth: '420px', zIndex: '9999'
    });

    const messageEl = document.createElement('div');
    messageEl.id = 'cc-message';
    Object.assign(messageEl.style, { marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, { display: 'flex', gap: '8px', justifyContent: 'flex-end' });

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cc-cancel';
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
        padding: '8px 16px', borderRadius: '6px', border: '1px solid #555',
        background: '#2b2b2b', color: '#ddd', cursor: 'pointer', fontSize: '14px'
    });

    const okBtn = document.createElement('button');
    okBtn.id = 'cc-ok';
    okBtn.textContent = 'OK';
    Object.assign(okBtn.style, {
        padding: '8px 16px', borderRadius: '6px', border: '1px solid #0a7',
        background: '#0a7', color: '#fff', cursor: 'pointer', fontSize: '14px'
    });

    buttonContainer.append(cancelBtn, okBtn);
    dialog.append(messageEl, buttonContainer);

    document.body.appendChild(mask);
    document.body.appendChild(dialog);
}

/**
 * 自定义确认对话框
 * @param message - 确认消息
 * @returns Promise<boolean> - true 表示确认，false 表示取消
 */
async function customConfirm(message: string): Promise<boolean> {
    ensureConfirmDom();
    const mask = getElementById('custom-confirm-mask') as HTMLDivElement;
    const dialog = getElementById('custom-confirm-dialog') as HTMLDivElement;
    const msgEl = dialog.querySelector('#cc-message') as HTMLDivElement;
    const okBtn = dialog.querySelector('#cc-ok') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#cc-cancel') as HTMLButtonElement;

    msgEl.textContent = message || '';

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
            cleanup();
            resolve(true);
        }
        function onCancel(): void {
            cleanup();
            resolve(false);
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
        okBtn.focus();

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKey);
        mask.addEventListener('click', onMaskClick);
    });
}

/**
 * 兼容性 confirm 函数，优先使用原生 confirm，失败时回退到自定义对话框，kernelsu环境存在window.confirm方法但是无法执行
 * @deprecated
 * @param message - 确认消息
 * @returns Promise<boolean> - true 表示确认，false 表示取消
 */
async function confirmCompat(message: string): Promise<boolean> {
    try {
        if (typeof window.confirm === 'function') {
            return window.confirm(message);
        }
    } catch (_) { /* ignore and fallback */ }
    return customConfirm(message);
}

export { customConfirm, confirmCompat };
