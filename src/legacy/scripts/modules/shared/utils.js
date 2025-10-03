/**
 * Formata um valor numérico para o padrão monetário brasileiro (BRL).
 * @param {number} price - O valor a ser formatado.
 * @returns {string} O valor formatado como uma string de moeda.
 */
export function formatPrice(price) {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Mapeia categorias com base em uma lista de produtos.
 * @param {Array<Object>} products - A lista de produtos.
 * @returns {Array<Object>} Uma lista de objetos de categoria únicos.
 */
export function extractCategories(products) {
    const categoryMap = new Map();
    products.forEach((product) => {
        const categoryName = product.category;
        if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, { 
                id: categoryMap.size + 1,
                name: categoryName,
                description: `E-books sobre ${categoryName.toLowerCase()}`,
                icon: getCategoryIcon(categoryName),
                count: 1,
            });
        } else {
            categoryMap.get(categoryName).count++;
        }
    });
    return Array.from(categoryMap.values());
}

/**
 * Retorna o ícone associado a uma categoria específica.
 * @param {string} category - O nome da categoria.
 * @returns {string} A classe de ícone Font Awesome.
 */
export function getCategoryIcon(category) {
    const iconMap = {
        Ergonomia: "fas fa-user-check",
        Segurança: "fas fa-shield-alt",
        "Saúde Ocupacional": "fas fa-heartbeat",
        "Gestão de RH": "fas fa-users",
        Onboarding: "fas fa-user-plus",
        "Riscos Psicossociais": "fas fa-brain",
    };
    return iconMap[category] || "fas fa-book";
}

/**
 * Formata um CNPJ para o padrão 00.000.000/0000-00.
 * Aceita strings com ou sem formatação prévia.
 */
export function formatCNPJ(value) {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length !== 14) return value; // se não tiver 14 dígitos, retorna original
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}