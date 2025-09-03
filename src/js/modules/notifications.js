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
