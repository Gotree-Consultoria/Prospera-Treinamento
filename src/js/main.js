import { loadAllComponents } from './loadComponents.js';
import { setupEventListeners } from './modules/eventListeners.js';
import { showPage, scrollToSection } from './modules/navigation.js';
import { renderProducts, renderPackages, renderCategories, updateData } from './modules/render.js';
import { initCarousel } from './modules/carousel.js';
import { checkUserLoggedIn } from './modules/auth.js';
import { extractCategories } from './modules/utils.js';

let products = [];
let packages = [];
let categories = [];

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

        // Carrega produtos e pacotes de forma tolerante a falhas (API local pode não existir)
        const results = await Promise.allSettled([
            fetch('src/products.json').then(res => res.json()),
            fetch('src/packages.json').then(res => res.json())
        ]);

        const productsData = results[0].status === 'fulfilled' ? results[0].value : [];
        const packagesData = results[1].status === 'fulfilled' ? results[1].value : [];

        products = productsData;
        packages = packagesData;
        categories = extractCategories(productsData);
        updateData(productsData, packagesData, categories);

        renderCategories();
        renderProducts(products);
        renderPackages();

        // Sempre configura os listeners, mesmo que os dados falhem
        setupEventListeners();

        const hash = window.location.hash.substring(1);
        if (hash) {
            showPage(hash);
            scrollToSection(hash);
        } else {
            showPage("home");
        }
        
        initCarousel();
        checkUserLoggedIn();
        
        // Esconde o loader e exibe o conteúdo principal
        if (pageLoader) {
            pageLoader.style.display = "none";
        }

        console.log("Aplicação inicializada com sucesso!");
    } catch (error) {
        console.error("Erro ao inicializar a aplicação:", error);
    } finally {
        // Sempre garante que o loader será escondido
        try {
            if (pageLoader) {
                pageLoader.style.display = "none";
            }
            clearTimeout(loaderTimeout);
        } catch (e) {
            console.error('Erro ao esconder loader no finally:', e);
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);