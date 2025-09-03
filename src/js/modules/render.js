// Importa funções utilitárias necessárias
import { formatPrice } from './utils.js';

// Variáveis de estado para armazenar os dados
export let products = [];
export let packages = [];
export let categories = [];

/**
 * Atualiza os dados de produtos e pacotes no módulo.
 * @param {Array<Object>} newProducts - Lista de produtos.
 * @param {Array<Object>} newPackages - Lista de pacotes.
 */
export function updateData(newProducts, newPackages) {
    products = newProducts;
    packages = newPackages;
}

/**
 * Renderiza as categorias na tela.
 */
export function renderCategories() {
    const categoriesGrid = document.getElementById("categoriesGrid");
    const categoriesLoading = document.getElementById("categoriesLoading");
    if (!categoriesGrid || !categoriesLoading) return;

    categoriesLoading.style.display = "none";
    categoriesGrid.style.display = "grid";

    // Se extraímos categorias a partir dos dados, renderizamos dinamicamente.
    // Caso contrário, preservamos o conteúdo estático já presente no partial (cards definidos no HTML).
    if (categories && categories.length > 0) {
        categoriesGrid.innerHTML = categories
            .map((category) => `
            <div class="category-card" data-page="ebooks" data-filter="${category.name}">
                <i class="${category.icon}"></i>
                <h3>${category.name}</h3>
                <p>${category.description}</p>
                <span class="category-badge">${category.count} e-books</span>
            </div>
        `)
            .join("");
    }
}

/**
 * Renderiza os pacotes na tela.
 */
export function renderPackages() {
    const packagesGrid = document.getElementById("packagesGrid");
    const packagesLoading = document.getElementById("packagesLoading");
    const packagesPageGrid = document.getElementById("packagesPageGrid");
    const packagesPageLoading = document.getElementById("packagesPageLoading");

    const packageHTML = packages
        .map((pkg) => `
            <div class="package-card">
                <div class="package-header">
                    <h3 class="package-title">${pkg.title}</h3>
                    <p class="package-description">${pkg.description}</p>
                </div>
                <div class="package-price">
                    ${pkg.originalPrice ? `<span class="price-original">${formatPrice(pkg.originalPrice)}</span>` : ""}
                    <span class="price-current">${formatPrice(pkg.price)}</span>
                    ${pkg.discount ? `<span class="price-discount">${pkg.discount} OFF</span>` : ""}
                </div>
                <ul class="package-features">
                    ${pkg.features ? pkg.features.map((feature) => `<li><i class="fas fa-check"></i> ${feature}</li>`).join("") : ""}
                </ul>
                <button class="btn btn-primary btn-full add-to-cart-btn" data-id="${pkg.id}" data-type="package">
                    Adicionar ao Carrinho
                </button>
            </div>
        `)
        .join("");

    if (packagesGrid && packagesLoading) {
        packagesLoading.style.display = "none";
        packagesGrid.style.display = "grid";
        packagesGrid.innerHTML = packageHTML;
    }

    if (packagesPageGrid && packagesPageLoading) {
        packagesPageLoading.style.display = "none";
        packagesPageGrid.style.display = "grid";
        packagesPageGrid.innerHTML = packageHTML;
    }
}

/**
 * Renderiza a lista de produtos na tela.
 * @param {Array<Object>} filteredProducts - (Opcional) A lista de produtos a ser renderizada.
 */
export function renderProducts(filteredProducts = null) {
    const productsToRender = filteredProducts || products;
    const ebooksGrid = document.getElementById("ebooksGrid");
    const ebooksLoading = document.getElementById("ebooksLoading");

    if (!ebooksGrid || !ebooksLoading) return;

    ebooksLoading.style.display = "none";
    ebooksGrid.style.display = "grid";

    ebooksGrid.innerHTML = productsToRender
        .map((product) => `
            <div class="product-card">
                <div class="product-image">
                    <i class="${product.image || "fas fa-book"}"></i>
                </div>
                <div class="product-content">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price">
                        <span class="product-price-value">${formatPrice(product.price)}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-full add-to-cart-btn" data-id="${product.id}" data-type="product">
                            Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            </div>
        `)
        .join("");
}

/**
 * Renderiza os dados do perfil do usuário na interface.
 * @param {Object} userData - Os dados do usuário.
 */
export function renderUserProfile(userData) {
    if (!userData) {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            userData = JSON.parse(storedUserData);
        } else {
            console.warn("Dados do usuário não encontrados para renderizar o perfil.");
            return;
        }
    }
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userPhoneElement = document.getElementById('userPhone');
    if (userNameElement) userNameElement.textContent = userData.name || 'Não informado';
    if (userEmailElement) userEmailElement.textContent = userData.email || 'Não informado';
    if (userPhoneElement) userPhoneElement.textContent = userData.phone || 'Não informado';
    const welcomeMessageElement = document.getElementById('welcome-user-message');
    if (welcomeMessageElement && userData.name) {
        welcomeMessageElement.textContent = `Bem-vindo(a), ${userData.name}!`;
    }
}

/**
 * Função para destacar o botão de filtro ativo.
 * @param {string} category - O nome da categoria a ser destacada.
 */
export function highlightFilterButton(category) {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.filter === category) {
            btn.classList.add("active");
        }
    });
}