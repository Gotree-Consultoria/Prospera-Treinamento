/**
 * Rola um elemento horizontalmente para a esquerda.
 * @param {string} selector - O seletor CSS do elemento a ser rolado.
 */
export function scrollLeft(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollBy({
            left: -element.offsetWidth,
            behavior: 'smooth'
        });
    }
}

/**
 * Rola um elemento horizontalmente para a direita.
 * @param {string} selector - O seletor CSS do elemento a ser rolado.
 */
export function scrollRight(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollBy({
            left: element.offsetWidth,
            behavior: 'smooth'
        });
    }
}