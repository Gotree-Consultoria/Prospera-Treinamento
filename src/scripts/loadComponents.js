/**
 * Carrega e injeta todos os componentes HTML parciais de forma assíncrona e em paralelo.
 * Retorna uma Promise que resolve quando todos os componentes foram carregados.
 */
export async function loadAllComponents() {
    const components = [
        { id: "headerPageContainer", file: "src/pages/headerPage.html" },
        { id: "ebooksPageContainer", file: "src/pages/ebooksPage.html" },
        { id: "packagesPageContainer", file: "src/pages/packagesPage.html" },
        { id: "aboutPageContainer", file: "src/pages/aboutPage.html" },
        { id: "contactPageContainer", file: "src/pages/contactPage.html" },
        { id: "accountPageContainer", file: "src/pages/accountPage.html" },
        { id: "learningPageContainer", file: "src/pages/learningPage.html" },
        { id: "faqPageContainer", file: "src/pages/faqPage.html" },
        { id: "footerPageContainer", file: "src/pages/footerPage.html" },
        { id: "productCategoriesContainer", file: "src/pages/productCategoriesPage.html" },
    ];

    try {
        await Promise.all(
            components.map(async (comp) => {
                const url = comp.file.startsWith('/') ? comp.file : `/${comp.file}`;
                const response = await fetch(url);
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