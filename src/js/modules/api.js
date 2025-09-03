// Importa apenas o que é estritamente necessário para fazer chamadas de API
// (Não importa funções de navegação, renderização, etc.)
// Apenas os dados estáticos que você precisa, como a URL base

let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = "http://localhost:8080";
} else {
    API_BASE_URL = "https://j6h5i7c1kjn6.manus.space";
}

// =======================================================
// FUNÇÕES DE DADOS E CARREGAMENTO
// =======================================================

/**
 * Carrega todos os dados de produtos e pacotes da API.
 * @returns {Promise<Object>} Um objeto contendo os produtos e pacotes.
 */
export async function loadData() {
    const [productsResponse, packagesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/packages`),
    ]);

    if (!productsResponse.ok || !packagesResponse.ok) {
        throw new Error("Erro ao carregar os dados da API.");
    }

    const products = await productsResponse.json();
    const packages = await packagesResponse.json();
    
    return { products, packages };
}

// =======================================================
// FUNÇÕES DE AUTENTICAÇÃO E PERFIL
// =======================================================

/**
 * Envia credenciais de login para a API.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<Object>} Os dados do usuário logado e o token.
 */
export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || errorData.message || 'E-mail ou senha inválidos.');
    }

    return response.json();
}

/**
 * Registra um novo usuário na API.
 * @param {Object} userData - Os dados do novo usuário.
 * @returns {Promise<Object>} Os dados do usuário registrado.
 */
export async function registerUser(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao cadastrar.');
    }

    return response.json();
}

/**
 * Busca o perfil do usuário logado na API.
 * @param {string} token - O token de autenticação JWT.
 * @returns {Promise<Object>} Os dados do perfil do usuário.
 */
export async function fetchUserProfile(token) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error('Sessão expirada. Faça login novamente.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar perfil.');
    }

    return response.json();
}

/**
 * Atualiza o nome e o telefone do perfil do usuário.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} name - O novo nome.
 * @param {string} phone - O novo telefone.
 * @returns {Promise<Object>} Os dados do perfil atualizado.
 */
export async function updateUserProfile(token, data) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar o perfil.');
    }

    return response.json();
}

/**
 * Atualiza o email do usuário.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} email - O novo email.
 * @returns {Promise<Object>} Os dados do perfil atualizado.
 */
export async function updateUserEmail(token, email) {
    const response = await fetch(`${API_BASE_URL}/auth/profile/email`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar o e-mail.');
    }

    return response.json();
}

/**
 * Atualiza a senha do usuário.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} password - A nova senha.
 * @returns {Promise<Object>} A resposta da API.
 */
export async function updateUserPassword(token, password, oldPassword = null) {
    const body = oldPassword ? { oldPassword, password } : { password };
    const response = await fetch(`${API_BASE_URL}/auth/profile/password`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar a senha.');
    }

    return response.json();
}

// =======================================================
// OUTRAS FUNÇÕES DA API
// =======================================================

/**
 * Envia uma mensagem através do formulário de contato.
 * @param {Object} messageData - Os dados da mensagem.
 * @returns {Promise<Object>} A resposta da API.
 */
export async function sendMessage(messageData) {
    const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar a mensagem.');
    }

    return response.json();
}

/**
 * Realiza a subscrição na newsletter.
 * @param {string} email - O email para subscrição.
 * @returns {Promise<Object>} A resposta da API.
 */
export async function subscribeNewsletter(email) {
    const response = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro na subscrição.");
    }
    
    return response.json();
}

/**
 * Completa o perfil do usuário com dados pessoais (CPF, telefone, nascimento).
 * @param {string} token
 * @param {Object} data
 */
export async function completeUserProfile(token, data) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao completar perfil.');
    }

    return response.json();
}