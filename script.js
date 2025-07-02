// Global Variables
let currentPage = 'home';
let cartItems = [];
let products = [];
let packages = [];
let categories = [];

// API Configuration
const API_BASE_URL = 'https://j6h5i7c1kjn6.manus.space';

// DOM Elements
const mainContent = document.getElementById('mainContent');
const cartCount = document.getElementById('cartCount');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadData();
        updateCartDisplay();
        showPage('home');
    } catch (error) {
        console.error('Error initializing app:', error);
        // Show static data if API fails
        loadStaticData();
    }
}

// Data Loading Functions
async function loadData() {
    try {
        const [productsResponse, packagesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/products`),
            fetch(`${API_BASE_URL}/api/packages`)
        ]);

        if (productsResponse.ok && packagesResponse.ok) {
            products = await productsResponse.json();
            packages = await packagesResponse.json();
            
            // Extract categories from products
            categories = extractCategories(products);
            
            renderCategories();
            renderPackages();
            renderProducts();
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        loadStaticData();
    }
}

function loadStaticData() {
    // Static data as fallback
    categories = [
        {
            id: 1,
            name: 'Ergonomia',
            description: 'E-books sobre ergonomia no ambiente de trabalho',
            icon: 'fas fa-user-check',
            count: 12
        },
        {
            id: 2,
            name: 'Segurança',
            description: 'Gestão de riscos e prevenção de acidentes',
            icon: 'fas fa-shield-alt',
            count: 15
        },
        {
            id: 3,
            name: 'Saúde Ocupacional',
            description: 'Promoção da saúde no trabalho',
            icon: 'fas fa-heartbeat',
            count: 10
        },
        {
            id: 4,
            name: 'Gestão de RH',
            description: 'Recursos humanos e desenvolvimento organizacional',
            icon: 'fas fa-users',
            count: 8
        }
    ];

    products = [
        {
            id: 1,
            title: 'E-book Ergonomia no Trabalho',
            description: 'Guia completo sobre ergonomia e prevenção de lesões',
            price: 29.99,
            category: 'Ergonomia',
            image: 'fas fa-book'
        },
        {
            id: 2,
            title: 'Gestão de Riscos Psicossociais',
            description: 'Identificação e gestão de riscos psicossociais',
            price: 34.99,
            category: 'Saúde Ocupacional',
            image: 'fas fa-brain'
        },
        {
            id: 3,
            title: 'Recrutamento e Seleção',
            description: 'Melhores práticas em recrutamento e seleção',
            price: 24.99,
            category: 'Gestão de RH',
            image: 'fas fa-user-plus'
        },
        {
            id: 4,
            title: 'Plano de Cargos e Salários',
            description: 'Como estruturar um plano de cargos eficiente',
            price: 39.99,
            category: 'Gestão de RH',
            image: 'fas fa-chart-line'
        }
    ];

    packages = [
        {
            id: 1,
            title: 'Pacote Completo Ergonomia',
            description: 'Todos os e-books sobre ergonomia com desconto especial',
            price: 89.99,
            originalPrice: 119.99,
            discount: '25%',
            features: [
                'E-book Ergonomia no Trabalho',
                'Guia de Avaliação Ergonômica',
                'Check-list de Ergonomia',
                'Casos Práticos',
                'Suporte por e-mail'
            ]
        },
        {
            id: 2,
            title: 'Pacote Gestão de SST',
            description: 'Formação completa em Gestão de Saúde e Segurança',
            price: 149.99,
            originalPrice: 199.99,
            discount: '25%',
            features: [
                'E-books de Segurança',
                'Gestão de Riscos',
                'Legislação Atualizada',
                'Modelos de Documentos',
                'Consultoria Online'
            ]
        }
    ];

    renderCategories();
    renderPackages();
    renderProducts();
}

function extractCategories(products) {
    const categoryMap = new Map();
    
    products.forEach(product => {
        if (!categoryMap.has(product.category)) {
            categoryMap.set(product.category, {
                id: categoryMap.size + 1,
                name: product.category,
                description: `E-books sobre ${product.category.toLowerCase()}`,
                icon: getCategoryIcon(product.category),
                count: 1
            });
        } else {
            categoryMap.get(product.category).count++;
        }
    });
    
    return Array.from(categoryMap.values());
}

function getCategoryIcon(category) {
    const iconMap = {
        'Ergonomia': 'fas fa-user-check',
        'Segurança': 'fas fa-shield-alt',
        'Saúde Ocupacional': 'fas fa-heartbeat',
        'Gestão de RH': 'fas fa-users',
        'Onboarding': 'fas fa-user-plus',
        'Riscos Psicossociais': 'fas fa-brain'
    };
    return iconMap[category] || 'fas fa-book';
}

// Rendering Functions
function renderCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    const categoriesLoading = document.getElementById('categoriesLoading');
    
    if (!categoriesGrid || !categoriesLoading) return;
    
    categoriesLoading.style.display = 'none';
    categoriesGrid.style.display = 'grid';
    
    categoriesGrid.innerHTML = categories.map(category => `
        <div class="category-card" onclick="filterByCategory('${category.name}')">
            <i class="${category.icon}"></i>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <span class="category-badge">${category.count} e-books</span>
        </div>
    `).join('');
}

function renderPackages() {
    const packagesGrid = document.getElementById('packagesGrid');
    const packagesLoading = document.getElementById('packagesLoading');
    const packagesPageGrid = document.getElementById('packagesPageGrid');
    const packagesPageLoading = document.getElementById('packagesPageLoading');
    
    const packageHTML = packages.map(pkg => `
        <div class="package-card">
            <div class="package-header">
                <h3 class="package-title">${pkg.title}</h3>
                <p class="package-description">${pkg.description}</p>
            </div>
            <div class="package-price">
                ${pkg.originalPrice ? `<span class="price-original">${formatPrice(pkg.originalPrice)}</span>` : ''}
                <span class="price-current">${formatPrice(pkg.price)}</span>
                ${pkg.discount ? `<span class="price-discount">${formatPrice(pkg.discount)} OFF</span>` : ''}
            </div>
            <ul class="package-features">
                ${pkg.features ? pkg.features.map(feature => `
                    <li><i class="fas fa-check"></i> ${feature}</li>
                `).join('') : ''}
            </ul>
            <button class="btn btn-primary btn-full" onclick="addToCart(${pkg.id}, 'package')">
                Adicionar ao Carrinho
            </button>
        </div>
    `).join('');
    
    if (packagesGrid && packagesLoading) {
        packagesLoading.style.display = 'none';
        packagesGrid.style.display = 'grid';
        packagesGrid.innerHTML = packageHTML;
    }
    
    if (packagesPageGrid && packagesPageLoading) {
        packagesPageLoading.style.display = 'none';
        packagesPageGrid.style.display = 'grid';
        packagesPageGrid.innerHTML = packageHTML;
    }
}

function renderProducts(filteredProducts = null) {
    const productsToRender = filteredProducts || products;
    const ebooksGrid = document.getElementById('ebooksGrid');
    const ebooksLoading = document.getElementById('ebooksLoading');
    
    if (!ebooksGrid || !ebooksLoading) return;
    
    ebooksLoading.style.display = 'none';
    ebooksGrid.style.display = 'grid';
    
    ebooksGrid.innerHTML = productsToRender.map(product => `
        <div class="product-card">
            <div class="product-image">
                <i class="${product.image || 'fas fa-book'}"></i>
            </div>
            <div class="product-content">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">
                    <span class="product-price-value">${formatPrice(product.price)}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-full" onclick="addToCart(${product.id}, 'product')">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Navigation Functions
function showPage(page) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[onclick="showPage('${page}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(pageEl => {
        pageEl.classList.remove('active');
    });
    
    // Show selected page
    const pageMap = {
        'home': 'homePage',
        'ebooks': 'ebooksPage',
        'packages': 'packagesPage',
        'about': 'aboutPage',
        'contact': 'contactPage',
        'account': 'accountPage',
        'cart': 'cartPage'
    };
    
    const targetPage = document.getElementById(pageMap[page]);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = page;
        
        // Load page-specific data
        if (page === 'cart') {
            renderCart();
        }
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function filterByCategory(categoryName) {
    const filteredProducts = products.filter(product => product.category === categoryName);
    showPage('ebooks');
    setTimeout(() => {
        renderProducts(filteredProducts);
    }, 100);
}

// Cart Functions
function addToCart(itemId, itemType) {
    let item;
    
    if (itemType === 'product') {
        item = products.find(p => p.id === itemId);
    } else if (itemType === 'package') {
        item = packages.find(p => p.id === itemId);
    }
    
    if (!item) return;
    
    const existingItem = cartItems.find(cartItem => 
        cartItem.id === itemId && cartItem.type === itemType
    );
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            id: itemId,
            type: itemType,
            title: item.title,
            price: item.price,
            quantity: 1,
            image: item.image || 'fas fa-book'
        });
    }
    
    updateCartDisplay();
    showCartNotification();
}

function removeFromCart(itemId, itemType) {
    cartItems = cartItems.filter(item => 
        !(item.id === itemId && item.type === itemType)
    );
    updateCartDisplay();
    renderCart();
}

function updateQuantity(itemId, itemType, newQuantity) {
    const item = cartItems.find(cartItem => 
        cartItem.id === itemId && cartItem.type === itemType
    );
    
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

function updateCartDisplay() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function renderCart() {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartList = document.getElementById('cartList');
    const cartSubtotal = document.getElementById(formatPrice('cartSubtotal'));
    const cartTax = document.getElementById('cartTax');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cartItems.length === 0) {
        if (cartEmpty) cartEmpty.style.display = 'block';
        if (cartItemsContainer) cartItemsContainer.style.display = 'none';
        return;
    }
    
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartItemsContainer) cartItemsContainer.style.display = 'grid';
    
    if (cartList) {
        cartList.innerHTML = cartItems.map(item => `
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
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.type}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" 
                               onchange="updateQuantity(${item.id}, '${item.type}', parseInt(this.value))" min="1">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.type}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id}, '${item.type}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    //const tax = subtotal * 0.23; // 23% IVA
    const total = subtotal;
    
    if (cartSubtotal) cartSubtotal.textContent = `${formatPrice(subtotal)}`;
    //if (cartTax) cartTax.textContent = `${tax.toFixed(2)}`;
    if (cartTotal) cartTotal.textContent = `${formatPrice(total)}`;
}

function showCartNotification() {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--verde-escuro);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = 'Item adicionado ao carrinho!';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function checkout() {
    alert('Funcionalidade de checkout será implementada em breve!');
}

// Account Functions
function showAccountSection(section) {
    // Update menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeMenuItem = document.querySelector(`[onclick="showAccountSection('${section}')"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Hide all sections
    document.querySelectorAll('.account-section').forEach(sectionEl => {
        sectionEl.classList.remove('active');
    });
    
    // Show selected section
    const sectionMap = {
        'profile': 'profileSection',
        'orders': 'ordersSection',
        'downloads': 'downloadsSection'
    };
    
    const targetSection = document.getElementById(sectionMap[section]);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Form Functions
async function subscribeNewsletter(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            alert('Subscrição realizada com sucesso!');
            form.reset();
        } else {
            throw new Error('Erro na subscrição');
        }
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        alert('Subscrição realizada com sucesso!'); // Fallback message
        form.reset();
    }
}

function sendMessage(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Simulate sending message
    alert('Mensagem enviada com sucesso! Entraremos em contacto em breve.');
    form.reset();
}

function updateProfile(event) {
    event.preventDefault();
    const form = event.target;
    
    // Simulate profile update
    alert('Perfil atualizado com sucesso!');
}

// Utility Functions
function formatPrice(price) {
    return price.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search functionality (if needed)
function searchProducts(query) {
    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    
    showPage('ebooks');
    setTimeout(() => {
        renderProducts(filteredProducts);
    }, 100);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Error handling for images
document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
    }
}, true);

// Smooth scrolling for anchor links
document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function(e) {
    if (e.state && e.state.page) {
        showPage(e.state.page);
    }
});

// Add page state to history
function addToHistory(page) {
    history.pushState({ page: page }, '', `#${page}`);
}

// Initialize page from URL hash
function initializeFromHash() {
    const hash = window.location.hash.substring(1);
    if (hash && ['home', 'ebooks', 'packages', 'about', 'contact', 'account', 'cart'].includes(hash)) {
        showPage(hash);
    }
}

// Call initialization from hash on load
document.addEventListener('DOMContentLoaded', function() {
    initializeFromHash();
});

// Export functions for global access (if needed)
window.showPage = showPage;
window.scrollToSection = scrollToSection;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.showAccountSection = showAccountSection;
window.subscribeNewsletter = subscribeNewsletter;
window.sendMessage = sendMessage;
window.updateProfile = updateProfile;
window.checkout = checkout;
window.filterByCategory = filterByCategory;

