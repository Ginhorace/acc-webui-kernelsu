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
 * @param handler - Click event handler
 */
function setOnClick(id: string, handler: () => void | Promise<void>): void {
    const element = $(id) as HTMLButtonElement | null;
    element?.addEventListener('click', handler);
}

// /**
//  * Set button loading state
//  * @param button Button element
//  * @param loading Loading state
//  */
// function setButtonLoading(button: HTMLButtonElement | null, loading: boolean = true): void {
//     if (!button) return;
//     if (loading) {
//         button.classList.add('loading');
//         button.disabled = true;
//     } else {
//         button.classList.remove('loading');
//         button.disabled = false;
//     }
// }
/**
 * Set button loading state
 * @param button Button element
 * @param loading Loading state
 */
function setButtonLoading(button: HTMLButtonElement | null, disable: boolean = true): void {
    if (!button) return;
    if(button.classList.contains('loading')){
        button.classList.remove('loading');
    }
    else{
        button.classList.add('loading');
    }
    //todo 这里disable和css loading中的pointer-events：none有冲突，要不然就设置一个button.activate的属性替代loading
    if (disable) {
        button.disabled = true;
    } else {
        button.disabled = false;
    }
}

// /**
//  * Update status class based on content
//  * @param element Target element
//  * @param value Value to check
//  */
// function updateStatusClass(element: HTMLElement | null, value: string): void {
//     if (!element) return;
//     element.classList.remove('status-good', 'status-bad');
//     const val = value.toString().toLowerCase();
//     if (val.includes('running') || val.includes('ok') || val.includes('charging') || val.includes('uid=0')) {
//         element.classList.add('status-good');
//     } else if (val.includes('error') || val.includes('failed') || val.includes('not') || val.includes('stop')) {
//         element.classList.add('status-bad');
//     }
// }
/**
 * Update status class based on content
 * @param element Target element
 * @param value Value to check
 */
function updateStatusClass(element: HTMLElement | null, value: boolean | ''=''): void {
    if (!element) return;
    element.classList.remove('status-good', 'status-bad');
    if (value==true) {
        element.classList.add('status-good');
    } else if (value==false) {
        element.classList.add('status-bad');
    }
}
export {$,setOnClick,setButtonLoading,updateStatusClass}