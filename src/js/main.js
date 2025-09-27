import { loadAllComponents } from './loadComponents.js';
import { setupEventListeners } from './modules/eventListeners.js';
// Import admin modules that register page-level handlers (ensures page:loaded listeners are attached)
import './modules/adminUsers.js';
import './modules/adminOrgs.js';
import './modules/adminOrgDetail.js';
import './modules/adminPlatformSectors.js';
import './modules/adminContent.js';
import { showPage, scrollToSection, resolveRouteFromLocation } from './modules/navigation.js';
import { initCarousel } from './modules/carousel.js';
import { checkUserLoggedIn } from './modules/auth.js';
import './modules/catalog.js';
import './modules/ebooksMini.js'; // mini catálogo de e-books na página de E-books

// Dados legacy de produtos/pacotes removidos (catálogo unificado agora cobre exibição)

let listenersInitialized = false;
function ensureEventListeners() {
    if (!listenersInitialized) {
        try {
            console.debug('[bootstrap] inicializando event listeners globais');
            setupEventListeners();
            listenersInitialized = true;
            document.dispatchEvent(new CustomEvent('app:listeners-ready'));
        } catch (err) {
            console.error('Falha ao inicializar event listeners:', err);
        }
    }
}

async function initializeApp() {
    const pageLoader = document.getElementById("page-loader");
    const mainContent = document.getElementById("mainContent");
    console.debug('initializeApp: started');
    // safety timeout to avoid loader stuck
    const loaderTimeout = setTimeout(() => {
        if (pageLoader) {
            console.warn('initializeApp: loader timeout reached — hiding loader to avoid stuck state');
            pageLoader.style.display = 'none';
        }
    }, 8000);

    try {
        await loadAllComponents(); // Aguarda o carregamento dos componentes HTML
        console.debug('[bootstrap] loadAllComponents concluído com sucesso');

        // garantir que os handlers de termos sejam inicializados após os partials do modal existirem
        try {
            await waitForElement('#authRegisterForm', 5000);
            try { initTermsFlow(); } catch (e) { /* ignore */ }
        } catch (e) {
            // se timeouts, tentar inicializar na mesma página (fallback)
            try { initTermsFlow(); } catch (e) { /* ignore */ }
        }

        // Removido: carregamento de products.json / packages.json (não usados mais)

    // Sempre configura os listeners, mesmo que os dados falhem
    ensureEventListeners();

        // Ao inicializar, se houver token, tentar carregar a rota presente na barra de endereço
        const token = localStorage.getItem('jwtToken');
        if (token) {
            const resolved = resolveRouteFromLocation();
            if (resolved) {
                showPage(resolved);
                // se a rota veio via hash, a função resolve já retornou o hash sem '#'
                scrollToSection(resolved);
            } else {
                // fallback para home quando não for possível resolver
                showPage('home');
            }
        } else {
            const hash = window.location.hash.substring(1);
            if (hash) {
                showPage(hash);
                scrollToSection(hash);
            } else {
                showPage("home");
            }
        }
        
        initCarousel();
        checkUserLoggedIn();
        
        // Esconde o loader e exibe o conteúdo principal
        if (pageLoader) {
            pageLoader.style.display = "none";
        }

    console.log("Aplicação inicializada com sucesso (versão sem produtos legacy)!");
    } catch (error) {
        console.error("Erro ao inicializar a aplicação:", error);
        ensureEventListeners();
    } finally {
        // Sempre garante que o loader será escondido
        try {
            if (pageLoader) {
                pageLoader.style.display = "none";
            }
            clearTimeout(loaderTimeout);
            ensureEventListeners();
        } catch (e) {
            console.error('Erro ao esconder loader no finally:', e);
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);

// Defensive attachment: ensure authRegisterForm calls handleRegister on submit
// defensive local handler removed - rely on central event delegation in `eventListeners.js`

// Inicializa handlers do fluxo de termos/registro após garantir que o formulário exista.
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const interval = 100;
        let waited = 0;
        const id = setInterval(() => {
            const found = document.querySelector(selector);
            if (found) {
                clearInterval(id);
                return resolve(found);
            }
            waited += interval;
            if (waited >= timeout) {
                clearInterval(id);
                return reject(new Error('timeout'));
            }
        }, interval);
    });
}

function initTermsFlow() {
    // Terms flow removed per user request.
    // Keep a safe no-op stub so other modules can call initTermsFlow() without errors.
    return;
}