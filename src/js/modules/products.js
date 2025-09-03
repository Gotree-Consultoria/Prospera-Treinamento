import { products } from './render.js';
import { renderProducts } from './render.js';
import { showPage } from './navigation.js';
import { renderTrainingsForSector } from './trainings.js';

/**
 * Filtra os produtos por categoria e renderiza o resultado.
 * @param {string} categoryName - O nome da categoria para filtrar.
 */
export async function filterProductsByCategory(categoryName) {
    // Para visualização estática: sempre mostramos os treinamentos mock
    // (no futuro, quando houver produtos reais, podemos alternar para renderProducts quando aplicável)
    await showPage("ebooks");
    renderTrainingsForSector(categoryName);
}

// Quando a página de ebooks for carregada diretamente, ativar o filtro 'all' automaticamente
document.addEventListener('page:loaded', (e) => {
    if (e?.detail?.page === 'ebooks') {
        // destacar botão 'Todos' na UI de filtros (se presente)
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) {
            allBtn.classList.add('active');
        }
        // Também podemos renderizar todos os treinamentos agregados por setor se desejar
        // Por enquanto apenas garantimos que o filtro 'Todos' esteja ativo.
    }
});

/**
 * Busca produtos com base em uma consulta de pesquisa.
 * @param {string} query - A consulta de pesquisa.
 */
export function searchProducts(query) {
    const filteredProducts = products.filter((product) =>
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    showPage("ebooks");
    renderProducts(filteredProducts);
}