// Notificações específicas de carrinho removidas; usar showToast abaixo para mensagens genéricas.

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
