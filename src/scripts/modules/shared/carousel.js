// Variáveis do módulo
export let currentIndex = 0;
export let track;
export let cards;

// Mapas específicos do carrossel
export const cardParamMap = { faq: "secao-faq", privacidade: "secao-privacidade", termos: "secao-termos", suporte: "secao-suporte" };
export const cardIdMap = { "secao-faq": "faq", "secao-privacidade": "privacidade", "secao-termos": "termos", "secao-suporte": "suporte" };

// Lógica aqui é a do carrossel
export function initCarousel() {
    track = document.querySelector(".carousel-track");
    cards = document.querySelectorAll(".carousel-card");
    if (!track || cards.length === 0) return;
    
    // A inicialização via URL será tratada pelo navigation.js
    // Apenas atualiza o carrossel na inicialização, para garantir que esteja na posição 0
    updateCarousel();
}

export function updateCarousel() {
    if (!track) return;
    const offset = -currentIndex * 100;
    track.style.transform = `translateX(${offset}%)`;
    
    // O navigation.js agora cuidará da URL
}

export function nextCard() {
    if (currentIndex < cards.length - 1) {
        currentIndex++;
        updateCarousel();
    }
}

export function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
    }
}

export function goToCardById(id) {
    const index = Array.from(cards).findIndex((card) => card.id === id);
    if (index !== -1) {
        currentIndex = index;
        updateCarousel();
    }
}