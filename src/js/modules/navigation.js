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
    trainingReader: "src/partials/trainingReaderPage.html",
    faq: "src/partials/faqPage.html",
    catalog: "src/partials/catalogPage.html",
    learning: 'src/partials/learningPage.html'
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
    trainingReader: "trainingReaderPageContainer",
    faq: "faqPageContainer",
    catalog: "catalogPageContainer",
    learning: 'learningPageContainer'
    };
    const partialPath = partialMap[page];
    const containerId = containerMap[page];
    if (partialPath && containerId) {
        try {
            const url = partialPath.startsWith('/') ? partialPath : `/${partialPath}`;
            console.debug('[navigation] carregando partial', page, '->', url);
            const response = await fetch(url);
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
            console.error('[navigation] Error loading partial', page, err);
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
    trainingReader: "trainingReaderPage",
    faq: "faqPage",
    catalog: "catalogPage",
    learning: "learningPage"
};

// Alias de rotas que apontam para seções internas da página de conta
const aliasToAccountSection = {
    plans: 'plans'
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
    '/faq': 'faq',
    '/learning': 'learning', // resolveRouteFromLocation retornará 'learning'
    '/training-reader': 'trainingReader'
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
        if (rawHash.startsWith('trainingReader/')) {
            const parts = rawHash.split('/');
            if (parts.length === 2 && parts[1]) {
                try { window._openTrainingId = parts[1]; } catch(_) {}
                return 'trainingReader';
            }
        }
        return rawHash;
    }

    const pathname = window.location.pathname || '/';
    // Normalizar algumas variações simples
    const normalized = pathname.replace(/\/+$/, ''); // removes trailing slash
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
export async function showPage(requestedPage, opts = {}) {
    const options = { ...opts };
    const accountSection = aliasToAccountSection[requestedPage];
    const page = accountSection ? 'account' : requestedPage;
    console.debug('[navigation] showPage requisitado=', requestedPage, 'page resolved=', page, 'opts=', options);

    if (accountSection) {
        if (!options.selectSection) options.selectSection = accountSection;
        if (!options.requestedPage) options.requestedPage = requestedPage;
    }

    // Evitar recarregar a mesma página sem necessidade (mantém estado e evita flicker)
    // Exceção: se options.forceReload for passado ou se for trainingDetail com ID diferente.
    const isTrainingDetailPage = page === 'trainingDetail';
    const isTrainingReaderPage = page === 'trainingReader';
    if (currentPage === page && !options.forceReload) {
        if (isTrainingDetailPage || isTrainingReaderPage) {
            // permitir mudança de treinamento sem reload completo
            const newId = options.trainingId || window._openTrainingId;
            if (newId && newId !== window._openTrainingId) {
                try { window._openTrainingId = newId; } catch(_) {}
            } else {
                // mesma página e mesmo contexto -> apenas re-despacha evento e sai
                try {
                    const detail = { page, refreshed: true };
                    if (accountSection) {
                        detail.accountSection = options.selectSection;
                        detail.requestedPage = options.requestedPage || requestedPage;
                    }
                    document.dispatchEvent(new CustomEvent('page:loaded', { detail }));
                } catch(_) {}
                return;
            }
        } else {
            if (page === 'account' && options.selectSection) {
                try { showAccountSection(options.selectSection); } catch (_) {}
            }
            try {
                const detail = { page, refreshed: true };
                if (accountSection) {
                    detail.accountSection = options.selectSection;
                    detail.requestedPage = options.requestedPage || requestedPage;
                }
                document.dispatchEvent(new CustomEvent('page:loaded', { detail }));
            } catch(_) {}
            return;
        }
    }
    const previouslyActiveLink = document.querySelector('.nav-link.active');
    document.querySelectorAll(".page").forEach((pageEl) => {
        pageEl.classList.remove("active");
        pageEl.classList.add("hidden");
    });
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
    });

    const targetPage = document.getElementById(pageMap[page]);
    const targetLink = document.querySelector(`.nav-link[data-page='${requestedPage}']`) || document.querySelector(`.nav-link[data-page='${page}']`);
    if (!targetPage) {
        console.warn('[navigation] targetPage não encontrado para', page, '-> id esperado', pageMap[page]);
    }

    if (targetPage) {
    targetPage.classList.add("active");
    targetPage.classList.remove("hidden");
    currentPage = page;
    // Removido scroll automático ao topo para não interromper o usuário em páginas longas
        // Se a página requer autenticação, verificar token antes de carregar o partial
    const authRequiredPages = ['account', 'createPf', 'organizationsNew', 'orgMembers', 'orgManagement', 'trainingReader'];
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
        if (page === 'account' && options.selectSection) {
            try { showAccountSection(options.selectSection); } catch (err) {
                console.warn('Não foi possível selecionar seção da conta:', err);
            }
        }
        if (isTrainingDetailPage || isTrainingReaderPage) {
            // aceitar id vindo de opts ou já setado previamente
            const id = options.trainingId || window._openTrainingId;
            if (options.trainingId) { try { window._openTrainingId = options.trainingId; } catch(_) {} }
            // atualizar hash para deep link
            if (id) {
                const hashPrefix = isTrainingReaderPage ? '#trainingReader/' : '#trainingDetail/';
                const newHash = `${hashPrefix}${encodeURIComponent(id)}`;
                if (window.location.hash !== newHash) {
                    try { history.replaceState(null, '', newHash); } catch(_) { window.location.hash = newHash; }
                }
            }
        }
        // Notifica outros módulos que a página foi carregada e injetada no DOM
        try {
            const detail = { page };
            if (accountSection) {
                detail.accountSection = options.selectSection;
                detail.requestedPage = options.requestedPage || requestedPage;
            }
            document.dispatchEvent(new CustomEvent('page:loaded', { detail }));
            if (page === 'learning') {
                try {
                    document.dispatchEvent(new CustomEvent('learning:init', { detail }));
                } catch (err) {
                    console.warn('Could not dispatch learning:init event', err);
                }
            }
        } catch (err) {
            console.warn('Could not dispatch page:loaded event', err);
        }
    }
    const pagesWithoutNavLink = new Set(['trainingDetail', 'trainingReader']);
    if (targetLink) {
        targetLink.classList.add("active");
    } else if (pagesWithoutNavLink.has(page)) {
        if (previouslyActiveLink) {
            previouslyActiveLink.classList.add('active');
        }
    } else {
        console.warn('[navigation] targetLink não encontrado para', requestedPage, 'ou', page);
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
    const sectionMap = { profile: "profileSection", plans: "plansSection" };
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

//# sourceMappingURL=app.js.map