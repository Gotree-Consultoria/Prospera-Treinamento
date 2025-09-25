/**
 * Carrega o conteúdo do partial HTML correspondente à página e insere no container.
 */
export async function loadPartial(page) {
    // A home é mantida inline em `index.html` (homePageContainer). Não há partial separado.
    const partialMap = {
        ebooks: "src/partials/ebooksPage.html",
        packages: "src/partials/packagesPage.html",
        about: "src/partials/aboutPage.html",
        contact: "src/partials/contactPage.html",
        account: "src/partials/accountPage.html",
    login: "src/partials/loginPage.html",
    register: "src/partials/registerPage.html",
    createPf: "src/partials/createPfPage.html",
    organizationsNew: "src/partials/organizationsNew.html",
    orgManagement: "src/partials/orgManagement.html",
    orgMembers: "src/partials/orgMembersPage.html",
    adminUsers: "src/partials/adminUsersPage.html",
    adminUserDetail: "src/partials/adminUserDetailPage.html",
    adminOrgs: "src/partials/adminOrgsPage.html",
    adminOrgDetail: "src/partials/adminOrgDetailPage.html",
    adminContent: "src/partials/adminContentPage.html",
    adminAnalytics: "src/partials/adminAnalyticsPage.html",
    platformSectors: "src/partials/platformSectorsPage.html",
    platformTags: "src/partials/platformTagsPage.html",
    platformLevels: "src/partials/platformLevelsPage.html",
    platformEmails: "src/partials/platformEmailsPage.html",
    platformPolicies: "src/partials/platformPoliciesPage.html",
    platformIntegrations: "src/partials/platformIntegrationsPage.html",
    platformAudit: "src/partials/platformAuditPage.html",
    platformCache: "src/partials/platformCachePage.html",
    trainingDetail: "src/partials/trainingDetailPage.html",
        cart: "src/partials/cartPage.html",
        faq: "src/partials/faqPage.html"
    };
    const containerMap = {
        home: "homePageContainer",
        ebooks: "ebooksPageContainer",
        packages: "packagesPageContainer",
        about: "aboutPageContainer",
        contact: "contactPageContainer",
        account: "accountPageContainer",
    login: "loginPageContainer",
    register: "registerPageContainer",
    createPf: "createPfPageContainer",
    organizationsNew: "organizationsNewPageContainer",
    orgManagement: "orgManagementPageContainer",
    orgMembers: "orgMembersPageContainer",
    adminUsers: "adminUsersPageContainer",
    adminUserDetail: "adminUserDetailPageContainer",
    adminOrgs: "adminOrgsPageContainer",
    adminOrgDetail: "adminOrgDetailPageContainer",
    adminContent: "adminContentPageContainer",
    adminAnalytics: "adminAnalyticsPageContainer",
    platformSectors: "platformSectorsPageContainer",
    platformTags: "platformTagsPageContainer",
    platformLevels: "platformLevelsPageContainer",
    platformEmails: "platformEmailsPageContainer",
    platformPolicies: "platformPoliciesPageContainer",
    platformIntegrations: "platformIntegrationsPageContainer",
    platformAudit: "platformAuditPageContainer",
    platformCache: "platformCachePageContainer",
    trainingDetail: "trainingDetailPageContainer",
        cart: "cartPageContainer",
        faq: "faqPageContainer"
    };
    const partialPath = partialMap[page];
    const containerId = containerMap[page];
    if (partialPath && containerId) {
        try {
            const response = await fetch(partialPath);
            if (!response.ok) throw new Error(`Failed to load partial ${partialPath}`);
            const html = await response.text();
            const container = document.getElementById(containerId);
            if (container) {
                // Strip outer .page wrapper if present to avoid nested .page elements
                const temp = document.createElement('div');
                temp.innerHTML = html;
                const pageEl = temp.querySelector('.page');
                if (pageEl) {
                    container.innerHTML = pageEl.innerHTML;
                } else {
                    container.innerHTML = html;
                }
            }
        } catch (err) {
            console.error('Error loading partial:', err);
        }
    }
}
// As variáveis do módulo de navegação
export let currentPage = "home";
const pageMap = {
    home: "homePage",
    ebooks: "ebooksPage",
    packages: "packagesPage",
    about: "aboutPage",
    contact: "contactPage",
    account: "accountPage",
    login: "loginPage",
    register: "registerPage",
    createPf: "createPfPage",
    organizationsNew: "organizationsNewPage",
    orgManagement: "orgManagementPage",
    orgMembers: "orgMembersPage",
    adminUsers: "adminUsersPage",
    adminUserDetail: "adminUserDetailPage",
    adminOrgDetail: "adminOrgDetailPage",
    platformSectors: "platformSectorsPage",
    platformTags: "platformTagsPage",
    platformLevels: "platformLevelsPage",
    platformEmails: "platformEmailsPage",
    platformPolicies: "platformPoliciesPage",
    platformIntegrations: "platformIntegrationsPage",
    platformAudit: "platformAuditPage",
    platformCache: "platformCachePage",
    trainingDetail: "trainingDetailPage",
    cart: "cartPage",
    faq: "faqPage",
};

// Mapeamento reverso para resolver paths/hashes para chaves de página
const pathToPage = {
    '/': 'home',
    '/home': 'home',
    '/ebooks': 'ebooks',
    '/packages': 'packages',
    '/about': 'about',
    '/contact': 'contact',
    '/account': 'account',
    '/login': 'login',
    '/register': 'register',
    '/create-pf': 'createPf',
    '/organizations/new': 'organizationsNew',
    '/organizations': 'orgManagement',
    '/organizations/members': 'orgMembers',
    '/admin/users': 'adminUsers',
    // detalhe ficará com rota dinâmica em SPA (mapeamento por hash)
    '/cart': 'cart',
    '/faq': 'faq'
};

/**
 * Resolve a rota atual (hash ou pathname) para a chave de página usada internamente.
 * @returns {string|null} - chave de página ou null se não for possível resolver
 */
export function resolveRouteFromLocation() {
    // preferir hash se presente (ex: #about ou trainingDetail/123)
    const rawHash = window.location.hash ? window.location.hash.replace(/^#/, '') : null;
    if (rawHash) {
        if (rawHash.startsWith('trainingDetail/')) {
            const parts = rawHash.split('/');
            if (parts.length === 2 && parts[1]) {
                try { window._openTrainingId = parts[1]; } catch(_) {}
                return 'trainingDetail';
            }
        }
        return rawHash;
    }

    const pathname = window.location.pathname || '/';
    // Normalizar algumas variações simples
    const normalized = pathname.replace(/\/+$/, ''); // remove trailing slash
    if (pathToPage[normalized]) return pathToPage[normalized];

    // tentar mapear segmentos conhecidos (ex: /organizations/123/members)
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0) return 'home';
    // engenharia simples: checar primeiros dois segmentos compõem rota conhecida
    const firstTwo = '/' + segments.slice(0, 2).join('/');
    if (pathToPage[firstTwo]) return pathToPage[firstTwo];

    // checar primeiro segmento
    const first = '/' + segments[0];
    if (pathToPage[first]) return pathToPage[first];

    return null;
}

/**
 * Exibe a página principal especificada.
 * @param {string} page - O nome da página a ser exibida.
 */
export async function showPage(page, opts = {}) {
    document.querySelectorAll(".page").forEach((pageEl) => {
        pageEl.classList.remove("active");
        pageEl.classList.add("hidden");
    });
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
    });

    const targetPage = document.getElementById(pageMap[page]);
    const targetLink = document.querySelector(`.nav-link[data-page='${page}']`);

    if (targetPage) {
    targetPage.classList.add("active");
    targetPage.classList.remove("hidden");
    currentPage = page;
    // Removido scroll automático ao topo para não interromper o usuário em páginas longas
        // Se a página requer autenticação, verificar token antes de carregar o partial
    const authRequiredPages = ['account', 'createPf', 'organizationsNew', 'orgMembers', 'orgManagement'];
        const token = localStorage.getItem('jwtToken');
        if (authRequiredPages.includes(page) && !token) {
            // redirecionar para login e abortar carregamento da página atual
            try { await loadPartial('login'); } catch (e) { /* ignore */ }
            const loginEl = document.getElementById('loginPage');
            if (loginEl) {
                document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
                loginEl.classList.remove('hidden');
                loginEl.classList.add('active');
            }
            // dispatch evento de página carregada para login
            try { document.dispatchEvent(new CustomEvent('page:loaded', { detail: { page: 'login' } })); } catch (e) { }
            return;
        }

        await loadPartial(page); // Carrega o conteúdo do partial sob demanda e aguarda
        if (page === 'trainingDetail') {
            // aceitar id vindo de opts ou já setado previamente
            const id = opts.trainingId || window._openTrainingId;
            if (opts.trainingId) { try { window._openTrainingId = opts.trainingId; } catch(_) {} }
            // atualizar hash para deep link
            if (id) {
                const newHash = `#trainingDetail/${encodeURIComponent(id)}`;
                if (window.location.hash !== newHash) {
                    try { history.replaceState(null, '', newHash); } catch(_) { window.location.hash = newHash; }
                }
            }
        }
        // Notifica outros módulos que a página foi carregada e injetada no DOM
        try {
            document.dispatchEvent(new CustomEvent('page:loaded', { detail: { page } }));
        } catch (err) {
            console.warn('Could not dispatch page:loaded event', err);
        }
    }
    if (targetLink) {
        targetLink.classList.add("active");
    }
}

/**
 * Exibe a seção específica dentro da página da conta.
 * @param {string} section - O nome da seção a ser exibida.
 */
export function showAccountSection(section) {
    // atualizar estado ativo do menu
    document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
    const activeMenuItem = document.querySelector(`[data-section="${section}"]`);
    if (activeMenuItem) activeMenuItem.classList.add("active");

    // Esconder todas as subseções e garantir a visibilidade apenas da selecionada
    document.querySelectorAll(".account-section").forEach((sectionEl) => {
        sectionEl.classList.remove("active");
        sectionEl.classList.add("hidden");
    });
    const sectionMap = { profile: "profileSection", orders: "ordersSection", downloads: "downloadsSection" };
    const targetSection = document.getElementById(sectionMap[section]);
    if (targetSection) {
        targetSection.classList.remove("hidden");
        targetSection.classList.add("active");
        // garantir foco visual / rolagem suave para a seção
        try { targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* fallback silencioso */ }
    }
}

/**
 * Rola a página para uma seção específica.
 * @param {string} sectionId - O ID da seção para a qual rolar.
 */
export function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: "smooth" });
}