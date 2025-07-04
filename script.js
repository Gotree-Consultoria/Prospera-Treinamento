// Variáveis globais
let currentPage = "home"; // Página atual
let cartItems = []; // Itens no carrinho
let products = []; // Lista de produtos
let packages = []; // Lista de pacotes
let categories = []; // Categorias de produtos

// Configuração da API
const API_BASE_URL = "https://j6h5i7c1kjn6.manus.space"; // URL base para as requisições

// Elementos do DOM
const mainContent = document.getElementById("mainContent"); // Conteúdo principal
// const cartCount = document.getElementById('cartCount'); // Inutilizado

// Inicializa a aplicação assim que o conteúdo estiver carregado
document.addEventListener("DOMContentLoaded", function () {
  initializeApp(); // Chama a função para inicializar a aplicação
});

// Função para inicializar a aplicação
async function initializeApp() {
  try {
    // Carrega os dados da API e atualiza a exibição do carrinho
    await loadData();
    updateCartDisplay();

    // Verifica se existe o parâmetro 'card' na URL para navegação
    const params = new URLSearchParams(window.location.search);
    const targetCard = params.get("card");

    // Se não tiver parâmetro 'card', vai para a página inicial
    if (!targetCard) {
      showPage("home");
    }
  } catch (error) {
    // Em caso de erro, exibe uma mensagem no console e carrega dados estáticos
    console.error("Erro ao inicializar a aplicação:", error);
    loadStaticData();
  }
}

// Função para carregar dados da API
async function loadData() {
  try {
    // Realiza as requisições para produtos e pacotes em paralelo
    const [productsResponse, packagesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/products`),
      fetch(`${API_BASE_URL}/api/packages`),
    ]);

    // Verifica se as respostas são válidas
    if (productsResponse.ok && packagesResponse.ok) {
      // Converte as respostas para JSON
      products = await productsResponse.json();
      packages = await packagesResponse.json();

      // Extrai categorias dos produtos
      categories = extractCategories(products);

      // Renderiza as categorias, pacotes e produtos
      renderCategories();
      renderPackages();
      renderProducts();
    } else {
      throw new Error("Requisição à API falhou");
    }
  } catch (error) {
    // Em caso de erro ao carregar dados, exibe o erro e carrega dados estáticos
    console.error("Erro ao carregar dados:", error);
    loadStaticData();
  }
}

// Função que carrega dados estáticos como fallback
function loadStaticData() {
  // Dados estáticos em caso de falha na requisição à API
  categories = [
    {
      id: 1,
      name: "Ergonomia",
      description: "E-books sobre ergonomia no ambiente de trabalho",
      icon: "fas fa-user-check",
      count: 0,
    },
    {
      id: 2,
      name: "Segurança",
      description: "Gestão de riscos e prevenção de acidentes",
      icon: "fas fa-shield-alt",
      count: 0,
    },
    {
      id: 3,
      name: "Saúde Ocupacional",
      description: "Promoção da saúde no trabalho",
      icon: "fas fa-heartbeat",
      count: 0,
    },
    {
      id: 4,
      name: "Gestão de RH",
      description: "Recursos humanos e desenvolvimento organizacional",
      icon: "fas fa-users",
      count: 0,
    },
  ];

  // Dados estáticos de produtos e pacotes
  products = [
    {
      id: 1,
      title: "E-book Ergonomia no Trabalho",
      description: "Guia completo sobre ergonomia e prevenção de lesões",
      price: 29.99,
      category: "Ergonomia",
      image: "fas fa-book",
    },
    {
      id: 2,
      title: "Gestão de Riscos Psicossociais",
      description: "Identificação e gestão de riscos psicossociais",
      price: 34.99,
      category: "Saúde Ocupacional",
      image: "fas fa-brain",
    },
    {
      id: 3,
      title: "Recrutamento e Seleção",
      description: "Melhores práticas em recrutamento e seleção",
      price: 24.99,
      category: "Gestão de RH",
      image: "fas fa-user-plus",
    },
    {
      id: 4,
      title: "Plano de Cargos e Salários",
      description: "Como estruturar um plano de cargos eficiente",
      price: 39.99,
      category: "Gestão de RH",
      image: "fas fa-chart-line",
    },
  ];

  // Dados estáticos de pacotes
  packages = [
    {
      id: 1,
      title: "Pacote Completo Ergonomia",
      description: "Todos os e-books sobre ergonomia com desconto especial",
      price: 89.99,
      originalPrice: 119.99,
      discount: "25%",
      features: [
        "E-book Ergonomia no Trabalho",
        "Guia de Avaliação Ergonômica",
        "Check-list de Ergonomia",
        "Casos Práticos",
        "Suporte por e-mail",
      ],
    },
    {
      id: 2,
      title: "Pacote Gestão de SST",
      description: "Formação completa em Gestão de Saúde e Segurança",
      price: 149.99,
      originalPrice: 199.99,
      discount: "25%",
      features: [
        "E-books de Segurança",
        "Gestão de Riscos",
        "Legislação Atualizada",
        "Modelos de Documentos",
        "Consultoria Online",
      ],
    },
  ];

  // Atualizando o count de cada categoria com base no número de e-books em cada uma
  categories.forEach((category) => {
    category.count = products.filter(
      (product) => product.category === category.name
    ).length;
  });

  // Renderiza as categorias, pacotes e produtos com dados estáticos
  renderCategories();
  renderPackages();
  renderProducts();
}

// Função para extrair as categorias dos produtos
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

// Função para obter o ícone de cada categoria
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

// Funções de renderização
function renderCategories() {
  // Início: renderização das categorias
  const categoriesGrid = document.getElementById("categoriesGrid");
  const categoriesLoading = document.getElementById("categoriesLoading");

  if (!categoriesGrid || !categoriesLoading) return;

  // Esconde o loading e mostra a grid de categorias
  categoriesLoading.style.display = "none";
  categoriesGrid.style.display = "grid";

  categoriesGrid.innerHTML = categories
    .map(
      (category) => `
        <div class="category-card" onclick="filterByCategory('${category.name}')">
            <i class="${category.icon}"></i>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <span class="category-badge">${category.count} e-books</span>
        </div>
    `
    )
    .join("");
  // Fim: renderização das categorias
}

// Função de renderização de pacotes
function renderPackages() {
  // Início: renderização dos pacotes
  const packagesGrid = document.getElementById("packagesGrid");
  const packagesLoading = document.getElementById("packagesLoading");
  const packagesPageGrid = document.getElementById("packagesPageGrid");
  const packagesPageLoading = document.getElementById("packagesPageLoading");

  const packageHTML = packages
    .map(
      (pkg) => `
        <div class="package-card">
            <div class="package-header">
                <h3 class="package-title">${pkg.title}</h3>
                <p class="package-description">${pkg.description}</p>
            </div>
            <div class="package-price">
                ${
                  pkg.originalPrice
                    ? `<span class="price-original">${formatPrice(
                        pkg.originalPrice
                      )}</span>`
                    : ""
                }
                <span class="price-current">${formatPrice(pkg.price)}</span>
                ${
                  pkg.discount
                    ? `<span class="price-discount">${pkg.discount} OFF</span>`
                    : ""
                }
            </div>
            <ul class="package-features">
                ${
                  pkg.features
                    ? pkg.features
                        .map(
                          (feature) => `
                    <li><i class="fas fa-check"></i> ${feature}</li>
                `
                        )
                        .join("")
                    : ""
                }
            </ul>
            <button class="btn btn-primary btn-full" onclick="addToCart(${
              pkg.id
            }, 'package')">
                Adicionar ao Carrinho
            </button>
        </div>
    `
    )
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

  // Fim: renderização dos pacotes
}

// Função de renderização de produtos
function renderProducts(filteredProducts = null) {
  // Início: renderização dos produtos
  const productsToRender = filteredProducts || products;
  const ebooksGrid = document.getElementById("ebooksGrid");
  const ebooksLoading = document.getElementById("ebooksLoading");

  if (!ebooksGrid || !ebooksLoading) return;

  ebooksLoading.style.display = "none";
  ebooksGrid.style.display = "grid";

  ebooksGrid.innerHTML = productsToRender
    .map(
      (product) => `
        <div class="product-card">
            <div class="product-image">
                <i class="${product.image || "fas fa-book"}"></i>
            </div>
            <div class="product-content">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">
                    <span class="product-price-value">${formatPrice(
                      product.price
                    )}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-full" onclick="addToCart(${
                      product.id
                    }, 'product')">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
  // Fim: renderização dos produtos
}

// Funções de navegação
function showPage(page) {
  // Início: navegação entre páginas
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
    if (link.dataset.page === page) {
      link.classList.add("active");
    }
  });

  // Esconde todas as páginas
  document.querySelectorAll(".page").forEach((pageEl) => {
    pageEl.classList.remove("active");
  });

  // Mapeamento de ID dos containers
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

    // Scroll comportado
    if (page === "faq") {
      setTimeout(() => {
        targetPage.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Atualiza a URL de forma segura, sem remover handlers
    const url = new URL(window.location);
    if (page !== "faq") {
      url.searchParams.delete("card"); // Remove só o ?card
    }
    url.hash = `#${page}`; // Atualiza o fragmento
    history.pushState({ page }, "", url);
  }
  // Fim: navegação entre páginas
}

// Função para rolar para uma seção específica
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
}

// Função de filtro de produtos por categoria
function filterByCategory(categoryName) {
  const filteredProducts = products.filter(
    (product) => product.category === categoryName
  );
  showPage("ebooks");
  setTimeout(() => {
    renderProducts(filteredProducts);
  }, 100);
}

// Funções do Carrinho
function addToCart(itemId, itemType) {
  let item;

  // Verifica se o item é do tipo produto ou pacote
  if (itemType === "product") {
    item = products.find((p) => p.id === itemId); // Encontrar o produto
  } else if (itemType === "package") {
    item = packages.find((p) => p.id === itemId); // Encontrar o pacote
  }

  if (!item) return; // Se não encontrar o item, não faz nada

  // Verifica se o item já está no carrinho
  const existingItem = cartItems.find(
    (cartItem) => cartItem.id === itemId && cartItem.type === itemType
  );

  // Se o item já está no carrinho, aumenta a quantidade
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    // Caso contrário, adiciona o item ao carrinho
    cartItems.push({
      id: itemId,
      type: itemType,
      title: item.title,
      price: item.price,
      quantity: 1,
      image: item.image || "fas fa-book", // Usa um ícone genérico caso não tenha imagem
    });
  }

  // Atualiza a exibição do carrinho e exibe notificação
  updateCartDisplay();
  showCartNotification();
}

function removeFromCart(itemId, itemType) {
  // Remove o item do carrinho baseado no ID e tipo
  cartItems = cartItems.filter(
    (item) => !(item.id === itemId && item.type === itemType)
  );

  updateCartDisplay();
  renderCart();
}

function updateQuantity(itemId, itemType, newQuantity) {
  // Encontra o item no carrinho
  const item = cartItems.find(
    (cartItem) => cartItem.id === itemId && cartItem.type === itemType
  );

  if (item) {
    // Se a nova quantidade for menor ou igual a zero, remove o item
    if (newQuantity <= 0) {
      removeFromCart(itemId, itemType);
    } else {
      // Caso contrário, atualiza a quantidade
      item.quantity = newQuantity;
      updateCartDisplay();
      renderCart();
    }
  }
}

function updateCartDisplay() {
  // Calcula o número total de itens no carrinho
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = document.getElementById("cartCount");

  // Atualiza o contador do carrinho
  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? "flex" : "none"; // Exibe apenas se houver itens
  }
}

function renderCart() {
  // Verifica se o carrinho está vazio ou não
  const cartEmpty = document.getElementById("cartEmpty");
  const cartItemsContainer = document.getElementById("cartItems");
  const cartList = document.getElementById("cartList");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartTax = document.getElementById("cartTax");
  const cartTotal = document.getElementById("cartTotal");

  // Se o carrinho estiver vazio
  if (cartItems.length === 0) {
    if (cartEmpty) cartEmpty.style.display = "block";
    if (cartItemsContainer) cartItemsContainer.style.display = "none";
    return;
  }

  // Caso contrário, exibe os itens do carrinho
  if (cartEmpty) cartEmpty.style.display = "none";
  if (cartItemsContainer) cartItemsContainer.style.display = "grid";

  // Renderiza cada item no carrinho
  if (cartList) {
    cartList.innerHTML = cartItems
      .map(
        (item) => `
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
                        <button class="quantity-btn" onclick="updateQuantity(${
                          item.id
                        }, '${item.type}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${
                          item.quantity
                        }" 
                               onchange="updateQuantity(${item.id}, '${
          item.type
        }', parseInt(this.value))" min="1">
                        <button class="quantity-btn" onclick="updateQuantity(${
                          item.id
                        }, '${item.type}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${
                      item.id
                    }, '${item.type}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  }

  // Calcula os totais do carrinho
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  //const tax = subtotal * 0.23; // 23% IVA (pode ser ajustado conforme necessidade)
  const total = subtotal;

  // Atualiza os valores do subtotal e total
  if (cartSubtotal) cartSubtotal.textContent = `${formatPrice(subtotal)}`;
  //if (cartTax) cartTax.textContent = `${tax.toFixed(2)}`;
  if (cartTotal) cartTotal.textContent = `${formatPrice(total)}`;
}

// Exibe a notificação de item adicionado ao carrinho
function showCartNotification() {
  const notification = document.createElement("div");
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
  notification.textContent = "Item adicionado ao carrinho!";

  document.body.appendChild(notification);

  // Remove a notificação após 3 segundos
  setTimeout(() => {
    notification.remove();
  }, 2500);
}

// Função de checkout (em breve)
function checkout() {
  // Verifica se o usuário está logado
  const userLoggedIn = checkUserLoggedIn();

  if (!userLoggedIn) {
    // Se não estiver logado, exibe o pop-up
    showProfileUpdatePopup();
  } else {
    // Caso esteja logado, prossegue com o processo de checkout
    alert("Função de checkout será implementada em breve!");
  }
}


// Função fictícia que verifica se o usuário está logado (pode ser com cookies, sessionStorage, etc.)
function checkUserLoggedIn() {
  // Substitua por uma verificação real (exemplo usando sessionStorage)
  return sessionStorage.getItem('userLoggedIn') === 'true'; // Exemplo fictício
}

// Função para mostrar o pop-up informando sobre a necessidade de atualizar o perfil
function showProfileUpdatePopup() {
  const popup = document.createElement('div');
  popup.classList.add('popup');
  popup.innerHTML = `
    <div class="popup-content">
      <h3>Perfil Incompleto</h3>
      <p>Para prosseguir com a compra, você precisa atualizar seu perfil. Clique no botão abaixo para atualizar.</p>
      <button onclick="redirectToUpdateProfile()">Atualizar Perfil</button>
      <button onclick="closePopup()">Fechar</button>
    </div>
  `;

  // Adiciona o pop-up na tela
  document.body.appendChild(popup);
  document.body.style.overflow = 'hidden'; // Impede rolagem da página enquanto o pop-up está visível
}

// Função para fechar o pop-up
function closePopup() {
  const popup = document.querySelector('.popup');
  if (popup) {
    popup.remove();
    document.body.style.overflow = 'auto'; // Restaura a rolagem da página
  }
}

// Função que redireciona para a página de conta (onde o usuário pode atualizar o perfil)
function redirectToUpdateProfile() {
  // Redireciona para a aba de conta
  showPage('account'); // Função já existente que exibe a aba 'perfil'
  closePopup(); // Fecha o pop-up
}

// Função de navegação para exibir a seção de conta
function showAccountSection(section) {
  // Atualiza o menu de navegação
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.remove("active");
  });
}



// Funções da Conta
function showAccountSection(section) {
  // Atualiza o menu de navegação
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.remove("active");
  });

  const activeMenuItem = document.querySelector(
    `[onclick="showAccountSection('${section}')"]`
  );
  if (activeMenuItem) {
    activeMenuItem.classList.add("active");
  }

  // Esconde todas as seções da conta
  document.querySelectorAll(".account-section").forEach((sectionEl) => {
    sectionEl.classList.remove("active");
  });

  // Exibe a seção selecionada
  const sectionMap = {
    profile: "profileSection",
    orders: "ordersSection",
    downloads: "downloadsSection",
  };

  const targetSection = document.getElementById(sectionMap[section]);
  if (targetSection) {
    targetSection.classList.add("active");
  }
}

// Funções de Formulário
async function subscribeNewsletter(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector('input[type="email"]').value;

  try {
    const response = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    alert("Subscrição realizada com sucesso!"); // Fallback caso falhe
    form.reset();
  }
}

function sendMessage(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  // Simula o envio da mensagem
  alert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
  form.reset();
}

function updateProfile(event) {
  event.preventDefault();
  const form = event.target;

  // Simula a atualização do perfil
  alert("Perfil atualizado com sucesso!");
}

// Funções Utilitárias
function formatPrice(price) {
  // Formata o preço para o padrão monetário BR
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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

// Função de busca (caso necessário)
function searchProducts(query) {
  // Filtra os produtos com base no título, descrição ou categoria
  const filteredProducts = products.filter(
    (product) =>
      product.title.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
  );

  // Exibe a página "ebooks" e renderiza os produtos filtrados após um pequeno delay
  showPage("ebooks");
  setTimeout(() => {
    renderProducts(filteredProducts);
  }, 100);
}

// Adiciona a animação CSS para notificações
const style = document.createElement("style");
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

// Tratamento de erro para imagens
document.addEventListener(
  "error",
  function (e) {
    // Se a imagem falhar, ela é ocultada
    if (e.target.tagName === "IMG") {
      e.target.style.display = "none";
    }
  },
  true
);

// Rolagem suave para links de ancoragem
document.addEventListener("click", function (e) {
  const target = e.target.closest("[data-page]");
  if (target) {
    e.preventDefault();
    const page = target.dataset.page;
    if (page) showPage(page); // Exibe a página correspondente
  }
});

// Tratamento dos botões de navegação do navegador (voltar/avançar)
window.addEventListener("popstate", function (e) {
  if (e.state && e.state.page) {
    showPage(e.state.page); // Exibe a página que está no histórico
  }
});

// Função para adicionar um estado à história do navegador
function addToHistory(page) {
  history.pushState({ page: page }, "", `#${page}`);
}

// Inicializa a página com base no hash da URL
function initializeFromHash() {
  const hash = window.location.hash.substring(1);
  // Verifica se o hash corresponde a uma das páginas válidas
  if (
    hash &&
    [
      "home",
      "ebooks",
      "packages",
      "about",
      "contact",
      "account",
      "cart",
    ].includes(hash)
  ) {
    showPage(hash);
  }
}

// Chama a inicialização a partir do hash quando a página é carregada
document.addEventListener("DOMContentLoaded", function () {
  initializeFromHash();
});

let currentIndex = 0;
let track;
let cards;

// Mapeamento dos parâmetros da URL para os IDs dos cards
const cardParamMap = {
  faq: "secao-faq",
  privacidade: "secao-privacidade",
  termos: "secao-termos",
  suporte: "secao-suporte",
};

const cardIdMap = {
  "secao-faq": "faq",
  "secao-privacidade": "privacidade",
  "secao-termos": "termos",
  "secao-suporte": "suporte",
};

// Inicializa o carrossel
function initCarousel() {
  track = document.querySelector(".carousel-track");
  cards = document.querySelectorAll(".carousel-card");

  // Verifica se o carrossel e os cards existem
  if (!track || cards.length === 0) return;

  // Verifica se há um parâmetro "card" na URL
  const params = new URLSearchParams(window.location.search);
  const target = params.get("card");

  // Se o parâmetro for válido, vai para o card correspondente
  if (target && cardParamMap[target]) {
    const index = Array.from(cards).findIndex(
      (card) => card.id === cardParamMap[target]
    );
    if (index !== -1) {
      currentIndex = index; // Atualiza o índice do carrossel
    }
  }

  updateCarousel();
}

// Atualiza a exibição do carrossel
function updateCarousel() {
  const offset = -currentIndex * 100;
  track.style.transform = `translateX(${offset}%)`; // Move o carrossel para a posição correta

  // Atualiza a URL com base no card atual
  const currentCardId = cards[currentIndex]?.id;
  const param = cardIdMap[currentCardId];

  if (param) {
    const url = new URL(window.location);
    url.searchParams.set("card", param);
    history.pushState({ card: param }, "", url); // Usando pushState ao invés de replaceState
    // history.replaceState(null, "", url); // Substitui o histórico da URL
  }
}

// Avança para o próximo card
function nextCard() {
  if (currentIndex < cards.length - 1) {
    currentIndex++;
    updateCarousel();
  }
}

// Volta para o card anterior
function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    updateCarousel();
  }
}

// Vai diretamente para um card pelo ID
function goToCardById(id) {
  const index = Array.from(cards).findIndex((card) => card.id === id);
  if (index !== -1) {
    currentIndex = index;
    updateCarousel();
  }
}

// Torna as funções acessíveis globalmente para uso com onclick no HTML
window.initCarousel = initCarousel;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.goToCardById = goToCardById;

// Exporta funções para acesso global (caso necessário)
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
