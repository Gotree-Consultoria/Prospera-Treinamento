// Importa apenas o que é estritamente necessário para fazer chamadas de API
// (Não importa funções de navegação, renderização, etc.)
// Apenas os dados estáticos que você precisa, como a URL base

let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = "http://localhost:8080";
} else {
    API_BASE_URL = "https://j6h5i7c1kjn6.manus.space";
}

// Helper: parse response body defensivamente
async function safeParseResponse(response) {
    // 204 No Content
    if (!response) return null;
    if (response.status === 204) return null;
    const ct = (response.headers && response.headers.get) ? (response.headers.get('content-type') || '') : '';
    // ler como texto primeiro (defensivo contra body vazio)
    const text = await response.text();
    if (!text) return null;
    // se for JSON declarado, tentar parsear
    if (ct.toLowerCase().includes('application/json')) {
        try { return JSON.parse(text); } catch (e) { /* fallback para text */ }
    }
    // tentar parsear mesmo sem content-type
    try { return JSON.parse(text); } catch (e) { return text; }
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

    const products = await safeParseResponse(productsResponse);
    const packages = await safeParseResponse(packagesResponse);
    
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
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && (errorData.erro || errorData.message)) || 'E-mail ou senha inválidos.');
    }

    return safeParseResponse(response);
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
        let errorData = null;
        try { errorData = await safeParseResponse(response); } catch (e) { /* ignore parse errors */ }
        // construir mensagem base
        let message = (errorData && (errorData.message || errorData.erro)) || 'Erro ao cadastrar.';
        const err = new Error(message);

        // Normalizar códigos quando possível
        if (errorData && errorData.code) {
            err.code = errorData.code;
        }

        // Heurística adicional: inspecionar texto cru para detectar unique/duplicate key do banco
        try {
            const raw = await response.text();
            const rawLower = (raw || '').toLowerCase();
            if (rawLower.includes('duplicate entry') || rawLower.includes('duplicate key') || rawLower.includes('unique constraint') || rawLower.includes('uk')) {
                err.code = 'EMAIL_IN_USE';
                // Prefer more amigável
                err.message = 'Este e-mail já está cadastrado. Use Entrar ou recupere a senha.';
                return Promise.reject(err);
            }
        } catch (e) { /* ignore reading raw body */ }

        // fallback para status HTTP comuns
        if (!err.code) {
            if (response.status === 409) {
                err.code = 'EMAIL_IN_USE';
                err.message = 'Este e-mail já está cadastrado. Use Entrar ou recupere a senha.';
            } else if (response.status === 400) {
                err.code = 'BAD_REQUEST';
            }
        }

        throw err;
    }

    return safeParseResponse(response);
}

/**
 * Busca o perfil do usuário logado na API.
 * @param {string} token - O token de autenticação JWT.
 * @returns {Promise<Object>} Os dados do perfil do usuário.
 */
export async function fetchUserProfile(token) {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
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
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || 'Erro ao buscar perfil.');
    }

    return safeParseResponse(response);
}

/**
 * Atualiza o nome e o telefone do perfil do usuário.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} name - O novo nome.
 * @param {string} phone - O novo telefone.
 * @returns {Promise<Object>} Os dados do perfil atualizado.
 */
export async function updateUserProfile(token, data) {
    // Atualiza campos genéricos do perfil do usuário autenticado.
    // Backend expõe o recurso canônico em /profile/me com PATCH para atualizações.
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || 'Erro ao atualizar o perfil.');
    }

    return safeParseResponse(response);
}

/**
 * Atualiza o email do usuário.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} email - O novo email.
 * @returns {Promise<Object>} Os dados do perfil atualizado.
 */
export async function updateUserEmail(token, email) {
    // Solicitação de alteração de e-mail: mantemos um endpoint de request-change e
    // um endpoint para aplicar a mudança, ambos sob /profile.
    const response = await fetch(`${API_BASE_URL}/profile/email`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
    });

    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || 'Erro ao atualizar o e-mail.');
    }

    return safeParseResponse(response);
}

/**
 * Atualiza a senha do usuário.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} password - A nova senha.
 * @returns {Promise<Object>} A resposta da API.
 */
export async function updateUserPassword(token, password, oldPassword = null) {
    const body = oldPassword ? { oldPassword, password } : { password };
    const response = await fetch(`${API_BASE_URL}/profile/password`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || 'Erro ao atualizar a senha.');
    }

    return safeParseResponse(response);
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
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || 'Erro ao enviar a mensagem.');
    }

    return safeParseResponse(response);
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
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || "Erro na subscrição.");
    }
    
    return safeParseResponse(response);
}

/**
 * Completa o perfil do usuário com dados pessoais (CPF, telefone, nascimento).
 * @param {string} token
 * @param {Object} data
 */
export async function completeUserProfile(token, data) {
    // Para completar o perfil PF preferimos o endpoint específico /profile/pf
    // que cria/atualiza os dados PF (fullName, cpf, birthDate, phone).
    const response = await fetch(`${API_BASE_URL}/profile/pf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        throw new Error((errorData && errorData.message) || 'Erro ao completar perfil.');
    }

    return safeParseResponse(response);
}

/**
 * Solicita ao backend que envie um e-mail de confirmação para o e-mail cadastrado
 * informando sobre a solicitação de alteração para `newEmail`.
 * O backend deve enviar a mensagem para o e-mail atual do usuário.
 */
export async function requestEmailChange(token, newEmail) {
    const response = await fetch(`${API_BASE_URL}/profile/email/request-change`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao solicitar alteração de e-mail.');
    }

    return response.json();
}

// =======================================================
// Roteiro 3,4,5 - Endpoints para PF e Organizações
// =======================================================

/**
 * Cria perfil PF para usuário logado
 */
export async function createPFProfile(token, data) {
    const response = await fetch(`${API_BASE_URL}/profile/pf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        let err = null;
        try { err = await safeParseResponse(response); } catch (e) { /* sem body */ }
        throw new Error((err && err.message) || 'Erro ao criar perfil PF');
    }
    // Alguns endpoints respondem com 201 sem body. Evitar chamar response.json() em body vazio.
    if (response.status === 201) {
        return safeParseResponse(response);
    }
    return safeParseResponse(response);
}

/**
 * Cria uma nova organização (PJ)
 */
export async function createOrganization(token, data) {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        let err = null;
        try { err = await response.json(); } catch (e) { /* sem body */ }
        throw new Error((err && err.message) || 'Erro ao criar organização');
    }
    // tratar caso de 201 Created com ou sem body
    if (response.status === 201) {
        try {
            const text = await response.text();
            if (!text) return null;
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }
    try {
        return await response.json();
    } catch (e) {
        return null;
    }
}

/**
 * Lista todas as organizações (requer SYSTEM_ADMIN)
 */
export async function getAllOrganizations(token) {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && err.message) || 'Erro ao listar organizações');
    }
    return safeParseResponse(response);
}

/**
 * Lista organizações do usuário logado
 */
export async function getMyOrganizations(token) {
    const response = await fetch(`${API_BASE_URL}/profile/me/organizations`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && err.message) || 'Erro ao listar organizações do usuário');
    }
    return safeParseResponse(response);
}

/**
 * Lista membros de uma organização
 */
export async function getOrgMembers(token, organizationId) {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/members`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && err.message) || 'Erro ao obter membros');
    }
    return safeParseResponse(response);
}

/**
 * Adiciona um membro por convite
 */
export async function addOrgMember(token, organizationId, body) {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && err.message) || 'Erro ao adicionar membro');
    }
    return safeParseResponse(response);
}

/**
 * Remove membro da organização
 */
export async function removeOrgMember(token, organizationId, membershipId) {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/members/${membershipId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && err.message) || 'Erro ao remover membro');
    }
    return response.status === 204 ? null : safeParseResponse(response);
}

/**
 * Atualiza a função (role) de um membro da organização
 */
export async function updateOrgMemberRole(token, organizationId, membershipId, newRole) {
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/members/${membershipId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newRole })
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        let err = null;
        try { err = await safeParseResponse(response); } catch(e) { /* ignore */ }
        throw new Error((err && (err.message || err.erro)) || 'Erro ao atualizar função do membro');
    }
    // retornar dados atualizados do membro
    return safeParseResponse(response);
}