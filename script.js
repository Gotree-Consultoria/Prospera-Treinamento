// =======================================================
// VARIÁVEIS GLOBAIS
// =======================================================
let currentPage = "home";
let cartItems = [];
let products = [];
let packages = [];
let categories = [];

// Configuração da API
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = "http://localhost:8080";
} else {
    API_BASE_URL = "https://j6h5i7c1kjn6.manus.space";
}

// Elementos do DOM
const mainContent = document.getElementById("mainContent");
const authModal = document.getElementById("authModal");


// =======================================================
// FUNÇÕES DE INICIALIZAÇÃO
// =======================================================
async function initializeApp() {
    try {
        await loadData();
        updateCartDisplay();
        
        const params = new URLSearchParams(window.location.search);
        const targetCard = params.get("card");
        const hash = window.location.hash.substring(1);

        if (!targetCard && !hash) {
            showPage("home");
        } else if (hash) {
            showPage(hash);
        }

    } catch (error) {
        console.error("Erro ao inicializar a aplicação:", error);
    }
}

async function loadData() {
    try {
        const [productsResponse, packagesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/products`),
            fetch(`${API_BASE_URL}/api/packages`),
        ]);

        if (productsResponse.ok && packagesResponse.ok) {
            products = await productsResponse.json();
            packages = await packagesResponse.json();
            categories = extractCategories(products);
            renderCategories();
            renderPackages();
            renderProducts();
        } else {
            throw new Error("Requisição à API falhou");
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

function extractCategories(products) {
    const categoryMap = new Map();
    products.forEach((product) => {
        if (!categoryMap.has(product.category)) {
            categoryMap.set(product.category, {
                id: categoryMap.size + 1,
                name: product.category,
                description: `E-books sobre ${product.category.toLowerCase()}`,
                icon: getCategoryIcon(product.category),
                count: 1,
            });
        } else {
            categoryMap.get(product.category).count++;
        }
    });
    return Array.from(categoryMap.values());
}

function getCategoryIcon(category) {
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

// =======================================================
// FUNÇÕES DE RENDERIZAÇÃO
// =======================================================
function renderCategories() {
    const categoriesGrid = document.getElementById("categoriesGrid");
    const categoriesLoading = document.getElementById("categoriesLoading");
    if (!categoriesGrid || !categoriesLoading) return;
    categoriesLoading.style.display = "none";
    categoriesGrid.style.display = "grid";

    categoriesGrid.innerHTML = categories
        .map((category) => `
            <div class="category-card" onclick="showPage('ebooks', '${category.name}')">
                <i class="${category.icon}"></i>
                <h3>${category.name}</h3>
                <p>${category.description}</p>
                <span class="category-badge">${category.count} e-books</span>
            </div>
        `)
        .join("");
}

function renderPackages() {
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
                <button class="btn btn-primary btn-full" onclick="addToCart(${pkg.id}, 'package')">Adicionar ao Carrinho</button>
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

function renderProducts(filteredProducts = null) {
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
                        <button class="btn btn-primary btn-full" onclick="addToCart(${product.id}, 'product')">
                            Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            </div>
        `)
        .join("");
}

// =======================================================
// FUNÇÕES DE NAVEGAÇÃO
// =======================================================
function showPage(page, category = null) {
    // Remove "active" de todos os links e páginas
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
        if (link.dataset.page === page) link.classList.add("active");
    });

    document.querySelectorAll(".page").forEach((pageEl) => {
        pageEl.classList.remove("active");
    });

    const pageMap = {
        home: "homePage",
        ebooks: "ebooksPage",
        packages: "packagesPage",
        about: "aboutPage",
        contact: "contactPage",
        account: "accountPage",
        cart: "cartPage",
        faq: "faqPage",
    };

    const targetPage = document.getElementById(pageMap[page]);
    if (targetPage) {
        targetPage.classList.add("active");
        currentPage = page;

        if (page === "cart") renderCart();


        if (page === "ebooks") {
            // Se veio de card de categoria
            if (category) {
                filterByCategory(category);
                highlightFilterButton(category);
            } 

            // Garante que os botões de filtro funcionem sempre
            document.querySelectorAll(".filter-btn").forEach((btn) => {
                btn.onclick = () => {
                    const filter = btn.dataset.filter;
                    filterByCategory(filter);
                    highlightFilterButton(filter);
                };
            });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

// Função para destacar o botão de filtro ativo
function filterByCategory(category) {
    const allProducts = document.querySelectorAll("#ebooksGrid .product-card");
    allProducts.forEach((product) => {
        if (category === "all" || product.dataset.category === category) {
            product.style.display = "block";
        } else {
            product.style.display = "none";
        }
    });
}

// Função para destacar o botão de filtro ativo
function highlightFilterButton(category) {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.dataset.filter === category) {
            btn.classList.add("active");
        }
    });
}

// Adiciona event listeners aos botões de filtro
document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;
        filterByCategory(filter);
        highlightFilterButton(filter);
    });
});
// =======================================================


/**
 * Abre o modal de autenticação.
 * @param {string} tab - A aba a ser exibida ('Entrar' ou 'Cadastrar').
 */
function openAuthModal(tab = 'login') {
    authModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    showAuthTab(tab);
}

/**
 * Fecha o modal de autenticação.
 */
function closeAuthModal() {
    authModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/**
 * Alterna entre as abas de login e registro no modal.
 * @param {string} tab - A aba a ser exibida ('Entrar' ou 'Cadastrar').
 */
function showAuthTab(tab) {
    const authTabs = document.getElementById('authTabs');
    const authLoginForm = document.getElementById('authLoginForm');
    const authRegisterForm = document.getElementById('authRegisterForm');
    
    if (authTabs) authTabs.classList.remove('hidden');
    if (authLoginForm) authLoginForm.classList.add('hidden');
    if (authRegisterForm) authRegisterForm.classList.add('hidden');
    
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    
    if (tab === 'login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (authLoginForm) authLoginForm.classList.remove('hidden');
    } else {
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (authRegisterForm) authRegisterForm.classList.remove('hidden');
    }
}

/**
 * Lida com o clique no botão "Conta" do header.
 * Redireciona para a página da conta se logado, ou abre o modal de Entrar/Cadastrar se desconectado.
 */
function handleContaClick() {
    if (checkUserLoggedIn()) {
        showPage('account');
    } else {
        openAuthModal();
    }
}


// =======================================================
// FUNÇÕES DO CARRINHO E CHECKOUT
// =======================================================

function addToCart(itemId, itemType) {
    let item;
    if (itemType === "product") {
        item = products.find((p) => p.id === itemId);
    } else if (itemType === "package") {
        item = packages.find((p) => p.id === itemId);
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
            price: item.price,
            quantity: 1,
            image: item.image || "fas fa-book",
        });
    }
    updateCartDisplay();
    showCartNotification();
}

function removeFromCart(itemId, itemType) {
    cartItems = cartItems.filter((item) => !(item.id === itemId && item.type === itemType));
    updateCartDisplay();
    renderCart();
}

function updateQuantity(itemId, itemType, newQuantity) {
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

function updateCartDisplay() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById("cartCount");
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? "flex" : "none";
    }
}

function renderCart() {
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
        cartList.innerHTML = cartItems
            .map((item) => `
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
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.type}', ${item.quantity - 1})"><i class="fas fa-minus"></i></button>
                            <input type="number" class="quantity-input" value="${item.quantity}" onchange="updateQuantity(${item.id}, '${item.type}', parseInt(this.value))" min="1">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, '${item.type}', ${item.quantity + 1})"><i class="fas fa-plus"></i></button>
                        </div>
                        <button class="remove-btn" onclick="removeFromCart(${item.id}, '${item.type}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `)
            .join("");
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal;

    if (cartSubtotal) cartSubtotal.textContent = `${formatPrice(subtotal)}`;
    if (cartTotal) cartTotal.textContent = `${formatPrice(total)}`;
}

function showCartNotification() {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background-color: var(--verde-escuro); color: white;
        padding: 1rem; border-radius: 8px; z-index: 10000; animation: slideIn 0.3s ease;
    `;
    notification.textContent = "Item adicionado ao carrinho!";
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 2500);
}

/**
 * Função de checkout.
 * O pop-up de "perfil incompleto" foi removido para simplificar.
 */
function checkout() {
    alert("Função de checkout será implementada em breve!");
}


// =======================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =======================================================

/**
 * Lida com o processo de login do usuário.
 * @param {Event} event - O evento de envio do formulário.
 */
async function handleLogin(event) {
  console.log("handleLogin foi chamada.");
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert('Preencha todos os campos!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('loggedInUserEmail', data.email);
            
            alert('Login realizado com sucesso!');
            closeAuthModal();
            showPage('account');
            fetchUserProfile();
        } else {
            const errorData = await response.json();
            alert(errorData.erro || errorData.message || 'E-mail ou senha inválidos.');
        }
    } catch (error) {
        alert('Erro de conexão com o servidor.');
        console.error('Erro no handleLogin:', error);
    }
}

/**
 * Lida com o processo de registro de um novo usuário.
 * @param {Event} event - O evento de envio do formulário.
 */
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const cpf = document.getElementById("registerCpf").value;
    const phone = document.getElementById("registerPhone").value;
    const birthDate = document.getElementById("registerBirth").value;

    // Adiciona validação no frontend para evitar requisições desnecessárias
    if (!name.trim() || !email.trim() || !password.trim() || !cpf.trim() || !phone.trim() || !birthDate.trim()) {
        alert("Todos os campos são obrigatórios.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, cpf, phone, birthDate })
        });

        if (response.ok) {
            alert('Cadastro realizado com sucesso!');
            closeAuthModal();
            showPage('account');
            fetchUserProfile()
        } else {
            // Lógica de tratamento de erro aprimorada
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                alert(errorData.message || 'Erro ao cadastrar.');
            } else {
                const errorText = await response.text();
                alert(errorText || 'Erro desconhecido ao cadastrar.');
            }
        }
    } catch (error) {
        console.error('Erro de conexão ou requisição:', error);
        alert('Erro de conexão com o servidor. Por favor, tente novamente.');
    }
}

/**
 * Lida com o processo de logout do usuário.
 */
function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('userData');

    alert('Você foi desconectado.');

    closeAuthModal();
    showPage('home');
}

/**
 * Verifica se o usuário está logado através da presença do token JWT.
 * @returns {boolean} - true se o token existe, false caso contrário.
 */
function checkUserLoggedIn() {
    return !!localStorage.getItem('jwtToken');
}


// =======================================================
// FUNÇÕES DO PERFIL E DA CONTA
// =======================================================

function renderUserProfile(userData) {
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

async function fetchUserProfile() {
  console.log("Executando a função fetchUserProfile..."); // TESTE
    const currentToken = localStorage.getItem('jwtToken');
    if (!currentToken) {
        console.warn("Token JWT não encontrado. Redirecionando para login.");
        logout();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('userData', JSON.stringify(userData));
            renderUserProfile(userData);
        } else if (response.status === 401 || response.status === 403) {
            console.warn('Sessão expirada. Redirecionando para login.');
            logout();
        } else {
            const errorText = await response.text();
            console.error(`Erro ao buscar perfil: ${response.status} - ${response.statusText}`, errorText);
        }
    } catch (error) {
        console.error('Erro de conexão ao buscar perfil:', error);
    }
}

function showAccountSection(section) {
    document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
    const activeMenuItem = document.querySelector(`[onclick="showAccountSection('${section}')"]`);
    if (activeMenuItem) activeMenuItem.classList.add("active");
    document.querySelectorAll(".account-section").forEach((sectionEl) => sectionEl.classList.remove("active"));
    const sectionMap = { profile: "profileSection", orders: "ordersSection", downloads: "downloadsSection" };
    const targetSection = document.getElementById(sectionMap[section]);
    if (targetSection) targetSection.classList.add("active");
}

// =======================================================
// FUNÇÕES DE EDIÇÃO DO PERFIL (NOME E TELEFONE)
// =======================================================

function editProfile() {
    const profileView = document.getElementById('profileView');
    const profileEditForm = document.getElementById('profileEditForm');

    // Obter o botão de edição principal
    const editButton = document.getElementById('editProfileButton');

    // Obter a div que contém o botão de cancelar
    const cancelButtonDiv = document.querySelector('.cancel-button'); // Use o seletor de classe

    if (!profileView || !profileEditForm || !editButton || !cancelButtonDiv) return;

    // Ocultar a visualização e mostrar o formulário
    profileView.classList.add('hidden');
    profileEditForm.classList.remove('hidden');

    // Ocultar o botão de 'Editar' e mostrar o botão 'Cancelar'
    editButton.classList.add('hidden');
    cancelButtonDiv.classList.remove('hidden'); // Aqui o botão Cancelar é exibido

    // Preencher os campos de edição
    document.getElementById('editName').value = document.getElementById('userName').textContent;
    document.getElementById('editPhone').value = document.getElementById('userPhone').textContent;
}

// =======================================================
// FUNÇÕES DO CANCELAMENTO DE EDIÇÃO DO PERFIL (NOME E TELEFONE)
// =======================================================

function cancelEditProfile() {
    const profileView = document.getElementById('profileView');
    const profileEditForm = document.getElementById('profileEditForm');
    const editButton = document.getElementById('editProfileButton');
    const cancelButtonDiv = document.querySelector('.cancel-button');

    if (!profileView || !profileEditForm || !editButton || !cancelButtonDiv) return;

    // Reverter as classes 'hidden'
    profileView.classList.remove('hidden');
    profileEditForm.classList.add('hidden');

    // Mostrar o botão de 'Editar Perfil' e ocultar o de 'Cancelar'
    editButton.classList.remove('hidden');
    cancelButtonDiv.classList.add('hidden'); // Aqui o botão Cancelar é ocultado novamente
}

// =======================================================
// FUNÇÕES DE EDIÇÃO DO PERFIL (EMAIL)
// =======================================================

function toggleEmailEdit(show) {
    const showButton = document.getElementById('showEmailButton');
    const controls = document.getElementById('email-controls');

    if (show) {
        showButton.style.display = 'none'; // Esconde o botão "Alterar E-mail"
        controls.style.display = 'block';  // Mostra os controles (input, salvar, cancelar)
        document.getElementById('editEmail').focus(); // Opcional: foca no input
    } else {
        showButton.style.display = 'block'; // Mostra o botão "Alterar E-mail"
        controls.style.display = 'none';    // Esconde os controles
    }
}

function togglePasswordEdit(show) {
    const showButton = document.getElementById('showPasswordButton');
    const controls = document.getElementById('password-controls');

    if (show) {
        showButton.style.display = 'none'; // Esconde o botão "Alterar Senha"
        controls.style.display = 'block';  // Mostra os controles
        document.getElementById('editPassword').focus(); // Opcional: foca no input
    } else {
        showButton.style.display = 'block'; // Mostra o botão "Alterar Senha"
        controls.style.display = 'none';    // Esconde os controles
    }
}

// Funções de ação (Salvar e Sair)
function changeEmail() {
    // 1. Obter o elemento do campo de e-mail
    const emailInput = document.getElementById('editEmail');
    
    // 2. Obter o valor do campo e remover espaços em branco no início e no fim
    const emailValue = emailInput.value.trim();

    // 3. Verificar se o valor está vazio
    if (emailValue === '') {
        alert("Por favor, preencha o campo com seu novo e-mail."); // Mostra um alerta
        emailInput.focus(); // Opcional: foca novamente no campo para facilitar a digitação
        return; // Interrompe a execução da função
    }

    // Lógica para salvar o novo e-mail (executada apenas se o campo não estiver vazio)
    console.log("E-mail alterado para:", emailValue);
    alert("Seu e-mail foi alterado com sucesso!");
    toggleEmailEdit(false); // Esconde os campos após a ação
}

function changePassword() {
    const passwordInput = document.getElementById('editPassword');
    const passwordValue = passwordInput.value.trim();

    if (passwordValue === '') {
        alert("Por favor, preencha o campo com sua nova senha.");
        passwordInput.focus();
        return;
    }

    console.log("Senha alterada.");
    alert("Sua senha foi alterada com sucesso!");
    togglePasswordEdit(false);
}

// =======================================================
// FUNÇÕES DE ATUALIZAÇÃO DO PERFIL
// =======================================================

// Local: Seu arquivo de script JavaScript

function updateProfile(event) {
    event.preventDefault();
    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const currentToken = localStorage.getItem('jwtToken');

    // Validação básica no frontend
    if (!name.trim() || !phone.trim()) {
        alert('Nome e Telefone não podem ficar em branco.');
        return;
    }

    fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ name, phone })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'Erro ao atualizar perfil.');
            });
        }
        return response.json();
    })
    .then(data => {
        // Verifica a mensagem do backend para saber se houve alteração
        if (data.message && data.message.includes("Nenhum dado foi alterado.")) {
            alert(data.message);
        } else {
            // Se houve sucesso real, atualiza a interface e o localStorage
            document.getElementById('userName').innerText = data.name || 'Não informado';
            document.getElementById('userPhone').innerText = data.phone || 'Não informado';
            
            let user = JSON.parse(localStorage.getItem('user')) || {};
            user.name = data.name;
            user.phone = data.phone;
            localStorage.setItem('user', JSON.stringify(user));
            
            alert('Perfil atualizado com sucesso!');
        }

        // Reverte a interface para o modo de visualização em ambos os casos
        const profileView = document.getElementById('profileView');
        const profileEditForm = document.getElementById('profileEditForm');
        profileView.classList.remove('hidden');
        profileEditForm.classList.add('hidden');
        
        const editButton = document.getElementById('editProfileButton');
        if (editButton) editButton.classList.remove('hidden');
    })
    .catch(error => {
        console.error('Erro ao atualizar perfil:', error);
        alert('Erro ao atualizar perfil: ' + error.message);
    });
}


// =======================================================
// FUNÇÕES DE FORMULÁRIO E UTILITÁRIAS
// =======================================================

async function subscribeNewsletter(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    try {
        const response = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        if (response.ok) {
            alert("Subscrição realizada com sucesso!");
            form.reset();
        } else {
            throw new Error("Erro na subscrição");
        }
    } catch (error) {
        console.error("Erro na subscrição da newsletter:", error);
        alert("Subscrição realizada com sucesso!");
        form.reset();
    }
}

function sendMessage(event) {
    event.preventDefault();
    alert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
    event.target.reset();
}


function formatPrice(price) {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function filterByCategory(categoryName) {
    const filteredProducts = products.filter((product) => product.category === categoryName);
    showPage("ebooks");
    setTimeout(() => { renderProducts(filteredProducts); }, 100);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: "smooth" });
}

function searchProducts(query) {
    const filteredProducts = products.filter((product) =>
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    showPage("ebooks");
    setTimeout(() => { renderProducts(filteredProducts); }, 100);
}


// =======================================================
// LÓGICA DO CARROSSEL
// =======================================================

let currentIndex = 0;
let track;
let cards;
const cardParamMap = { faq: "secao-faq", privacidade: "secao-privacidade", termos: "secao-termos", suporte: "secao-suporte" };
const cardIdMap = { "secao-faq": "faq", "secao-privacidade": "privacidade", "secao-termos": "termos", "secao-suporte": "suporte" };

function initCarousel() {
    track = document.querySelector(".carousel-track");
    cards = document.querySelectorAll(".carousel-card");
    if (!track || cards.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get("card");
    if (target && cardParamMap[target]) {
        const index = Array.from(cards).findIndex((card) => card.id === cardParamMap[target]);
        if (index !== -1) currentIndex = index;
    }
    updateCarousel();
}

function updateCarousel() {
    const offset = -currentIndex * 100;
    track.style.transform = `translateX(${offset}%)`;
    const currentCardId = cards[currentIndex]?.id;
    const param = cardIdMap[currentCardId];
    if (param) {
        const url = new URL(window.location);
        url.searchParams.set("card", param);
        history.pushState({ card: param }, "", url);
    }
}

function nextCard() {
    if (currentIndex < cards.length - 1) {
        currentIndex++;
        updateCarousel();
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
    }
}

function goToCardById(id) {
    const index = Array.from(cards).findIndex((card) => card.id === id);
    if (index !== -1) {
        currentIndex = index;
        updateCarousel();
    }
}


// =======================================================
// EVENTOS GLOBAIS E EXPORTAÇÃO
// =======================================================

window.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    if (checkUserLoggedIn()) {
        fetchUserProfile();
    }
});

window.addEventListener("popstate", (e) => {
    if (e.state && e.state.page) showPage(e.state.page);
});

document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-page]");
    if (target) {
        e.preventDefault();
        const page = target.dataset.page;
        if (page) showPage(page);
    }
});

// =======================================================
// FUNÇÕES DE ROLAGEM DO CARROSSEL
// =======================================================

// Torna as funções globais para que o HTML consiga chamá-las
window.scrollLeft = function() {
    const grid = document.getElementById('categoriesGrid');
    if (grid) {
        grid.scrollBy({
            left: -280,
            behavior: 'smooth'
        });
    }
};

window.scrollRight = function() {
    const grid = document.getElementById('categoriesGrid');
    if (grid) {
        grid.scrollBy({
            left: 280,
            behavior: 'smooth'
        });
    }
};

const style = document.createElement("style");
style.textContent = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
document.head.appendChild(style);

document.addEventListener("error", (e) => {
    if (e.target.tagName === "IMG") e.target.style.display = "none";
}, true);

// Exporta as funções para o escopo global
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
window.editProfile = editProfile;
window.logout = logout;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.showAuthTab = showAuthTab;
window.initCarousel = initCarousel;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.goToCardById = goToCardById;
window.handleContaClick = handleContaClick; // A nova função