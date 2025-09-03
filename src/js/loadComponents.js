/**
 * Carrega e injeta todos os componentes HTML parciais de forma assíncrona e em paralelo.
 * Retorna uma Promise que resolve quando todos os componentes foram carregados.
 */
export async function loadAllComponents() {
    const components = [
        { id: "headerPageContainer", file: "src/partials/headerPage.html" },
        { id: "ebooksPageContainer", file: "src/partials/ebooksPage.html" },
        { id: "packagesPageContainer", file: "src/partials/packagesPage.html" },
        { id: "aboutPageContainer", file: "src/partials/aboutPage.html" },
        { id: "contactPageContainer", file: "src/partials/contactPage.html" },
        { id: "accountPageContainer", file: "src/partials/accountPage.html" },
        { id: "cartPageContainer", file: "src/partials/cartPage.html" },
        { id: "faqPageContainer", file: "src/partials/faqPage.html" },
        { id: "footerPageContainer", file: "src/partials/footerPage.html" },
        { id: "productCategoriesContainer", file: "src/partials/productCategoriesPage.html" },
    ];

    try {
        await Promise.all(
            components.map(async (comp) => {
                const response = await fetch(comp.file);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${comp.file}`);
                const html = await response.text();
                const container = document.getElementById(comp.id);
                if (container) {
                    // Remover possível wrapper <div class="page" ...> para evitar duplicação de IDs/classes
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    const pageEl = temp.querySelector('.page');
                    if (pageEl) {
                        container.innerHTML = pageEl.innerHTML;
                    } else {
                        container.innerHTML = html;
                    }
                }
            })
        );
        console.log("Todos os componentes foram carregados com sucesso.");
    } catch (error) {
        console.error("Erro ao carregar os componentes:", error);
    }
}