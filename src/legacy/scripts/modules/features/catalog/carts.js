// Importa as dependências necessárias de outros módulos
import { products, packages } from '../../shared/render.js';
import { getTrainingById } from '../trainings/trainings.js';
import { formatPrice } from '../../shared/utils.js';
import { showCartNotification } from '../../shared/notifications.js'; // Assumindo um novo módulo para notificações

export let cartItems = [];

/**
 * Adiciona um item ao carrinho.
 * @param {string} itemId - O ID do item.
 * @param {string} itemType - O tipo do item ('product' ou 'package').
 */
export function addToCart(itemId, itemType) {
    let item;
    if (itemType === "product") {
        item = products.find((p) => p.id === itemId);
    } else if (itemType === "package") {
        item = packages.find((p) => p.id === itemId);
    } else if (itemType === 'training') {
        item = getTrainingById(itemId);
    }
    if (!item) return;

    const existingItem = cartItems.find((cartItem) => cartItem.id === itemId && cartItem.type === itemType);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            id: itemId,
            type: itemType,
            title: item.title,
            price: item.price || 0,
            quantity: 1,
            image: item.image || "fas fa-book",
        });
    }
    updateCartDisplay();
    showCartNotification();
    renderCart();
}

/**
 * Remove um item do carrinho.
 * @param {string} itemId - O ID do item a ser removido.
 * @param {string} itemType - O tipo do item ('product' ou 'package').
 */
export function removeFromCart(itemId, itemType) {
    cartItems = cartItems.filter((item) => !(item.id === itemId && item.type === itemType));
    updateCartDisplay();
    renderCart();
}

/**
 * Atualiza a quantidade de um item no carrinho.
 * @param {string} itemId - O ID do item.
 * @param {string} itemType - O tipo do item.
 * @param {number} newQuantity - A nova quantidade.
 */
export function updateQuantity(itemId, itemType, newQuantity) {
    const item = cartItems.find((cartItem) => cartItem.id === itemId && cartItem.type === itemType);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(itemId, itemType);
        } else {
            item.quantity = newQuantity;
            updateCartDisplay();
            renderCart();
        }
    }
}

/**
 * Atualiza o contador de itens no ícone do carrinho.
 */
export function updateCartDisplay() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById("cartCount");
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? "flex" : "none";
    }
}

/**
 * Renderiza o conteúdo do carrinho na página.
 */
export function renderCart() {
    const cartEmpty = document.getElementById("cartEmpty");
    const cartItemsContainer = document.getElementById("cartItems");
    const cartList = document.getElementById("cartList");
    const cartSubtotal = document.getElementById("cartSubtotal");
    const cartTotal = document.getElementById("cartTotal");

    if (cartItems.length === 0) {
        if (cartEmpty) cartEmpty.style.display = "block";
        if (cartItemsContainer) cartItemsContainer.style.display = "none";
        return;
    }

    if (cartEmpty) cartEmpty.style.display = "none";
    if (cartItemsContainer) cartItemsContainer.style.display = "grid";

    if (cartList) {
        cartList.innerHTML = cartItems.map((item) => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="${item.image}"></i>
                </div>
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.title}</h4>
                    <p class="cart-item-price">${formatPrice(item.price)}</p>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-id="${item.id}" data-type="${item.type}" data-action="decrease"><i class="fas fa-minus"></i></button>
                        <input type="number" class="quantity-input" data-id="${item.id}" data-type="${item.type}" value="${item.quantity}" min="1">
                        <button class="quantity-btn" data-id="${item.id}" data-type="${item.type}" data-action="increase"><i class="fas fa-plus"></i></button>
                    </div>
                    <button class="remove-btn" data-id="${item.id}" data-type="${item.type}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join("");
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal;

    if (cartSubtotal) cartSubtotal.textContent = `${formatPrice(subtotal)}`;
    if (cartTotal) cartTotal.textContent = `${formatPrice(total)}`;
}

/**
 * Função de checkout.
 */
export function checkout() {
    alert("Função de checkout será implementada em breve!");
}