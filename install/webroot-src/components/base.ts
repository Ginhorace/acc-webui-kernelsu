// Base utilities - Common DOM and UI helper functions

/**
 * Get element by ID
 * @param id Element ID
 * @returns HTMLElement or null
 */
function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

/**
 * Add click event listener to element by ID
 * @param id - Element ID
 * @param handler - Click event handler, receives the button element
 */
function setOnClick(id: string, handler: (btn: HTMLButtonElement) => void | Promise<void>): void {
    const element = $(id) as HTMLButtonElement | null;
    element?.addEventListener('click', () => handler(element));
}
// Extend HTMLButtonElement to support abort controller
interface ButtonWithAbort extends HTMLButtonElement {
    _abortController?: AbortController | null;
}

/**
 * Toggle button state with cancelable operation
 * @param button Button with _abortController
 * @param onActivate Called when activating, receives AbortController
 * @param onStop Called when stopping
 */
async function toggleButton(
    button: ButtonWithAbort,
    onActivate: (btn: ButtonWithAbort) => Promise<AbortController | null >,
    onStop: (btn: ButtonWithAbort) => void
): Promise<void> {
    if (button._abortController) {
        button._abortController.abort();
        button._abortController = null;
        setButtonActivate(button, false);
        onStop(button);
    } else {
        const controller = await onActivate(button);
        if (controller) {
            button._abortController = controller;
            setButtonActivate(button, true);
        }
    }
}
/**
 * Set button loading state
 * @param button Button element
 * @param loading Loading state
 */
function setButtonLoading(button: HTMLButtonElement, loading: boolean = true): void {
    if (!button) return;
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Set button activate state (toggleable, clickable)
 * @param button Button element
 * @param activate Activate state
 */
function setButtonActivate(button: HTMLButtonElement, activate: boolean = true): void {
    if (!button) return;
    if (activate) {
        button.classList.add('activate');
    } else {
        button.classList.remove('activate');
    }
}

/**
 * Update status class based on content
 * @param element Target element
 * @param value Value to check
 */
function updateStatusClass(element: HTMLElement | null, value: boolean | '' = ''): void {
    if (!element) return;
    element.classList.remove('status-good', 'status-bad');
    if (value == true) {
        element.classList.add('status-good');
    } else if (value == false) {
        element.classList.add('status-bad');
    }
}
export { $, setOnClick, toggleButton, setButtonLoading, setButtonActivate, updateStatusClass }
export type { ButtonWithAbort };