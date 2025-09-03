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
    cart: "cartPage",
    faq: "faqPage",
};

/**
 * Exibe a página principal especificada.
 * @param {string} page - O nome da página a ser exibida.
 */
export async function showPage(page) {
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
        window.scrollTo({ top: 0, behavior: "smooth" });
        await loadPartial(page); // Carrega o conteúdo do partial sob demanda e aguarda
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