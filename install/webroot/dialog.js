// Shorthand for document.getElementById
function $(id) {
    return document.getElementById(id);
}
function ensurePromptDom() {
  if ($('custom-prompt-mask') && $('custom-prompt-dialog')) return;

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

  dialog.innerHTML = [
    '<div id="cp-message" style="margin-bottom:12px;font-size:14px;line-height:1.4;"></div>',
    '<input id="cp-input" type="text"',
    ' style="width:100%;padding:10px 12px;border-radius:6px;border:1px solid #444;background:#121212;color:#fff;outline:none;box-sizing:border-box;"/>',
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">',
    '  <button id="cp-cancel" style="padding:8px 14px;border-radius:6px;border:1px solid #555;background:#2b2b2b;color:#ddd;cursor:pointer;">Cancel</button>',
    '  <button id="cp-ok" style="padding:8px 14px;border-radius:6px;border:1px solid #0a7;background:#0a7;color:#fff;cursor:pointer;">OK</button>',
    '</div>'
  ].join('');

  document.body.appendChild(mask);
  document.body.appendChild(dialog);
}

async function customPrompt(message, defaultValue = '') {
  ensurePromptDom();
  const mask = $('custom-prompt-mask');
  const dialog = $('custom-prompt-dialog');
  const msgEl = dialog.querySelector('#cp-message');
  const inputEl = dialog.querySelector('#cp-input');
  const okBtn = dialog.querySelector('#cp-ok');
  const cancelBtn = dialog.querySelector('#cp-cancel');

  msgEl.textContent = message || '';
  inputEl.value = defaultValue || '';

  return new Promise((resolve) => {
    function cleanup() {
      mask.style.display = 'none';
      dialog.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      mask.removeEventListener('click', onMaskClick);
    }
    function onOk() { const v = inputEl.value; cleanup(); resolve(v); }
    function onCancel() { cleanup(); resolve(null); }
    function onKey(e) {
      if (e.key === 'Enter') onOk();
      if (e.key === 'Escape') onCancel();
    }
    function onMaskClick(e) { if (e.target === mask) onCancel(); }

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
 * window.prompt在kernelsu中不生效，所以直接用customPrompt
 * @deprecated
 * @param {*} message 
 * @param {*} defaultValue 
 * @returns 
 */
async function promptCompat(message, defaultValue = '') {
  try {
    if (typeof window.prompt === 'function') {
      const v = window.prompt(message, defaultValue);
      if (typeof v === 'string' || v === null) return v;
    }
  } catch (_) { /* ignore and fallback */ }
  return customPrompt(message, defaultValue);
}

export { ensurePromptDom, customPrompt, promptCompat };
