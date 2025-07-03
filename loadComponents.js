// loadComponents.js (carrega as paginas via container)

document.addEventListener("DOMContentLoaded", function () {
  // Carregar E-books
  fetch("partials/ebooksPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("ebooksPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo de E-books:", error)
    );

  // Carregar Footer
  fetch("partials/footerPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("footerPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do Footer:", error)
    );

  // Carregar packages Page
  fetch("partials/packagesPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("packagesPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do packages pages:", error)
    );

  // Carregar about Page
  fetch("partials/aboutPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("aboutPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do about page :", error)
    );

  // Carregar contact Page
  fetch("partials/contactPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("contactPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do contact page:", error)
    );

  // Carregar account page
  fetch("partials/accountPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("accountPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do account page:", error)
    );

  // Carregar cart page
  fetch("partials/cartPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("cartPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do cart page:", error)
    );

  // Carregar product categories section
  fetch("partials/productCategoriesPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("productCategoriesContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error(
        "Erro ao carregar o conteúdo do product categories section:",
        error
      )
    );

  // Carregar header page
  fetch("partials/headerPage.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.getElementById("headerPageContainer");
      if (container) container.innerHTML = html;
    })
    .catch((error) =>
      console.error("Erro ao carregar o conteúdo do header page:", error)
    );

 
// Carregar faq page
fetch("partials/faqPage.html")
  .then((response) => response.text())
  .then((html) => {
    const container = document.getElementById("faqPageContainer");
    if (container) container.innerHTML = html;

    // Esperar DOM ficar pronto antes de chamar o carrossel
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const cardParam = params.get("card");

      const isCarouselCard =
        cardParam === "faq" ||
        cardParam === "privacidade" ||
        cardParam === "termos" ||
        cardParam === "suporte";

      // Só ativa a FAQ se for um card válido E a URL não tiver hash como #home
      if (isCarouselCard && !window.location.hash) {
        // Oculta todas as páginas
        document
          .querySelectorAll(".page")
          .forEach((page) => page.classList.remove("active"));

        // Ativa somente a página FAQ
        const faqPage = document.getElementById("faqPage");
        if (faqPage) faqPage.classList.add("active");
      }

      // Inicializa o carrossel sempre
      initCarousel();
    }, 100);
  })
  .catch((error) =>
    console.error("Erro ao carregar o conteúdo do faq page:", error)
  );

});
