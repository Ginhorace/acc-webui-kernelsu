import { $ } from './base';
import { setNotificationListener } from '../config/logger'

setNotificationListener((message, level) => {
    const errorBox = $('error-display');
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.className = `error-box ${level.toLowerCase()}`;
    errorBox.style.display = 'block';
    setTimeout(hideNotification, 5000);
})
/**
 * 关闭通知
 */
function hideNotification(): void {
    const errorBox = $('error-display');
    if (errorBox) errorBox.style.display = 'none';
}
