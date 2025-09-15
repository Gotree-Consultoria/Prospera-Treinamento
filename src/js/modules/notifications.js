/**
 * Exibe uma notificação temporária no canto superior direito da tela.
 */
export function showCartNotification() {
    const notification = document.createElement("div");
    notification.classList.add("cart-notification");
    notification.textContent = "Item adicionado ao carrinho!";
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 2500);
}

// Simple toast helper usable across the app. Attaches to window for easy access
export function showToast(message, opts = {}) {
    try {
        const div = document.createElement('div');
        div.className = 'app-toast ' + (opts.type === 'error' ? 'toast-error' : 'toast-default');
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => { div.classList.add('visible'); }, 20);
        setTimeout(() => { div.classList.remove('visible'); setTimeout(() => div.remove(), 350); }, opts.duration || 3000);
    } catch (e) { /* ignore */ }
}

// expose convenience on window for modules that prefer to call window.showToast
if (typeof window !== 'undefined') window.showToast = showToast;
