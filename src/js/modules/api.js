// Importa apenas o que é estritamente necessário para fazer chamadas de API
// (Não importa funções de navegação, renderização, etc.)
// Apenas os dados estáticos que você precisa, como a URL base

export let API_BASE_URL;
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
            'Accept': 'application/json, text/plain, */*',
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
            'Authorization': `Bearer ${token}`,
            // Força backend a responder com JSON quando possível (evita HTML de /error)
            'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        if (response.status === 401) {
            const e = new Error('Sessão expirada ou não autorizada');
            e.code = 'UNAUTHORIZED';
            e.status = 401;
            throw e;
        }
        let parsed = null;
        let rawText = '';
        try {
            // Tentar ler texto primeiro para podermos reprocessar
            rawText = await response.text();
            if (rawText) {
                try { parsed = JSON.parse(rawText); } catch (jsonErr) { /* manter texto */ }
            }
        } catch (readErr) { /* ignore */ }

        // Heurísticas de extração
        const messageFromParsed = parsed && (parsed.message || parsed.erro || parsed.error || parsed.detail);
        const field = parsed && (parsed.field || parsed.campo || null);
        const backendCode = parsed && (parsed.code || parsed.errorCode || null);

        // Detectar duplicidade de CPF por código ou texto cru
        let duplicateCpf = false;
        const lowerRaw = (rawText || '').toLowerCase();
        const sentCpf = (data && data.cpf) ? String(data.cpf).replace(/\D/g, '') : null;
        const normalizedRawDigits = lowerRaw.replace(/\D/g, '');

        // 1. Backend já sinaliza algum code com duplicate/cpf
        if (!duplicateCpf && backendCode && /duplicate|cpf|constraint/i.test(backendCode)) duplicateCpf = true;
        // 2. Mensagem parseada contém indicação clara
        if (!duplicateCpf && messageFromParsed && /cpf(.+)?(cadastr|exist|duplic)/i.test(messageFromParsed)) duplicateCpf = true;
        // 3. Texto bruto contém 'duplicate' e 'cpf'
        if (!duplicateCpf && lowerRaw.includes('duplicate') && lowerRaw.includes('cpf')) duplicateCpf = true;
        // 4. Texto bruto contém 'duplicate' e o número de CPF enviado (caso backend não inclua a palavra cpf)
        if (!duplicateCpf && lowerRaw.includes('duplicate') && sentCpf && lowerRaw.includes(sentCpf)) duplicateCpf = true;
        // 5. SQLState de violação de integridade / constraint hints
        if (!duplicateCpf && (lowerRaw.includes('sqlintegrityconstraintviolationexception') || lowerRaw.includes('sqlstate: 23000') || lowerRaw.includes('23000'))) duplicateCpf = true;
        // 6. Padrões de key única do MySQL (for key 'UK....') + duplicate
        if (!duplicateCpf && lowerRaw.includes('duplicate entry') && lowerRaw.includes(' for key ')) duplicateCpf = true;
        // 7. Heurística final: o raw sem caracteres não numéricos contem repetição do CPF (para casos com máscara) duas vezes
        if (!duplicateCpf && sentCpf && normalizedRawDigits.includes(sentCpf) && (lowerRaw.match(/duplicate/) || []).length) duplicateCpf = true;

        // Alguns ambientes podem estar retornando 403 ao propagar erro via /error (Spring Security),
        // se raw contiver padrão de duplicate entry tratamos como duplicidade.
        if (!duplicateCpf && response.status === 403) {
            if (/duplicate entry/i.test(lowerRaw)) {
                duplicateCpf = true;
            } else if (!rawText || rawText.trim() === '') {
                // Alguns proxies de erro Spring podem suprimir body. Se já detectamos tentativa anterior igual (cpf em sessionStorage), assumir duplicado.
                try {
                    const lastCpf = sessionStorage.getItem('lastPfAttemptCpf');
                    if (lastCpf && sentCpf && lastCpf === sentCpf) {
                        duplicateCpf = true;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        // Detectar CPF inválido (validação backend Caelum Stella etc.)
        let invalidCpf = false;
        const invalidCpfPatterns = [
            /cpf inválido/i,
            /cpf invalido/i,
            /cpf\s+não\s+válido/i,
            /cpf\s+nao\s+valido/i,
            /invalid cpf/i,
            /cpf.*inv[aá]lido/i,
            /inv[aá]lido.*cpf/i,
            /documento inválido/i,
            /documento invalido/i
        ];
        const lowerMessage = (messageFromParsed || '').toLowerCase();
        if (!duplicateCpf) {
            if (messageFromParsed && invalidCpfPatterns.some(r => r.test(messageFromParsed))) {
                invalidCpf = true;
            } else if (lowerRaw && invalidCpfPatterns.some(r => r.test(lowerRaw))) {
                invalidCpf = true;
            } else if (lowerMessage.includes('cpf') && (lowerMessage.includes('inval') || lowerMessage.includes('invalid'))) {
                invalidCpf = true;
            } else if (lowerRaw.includes('cpf') && (lowerRaw.includes('inval') || lowerRaw.includes('invalid'))) {
                invalidCpf = true;
            } else if (backendCode && /invalid.*cpf|cpf.*invalid|cpf.*inval/i.test(backendCode)) {
                invalidCpf = true;
            }
            // fallback heurístico: se o CPF enviado tem tamanho != 11 e houve 400, classificar como inválido
            if (!invalidCpf && response.status === 400 && sentCpf && sentCpf.length !== 11) {
                invalidCpf = true;
            }
        }

        const finalMessage = duplicateCpf
            ? 'CPF já cadastrado. Verifique se já existe um perfil associado ou entre em contato com o suporte.'
            : invalidCpf
                ? 'CPF inválido. Verifique o número digitado.'
                : (messageFromParsed || 'Erro ao criar perfil PF');

        const err = new Error(finalMessage);
    if (duplicateCpf) err.code = 'DUPLICATE_CPF';
    else if (invalidCpf) err.code = 'INVALID_CPF';
        if (backendCode && !err.code) err.code = backendCode;
        if (field) err.field = field;
        err.status = response.status;
        // Anexar debug raw para possíveis logs (não exibir diretamente ao usuário)
        err._raw = rawText;
        try {
            // Guardar última resposta bruta para debug (limita tamanho para evitar storage excessivo)
            if (rawText) {
                const trimmed = rawText.length > 600 ? rawText.slice(0,600) + '…(trimmed)' : rawText;
                sessionStorage.setItem('lastPfErrorRaw', trimmed);
            }
        } catch (e) { /* ignore quota/security */ }
        if (sentCpf) {
            err.cpf = sentCpf; // metadado útil para handlers de UI
            try { sessionStorage.setItem('lastPfAttemptCpf', sentCpf); } catch (e) { /* ignore */ }
        }
        throw err;
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
        let parsed = null; let rawText = '';
        try { rawText = await response.text(); if (rawText) { try { parsed = JSON.parse(rawText); } catch(e) { /* ignore */ } } } catch(e) { /* ignore */ }
        const msg = (parsed && (parsed.message || parsed.erro || parsed.error || parsed.detail)) || 'Erro ao criar organização';
        const err = new Error(msg);
        err.status = response.status;
        err._raw = rawText;
        // heurísticas para campos inválidos
        const lower = (rawText || msg).toLowerCase();
    if (/cnpj/.test(lower) && /invalid|inválid|invalido|formato/.test(lower)) err.code = 'INVALID_CNPJ';
    if (/ra.z.o|razao/.test(lower) && /obrigat|required|faltante|missing/.test(lower)) err.code = 'MISSING_RAZAO_SOCIAL';
    if (/campo|field/.test(lower) && /inválid|invalid/.test(lower) && !err.code) err.code = 'INVALID_FIELD';
        throw err;
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
 * Remove a afiliação do usuário logado com uma organização (auto-remoção)
 * Endpoint: DELETE /profile/me/organizations/{organizationId}
 */
export async function removeMyOrgMembership(token, organizationId) {
    const response = await fetch(`${API_BASE_URL}/profile/me/organizations/${organizationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && err.message) || 'Erro ao sair da organização');
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

/**
 * Lista todos os usuários (requer SYSTEM_ADMIN)
 */
export async function getAdminUsers(token) {
    const url = `${API_BASE_URL}/admin/users`;
    console.debug('[api] getAdminUsers request to', url, 'token present=', !!token);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        const err = new Error((errorData && errorData.message) || 'Erro ao buscar usuários.');
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Busca detalhe de um usuário por ID (requer SYSTEM_ADMIN)
 */
export async function getAdminUserById(token, userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        const err = new Error((errorData && errorData.message) || 'Erro ao buscar detalhe do usuário.');
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Ativa ou inativa um usuário (requer SYSTEM_ADMIN)
 * Preferência: PATCH /admin/users/{userId}  body: { enabled: true|false }
 * Fallback:    PATCH /admin/users/{userId}/status  body: { newStatus: 'ACTIVE' | 'INACTIVE' }
 */
export async function patchAdminUserStatus(token, userId, enabledOrStatus) {
    // Normaliza entrada para boolean
    let enabled;
    if (typeof enabledOrStatus === 'boolean') {
        enabled = enabledOrStatus;
    } else if (typeof enabledOrStatus === 'string') {
        const s = enabledOrStatus.trim().toLowerCase();
        enabled = (s === 'true' || s === 'active' || s === 'enabled' || s === 'ativado' || s === 'ativo');
    } else {
        throw new Error('Parâmetro inválido para patchAdminUserStatus');
    }

    // 1) Tentar endpoint canônico sem /status
    const primaryUrl = `${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`;
    let response = await fetch(primaryUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
    });

    if (response.ok) {
        return safeParseResponse(response);
    }

    // 404/405/400 podem indicar que o backend espera outro endpoint/payload
    if ([400, 404, 405].includes(response.status)) {
        const fallbackUrl = `${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/status`;
        const newStatus = enabled ? 'ACTIVE' : 'INACTIVE';
        response = await fetch(fallbackUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newStatus })
        });
        if (response.ok) {
            return safeParseResponse(response);
        }
    }

    // Se chegou aqui, falhou
    const errorData = await safeParseResponse(response);
    const err = new Error((errorData && errorData.message) || 'Erro ao atualizar status do usuário.');
    err.status = response.status;
    throw err;
}

/**
 * Lista organizações (requer SYSTEM_ADMIN)
 */
export async function getAdminOrganizations(token) {
    const response = await fetch(`${API_BASE_URL}/admin/organizations`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        const err = new Error((errorData && errorData.message) || 'Erro ao listar organizações.');
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Ativa/Inativa uma organização
 * PATCH /admin/organizations/{orgId}/status  body: { newStatus: 'ACTIVE'|'INACTIVE' }
 *
 * Compatível com chamada passando boolean (true -> ACTIVE, false -> INACTIVE)
 * ou string ('ACTIVE'|'INACTIVE'|other variants).
 */
export async function patchAdminOrganizationStatus(token, orgId, enabledOrStatus) {
    // normalize to backend expected string
    let newStatus = null;
    if (typeof enabledOrStatus === 'boolean') {
        newStatus = enabledOrStatus ? 'ACTIVE' : 'INACTIVE';
    } else if (typeof enabledOrStatus === 'string') {
        const s = enabledOrStatus.trim().toLowerCase();
        if (s === 'active' || s === 'enabled' || s === 'true') newStatus = 'ACTIVE';
        else if (s === 'inactive' || s === 'disabled' || s === 'false') newStatus = 'INACTIVE';
        else newStatus = enabledOrStatus.toUpperCase();
    } else {
        throw new Error('Invalid status parameter for patchAdminOrganizationStatus');
    }

    const response = await fetch(`${API_BASE_URL}/admin/organizations/${encodeURIComponent(orgId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newStatus })
    });
    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        const err = new Error((errorData && errorData.message) || 'Erro ao atualizar status da organização.');
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Stubs para CRUD de conteúdo e analytics — podem ser implementados conforme backend
 */
export async function getAdminContentSummary(token) {
    const response = await fetch(`${API_BASE_URL}/admin/content/summary`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error('Erro ao buscar resumo de conteúdo');
    return safeParseResponse(response);
}

export async function getAdminAnalyticsSummary(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/analytics/summary`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('fail');
        return safeParseResponse(response);
    } catch (e) {
        // Mock provisório até backend real estar disponível
        console.warn('[API MOCK] getAdminAnalyticsSummary usando dados simulados');
        const now = new Date();
        return {
            mock: true,
            generatedAt: now.toISOString(),
            totals: {
                users: 42,
                activeUsers: 38,
                organizations: 5,
                trainings: 17,
                publishedTrainings: 9,
                sectors: 6
            },
            last7Days: {
                newUsers: [3,2,0,4,1,5,2],
                newEnrollments: [1,0,2,1,3,2,4],
                labels: Array.from({length:7}, (_,i)=> { const d=new Date(now); d.setDate(d.getDate()-(6-i)); return d.toISOString().substring(0,10); })
            }
        };
    }
}

/**
 * Busca detalhe de uma organização pelo ID (requer SYSTEM_ADMIN)
 * Endpoint: GET /admin/organizations/{organizationId}
 */
export async function getAdminOrganizationById(token, organizationId) {
    const response = await fetch(`${API_BASE_URL}/admin/organizations/${encodeURIComponent(organizationId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errorData = await safeParseResponse(response);
        const err = new Error((errorData && errorData.message) || 'Erro ao buscar detalhe da organização.');
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Desativa (soft delete) um usuário com anonimização.
 * Tentativas em ordem:
 *  - DELETE /admin/users/{userId}
 *  - POST   /admin/users/{userId}/deactivate
 *  - PATCH  /admin/users/{userId}/deactivate
 *  - PATCH  /admin/users/{userId}  body: { action: 'DEACTIVATE' }
 */
export async function deactivateAdminUser(token, userId) {
    const headers = { 'Authorization': `Bearer ${token}` };
    // Preferência: PATCH /admin/users/{id}/deactivate
    let response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/deactivate`, {
        method: 'PATCH', headers
    });
    if (response.ok || response.status === 204) return response.status === 204 ? null : safeParseResponse(response);

    // Fallbacks seguros
    if ([400, 404, 405].includes(response.status)) {
        // PATCH /admin/users/{id} { action: 'DEACTIVATE' }
        response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
            method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'DEACTIVATE' })
        });
        if (response.ok || response.status === 204) return response.status === 204 ? null : safeParseResponse(response);
    }

    const errData = await safeParseResponse(response);
    const err = new Error((errData && errData.message) || 'Erro ao desativar (soft delete) o usuário.');
    err.status = response.status;
    throw err;
}

/**
 * Reativa um usuário (se suportado pelo backend).
 * Tentativas em ordem:
 *  - PATCH /admin/users/{userId}           body: { enabled: true }
 *  - POST  /admin/users/{userId}/activate  (sem body)
 *  - PATCH /admin/users/{userId}/activate  (semântica explícita)
 *  - PATCH /admin/users/{userId}/status    body: { newStatus: 'ACTIVE' }
 */
export async function activateAdminUser(token, userId) {
    const headers = { 'Authorization': `Bearer ${token}` };
    // Preferência: PATCH /admin/users/{id}/activate
    let response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/activate`, {
        method: 'PATCH', headers
    });
    if (response.ok || response.status === 204) return response.status === 204 ? null : safeParseResponse(response);

    // Fallbacks seguros
    if ([400, 404, 405].includes(response.status)) {
        // PATCH /admin/users/{id} { enabled: true }
        response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
            method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true })
        });
        if (response.ok || response.status === 204) return response.status === 204 ? null : safeParseResponse(response);
    }

    const errData = await safeParseResponse(response);
    const err = new Error((errData && errData.message) || 'Erro ao reativar o usuário.');
    err.status = response.status;
    throw err;
}

/**
 * Consulta dados básicos de um CNPJ.
 * Endpoint backend: GET /api/lookup/cnpj/{cnpj}
 * Aceita CNPJ com ou sem máscara; limpa caracteres não numéricos.
 * Retorna objeto com pelo menos { cnpj, razaoSocial } ou lança erro.
 */
export async function lookupCnpj(cnpj) {
    if (!cnpj) throw new Error('CNPJ não informado');
    const digits = String(cnpj).replace(/\D/g, '');
    if (digits.length < 14) {
        const e = new Error('CNPJ deve ter 14 dígitos.');
        e.code = 'INVALID_CNPJ_LENGTH';
        throw e;
    }
    const response = await fetch(`${API_BASE_URL}/api/lookup/cnpj/${digits}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*'
        }
    });
    if (!response.ok) {
        let parsed = null;
        try { parsed = await safeParseResponse(response); } catch (e) { /* ignore */ }
        const msg = (parsed && (parsed.message || parsed.erro || parsed.error)) || (response.status === 404 ? 'CNPJ não encontrado.' : 'Erro ao consultar CNPJ.');
        const err = new Error(msg);
        err.status = response.status;
        if (response.status === 404) err.code = 'CNPJ_NOT_FOUND';
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Lista setores adotados por uma organização (endpoint admin)
 * GET /admin/organizations/{organizationId}/sectors
 * Requer SYSTEM_ADMIN.
 */
export async function getOrganizationSectors(token, organizationId) {
    // Endpoint voltado ao contexto da organização (sem prefixo /admin) para uso por ORG_ADMIN / membros autorizados
    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId}/sectors`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const err = await safeParseResponse(response);
        throw new Error((err && (err.message || err.error || err.erro)) || 'Erro ao listar setores da organização');
    }
    return safeParseResponse(response);
}

/**
 * (Compat) Lista setores adotados por uma organização via endpoint ADMIN.
 * Mantido para páginas de administração que já importam getAdminOrganizationSectors.
 * GET /admin/organizations/{organizationId}/sectors  (requer SYSTEM_ADMIN)
 */
export async function getAdminOrganizationSectors(token, organizationId) {
    const response = await fetch(`${API_BASE_URL}/admin/organizations/${organizationId}/sectors`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            const e = new Error('Acesso negado.');
            e.status = response.status;
            throw e;
        }
        const err = await safeParseResponse(response);
        throw new Error((err && (err.message || err.error || err.erro)) || 'Erro ao listar setores (admin).');
    }
    return safeParseResponse(response);
}

/**
 * Lista setores adotados pela própria organização do usuário ORG_ADMIN.
 * Caso o backend ainda não possua um endpoint dedicado, tenta reutilizar o admin se o token tiver permissão.
 * Preferência: GET /admin/organizations/{orgId}/sectors (já existente) – aqui apenas um wrapper semântica.
 * Se futuramente existir /organizations/{orgId}/sectors sem prefixo admin, adaptar.
 */
export async function getMyOrganizationSectors(token, organizationId) {
    return getOrganizationSectors(token, organizationId);
}

/**
 * Desvincula (remove) um setor adotado pela organização.
 * DELETE /organizations/{orgId}/sectors/{sectorId}
 */
export async function removeOrganizationSector(token, orgId, sectorId) {
    if (!token) throw new Error('Token ausente');
    if (!orgId) throw new Error('OrgId ausente');
    if (!sectorId) throw new Error('SectorId ausente');
    const response = await fetch(`${API_BASE_URL}/organizations/${encodeURIComponent(orgId)}/sectors/${encodeURIComponent(sectorId)}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        let parsed = null;
        try { parsed = await safeParseResponse(response); } catch (_) {}
        const msg = (parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao remover setor.';
        const err = new Error(msg);
        err.status = response.status;
        throw err;
    }
    return true;
}

/**
 * Lista todos os setores globais disponíveis no sistema.
 * Endpoint: GET /admin/sectors (requer SYSTEM_ADMIN)
 */
export async function getAdminSectors(token) {
    if (!token) throw new Error('Token ausente');
    const response = await fetch(`${API_BASE_URL}/admin/sectors`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            const e = new Error('Acesso negado.');
            e.status = response.status;
            throw e;
        }
        let parsed = null;
        try { parsed = await safeParseResponse(response); } catch (e) { /* ignore */ }
        const msg = (parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao listar setores.';
        const err = new Error(msg);
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Cria um novo setor global.
 * POST /admin/sectors  body: { name }
 * Retorna objeto SectorDTO { id, name }
 */
export async function createAdminSector(token, name) {
    if (!token) throw new Error('Token ausente');
    if (!name || !name.trim()) {
        const e = new Error('Nome do setor é obrigatório.');
        e.code = 'VALIDATION_NAME_REQUIRED';
        throw e;
    }
    const payload = { name: name.trim() };
    const response = await fetch(`${API_BASE_URL}/admin/sectors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let parsed = null;
        try { parsed = await safeParseResponse(response); } catch (e) { /* ignore */ }
        const msg = (parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao criar setor.';
        const err = new Error(msg);
        err.status = response.status;
        if (response.status === 400) err.code = 'INVALID_SECTOR_DATA';
        if (response.status === 409) err.code = 'SECTOR_DUPLICATE';
        throw err;
    }
    return safeParseResponse(response);
}

// =======================================================
// ADMIN - TREINAMENTOS (Gestão de Conteúdo)
// Endpoints fornecidos:
// GET    /admin/trainings
// POST   /admin/trainings            body: { title, description, author, entityType, organizationId }
// POST   /admin/trainings/{id}/publish
// POST   /admin/trainings/{id}/sectors body: { sectorId, trainingType, legalBasis }
// EBOOKS (do backend informado):
// POST   /admin/trainings/ebooks/{trainingId}/upload   (multipart/form-data file)
// GET    /admin/ebooks/{filename}            (serve PDF inline)
// PUT    /admin/ebooks/{trainingId}          body: { lastPageRead }
// =======================================================

/**
 * Lista todos os treinamentos do sistema.
 * Retorna array ou objeto com array (tolerante a formatos variados).
 */
export async function getAdminTrainings(token) {
    if (!token) throw new Error('Token ausente');
    const response = await fetch(`${API_BASE_URL}/admin/trainings`, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            const e = new Error('Acesso negado.'); e.status = response.status; throw e;
        }
        const parsed = await safeParseResponse(response);
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao listar treinamentos.');
        err.status = response.status; throw err;
    }
    return safeParseResponse(response);
}

/**
 * Cria um novo treinamento.
 * dto = { title, description, author, entityType, organizationId }
 * entityType exemplos: RECORDED_COURSE, EBOOK, LIVE_COURSE (dep. backend)
 */
export async function createAdminTraining(token, dto) {
    if (!token) throw new Error('Token ausente');
    if (!dto || !dto.title || !dto.entityType) {
        const e = new Error('Título e tipo (entityType) são obrigatórios.');
        e.code = 'VALIDATION_MISSING_FIELDS';
        throw e;
    }
    const response = await fetch(`${API_BASE_URL}/admin/trainings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dto)
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(e) { /* ignore */ }
        const msg = (parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao criar treinamento.';
        const err = new Error(msg); err.status = response.status;
        if (response.status === 400) err.code = 'INVALID_TRAINING_DATA';
        if (response.status === 409) err.code = 'TRAINING_DUPLICATE';
        throw err;
    }
    // 201 Created retorna body TrainingDTO
    return safeParseResponse(response);
}

/**
 * Publica um treinamento tornando-o visível.
 */
export async function publishAdminTraining(token, trainingId) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID do treinamento ausente');
    const response = await fetch(`${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const parsed = await safeParseResponse(response);
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao publicar treinamento.');
        err.status = response.status; throw err;
    }
    return null; // 200 OK sem body
}

/**
 * Associa um treinamento a um setor global.
 * assignment = { sectorId, trainingType, legalBasis }
 * trainingType ex: COMPULSORY | ELECTIVE (dep. backend); legalBasis string opcional.
 */
export async function assignTrainingToSector(token, trainingId, assignment) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID do treinamento ausente');
    if (!assignment || !assignment.sectorId || !assignment.trainingType) {
        const e = new Error('sectorId e trainingType são obrigatórios.');
        e.code = 'VALIDATION_MISSING_FIELDS';
        throw e;
    }
    const response = await fetch(`${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}/sectors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignment)
    });
    if (!response.ok) {
        const parsed = await safeParseResponse(response);
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao associar setor.');
        err.status = response.status;
        if (response.status === 400) err.code = 'INVALID_ASSIGNMENT_DATA';
        if (response.status === 404) err.code = 'TRAINING_OR_SECTOR_NOT_FOUND';
        throw err;
    }
    return null; // 201 Created sem body esperado
}

/**
 * Busca detalhes completos de um treinamento.
 * GET /admin/trainings/{trainingId}
 */
export async function getAdminTrainingById(token, trainingId) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID do treinamento ausente');
    const response = await fetch(`${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const parsed = await safeParseResponse(response);
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao buscar treinamento.');
        err.status = response.status;
        if (response.status === 404) err.code = 'TRAINING_NOT_FOUND';
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Atualiza campos editáveis de um treinamento.
 * PUT /admin/trainings/{trainingId}  body: { title, description, author }
 */
export async function updateAdminTraining(token, trainingId, data) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID do treinamento ausente');
    if (!data || (!data.title && !data.description && !data.author)) {
        const e = new Error('Forneça ao menos um campo para atualizar.');
        e.code = 'VALIDATION_EMPTY_UPDATE';
        throw e;
    }
    const payload = { };
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.author !== undefined) payload.author = data.author;
    const response = await fetch(`${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(e) {}
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao atualizar treinamento.');
        err.status = response.status;
        if (response.status === 404) err.code = 'TRAINING_NOT_FOUND';
        if (response.status === 400) err.code = 'INVALID_TRAINING_UPDATE';
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Exclui um treinamento (se permitido pelo backend).
 * DELETE /admin/trainings/{trainingId}
 */
export async function deleteAdminTraining(token, trainingId) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID do treinamento ausente');
    const response = await fetch(`${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const parsed = await safeParseResponse(response);
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao deletar treinamento.');
        err.status = response.status;
        if (response.status === 404) err.code = 'TRAINING_NOT_FOUND';
        if (response.status === 409) err.code = 'TRAINING_HAS_ENROLLMENTS';
        throw err;
    }
    return null; // 204 ou 200 sem body
}

/**
 * Desvincula um treinamento de um setor (SYSTEM_ADMIN)
 * DELETE /admin/trainings/{trainingId}/sectors/{sectorId}
 */
export async function unlinkTrainingSector(token, trainingId, sectorId) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId || !sectorId) throw new Error('Parâmetros inválidos');
    const response = await fetch(`${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}/sectors/${encodeURIComponent(sectorId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json, text/plain, */*' }
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(e) {}
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao desvincular setor.');
        err.status = response.status;
        if (response.status === 404) err.code = 'NOT_FOUND';
        throw err;
    }
    return true;
}

/**
 * Organização deixa de seguir um setor (ORG_ADMIN)
 * DELETE /organizations/{orgId}/sectors/{sectorId}
 */
export async function orgUnfollowSector(token, orgId, sectorId) {
    if (!token) throw new Error('Token ausente');
    if (!orgId || !sectorId) throw new Error('Parâmetros inválidos');
    const response = await fetch(`${API_BASE_URL}/organizations/${encodeURIComponent(orgId)}/sectors/${encodeURIComponent(sectorId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json, text/plain, */*' }
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(e) {}
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao remover setor da organização.');
        err.status = response.status;
        if (response.status === 404) err.code = 'NOT_FOUND';
        throw err;
    }
    return true;
}

/**
 * Upload do arquivo PDF de um E-book já criado.
 * Backend: POST /admin/trainings/ebooks/{trainingId}/upload  (Multipart)
 * @returns {Promise<null|object>} - backend retorna 200 sem body (Void) segundo o contrato atual.
 */
export async function uploadEbookFile(token, trainingId, file) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID do treinamento ausente');
    if (!file) throw new Error('Arquivo PDF ausente');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/trainings/ebooks/${encodeURIComponent(trainingId)}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // não definir Content-Type para deixar boundary automático
        body: formData
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(e){}
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Falha no upload do e-book.');
        err.status = response.status; throw err;
    }
    try { return await safeParseResponse(response); } catch(e) { return null; }
}

/**
 * Upload com progresso usando XMLHttpRequest (quando for necessário mostrar barra).
 * onProgress(pct:number) chamado de 0..100.
 */
export function uploadEbookFileWithProgress(token, trainingId, file, onProgress, signal) {
    if (!token) return Promise.reject(new Error('Token ausente'));
    if (!trainingId) return Promise.reject(new Error('ID do treinamento ausente'));
    if (!file) return Promise.reject(new Error('Arquivo PDF ausente'));
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/admin/trainings/ebooks/${encodeURIComponent(trainingId)}/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable && typeof onProgress === 'function') {
                const pct = Math.round((ev.loaded / ev.total) * 100);
                try { onProgress(pct); } catch(e){}
            }
        });
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try { resolve(JSON.parse(xhr.responseText || 'null')); } catch(e) { resolve(null); }
                } else {
                    reject(new Error('Erro no upload do e-book: HTTP ' + xhr.status));
                }
            }
        };
        if (signal) {
            signal.addEventListener('abort', () => { try { xhr.abort(); } catch(e){} reject(new Error('Upload abortado')); });
        }
        const formData = new FormData(); formData.append('file', file);
        xhr.send(formData);
    });
}

/**
 * Atualiza progresso de leitura do e-book.
 * PUT /admin/ebooks/{trainingId}  body: { lastPageRead }
 */
export async function updateEbookProgress(token, trainingId, lastPageRead) {
    if (!token) throw new Error('Token ausente');
    if (!trainingId) throw new Error('ID ausente');
    const payload = { lastPageRead };
    const response = await fetch(`${API_BASE_URL}/admin/ebooks/${encodeURIComponent(trainingId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(e){}
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao atualizar progresso do e-book.');
        err.status = response.status; throw err;
    }
    return null;
}

/**
 * Monta URL pública (inline) para servir o PDF (GET /admin/ebooks/{filename}).
 * O backend espera filename armazenado; se futuramente retornar `ebookFileName` num DTO, usar aqui.
 */
export function buildEbookFileUrl(filename) {
    if (!filename) return null;
    return `${API_BASE_URL}/admin/ebooks/${encodeURIComponent(filename)}`;
}

// =======================================================
// TREINAMENTOS - CAPA (Cover Image)
// =======================================================
/**
 * Faz upload da imagem de capa de um treinamento.
 * Endpoint: POST /admin/trainings/{trainingId}/cover-image
 * @param {string} token JWT
 * @param {string} trainingId
 * @param {File|Blob} file (image/png, image/jpeg, etc)
 * @param {function(number):void} [onProgress]
 */
export async function uploadTrainingCoverImage(token, trainingId, file, onProgress) {
    if (!token) throw new Error('Token ausente.');
    if (!trainingId) throw new Error('TrainingId ausente.');
    if (!file) throw new Error('Arquivo de imagem não informado.');
    // Usar XHR para progresso
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/admin/trainings/${encodeURIComponent(trainingId)}/cover-image`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const json = JSON.parse(xhr.responseText || 'null');
                        resolve(json);
                    } catch (e) { resolve(null); }
                } else {
                    let message = 'Falha no upload da capa.';
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed && (parsed.message || parsed.error || parsed.erro)) message = parsed.message || parsed.error || parsed.erro;
                    } catch(_){}
                    reject(new Error(message));
                }
            }
        };
        if (xhr.upload && typeof onProgress === 'function') {
            xhr.upload.onprogress = (evt) => {
                if (evt.lengthComputable) {
                    const pct = Math.round((evt.loaded / evt.total) * 100);
                    try { onProgress(pct); } catch(_){}
                }
            };
        }
        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
    });
}

/**
 * Busca detalhes de um setor específico.
 * GET /admin/sectors/{sectorId}
 */
export async function getAdminSectorById(token, sectorId) {
    if (!token) throw new Error('Token ausente');
    if (!sectorId) throw new Error('sectorId ausente');
    const response = await fetch(`${API_BASE_URL}/admin/sectors/${encodeURIComponent(sectorId)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        let parsed = null; try { parsed = await safeParseResponse(response); } catch(_){}
        const err = new Error((parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao buscar setor.');
        err.status = response.status;
        if (response.status === 404) err.code = 'SECTOR_NOT_FOUND';
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Lista setores públicos disponíveis para o catálogo unificado (acessível sem autenticação).
 * Tentamos primeiro a rota mais completa (/api/public/catalog/sectors) e, em caso de 404
 * ou erro de rede, fazemos fallback para (/public/catalog/sectors) para compatibilidade.
 * @returns {Promise<Array<{id:string,name:string}>>}
 */
export async function getPublicCatalogSectors() {
    const tried = [];
    const endpoints = [
        `${API_BASE_URL}/api/public/catalog/sectors`,
        `${API_BASE_URL}/public/catalog/sectors`
    ];
    for (const url of endpoints) {
        try {
            const resp = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
            tried.push({ url, status: resp.status });
            if (!resp.ok) {
                if (resp.status === 404) continue; // tenta próximo fallback
                throw new Error('HTTP '+resp.status);
            }
            let data = await safeParseResponse(resp);
            if (!Array.isArray(data)) {
                // aceitar envelopes comuns: {items:[]}, {data:[]}
                if (data && Array.isArray(data.items)) data = data.items; else if (data && Array.isArray(data.data)) data = data.data; else data = [];
            }
            return data.filter(Boolean).map(s => ({
                id: (s.id || s.uuid || s.code || s.slug || '').toString(),
                name: s.name || s.title || s.label || 'Setor'
            })).filter(s => s.id);
        } catch (e) {
            // continua loop para fallback
        }
    }
    console.warn('[api] Falha ao carregar setores públicos', tried);
    return [];
}

/**
 * Exclui um setor global.
 * Endpoint: DELETE /admin/sectors/{sectorId}
 * Papel: SYSTEM_ADMIN
 */
export async function deleteAdminSector(token, sectorId) {
    if (!token) throw new Error('Token ausente');
    if (!sectorId) throw new Error('sectorId obrigatório');
    const response = await fetch(`${API_BASE_URL}/admin/sectors/${encodeURIComponent(sectorId)}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            const e = new Error('Acesso negado.');
            e.status = response.status;
            throw e;
        }
        let parsed = null;
        try { parsed = await safeParseResponse(response); } catch (e) { /* ignore */ }
        let backendMsg = 'Erro ao excluir setor.';
        if (parsed) {
            if (typeof parsed === 'string') {
                backendMsg = parsed.trim() || backendMsg;
            } else {
                backendMsg = (parsed.message || parsed.error || parsed.erro || backendMsg);
            }
        }
        const lower = backendMsg.toLowerCase();
        const phrase = 'não é possível excluir este setor';
        const err = new Error(backendMsg);
        err.status = response.status;
        if (response.status === 404) err.code = 'SECTOR_NOT_FOUND';
        if (response.status === 409) err.code = 'SECTOR_IN_USE';
        // Alguns backends podem retornar 500 com IllegalStateException contendo a frase
        if (!err.code && (response.status === 500 || response.status === 400) && lower.includes(phrase)) {
            err.code = 'SECTOR_IN_USE';
        }
        // Forçar código se a frase for detectada mesmo em outro status
        if (lower.includes(phrase)) err.code = 'SECTOR_IN_USE';
        throw err;
    }
    // Alguns backends retornam 204 sem body
    try { return await safeParseResponse(response); } catch { return null; }
}

/**
 * Adota / vincula um setor existente (global) à organização do usuário.
 * POST /organizations/{orgId}/sectors  body: { sectorId }
 */
export async function addOrganizationSector(token, orgId, sectorId) {
    if (!token) throw new Error('Token ausente');
    if (!orgId) throw new Error('OrgId ausente');
    if (!sectorId) {
        const e = new Error('Selecione um setor.');
        e.code = 'SECTOR_REQUIRED';
        throw e;
    }
    const response = await fetch(`${API_BASE_URL}/organizations/${encodeURIComponent(orgId)}/sectors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sectorId })
    });
    if (!response.ok) {
        let parsed = null;
        try { parsed = await safeParseResponse(response); } catch (_) {}
        const msg = (parsed && (parsed.message || parsed.error || parsed.erro)) || 'Erro ao adicionar setor.';
        const err = new Error(msg);
        err.status = response.status;
        throw err;
    }
    return safeParseResponse(response);
}

/**
 * Lista setores públicos (catálogo) usando apenas UMA chamada direta.
 * Endpoint único: GET /public/catalog/sectors
 * Retorna array normalizado: [{id,name}]
 */
export async function getPublicSectors() {
    const url = `${API_BASE_URL}/public/catalog/sectors`;
    try {
        const resp = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
        if (!resp.ok) throw new Error('HTTP '+resp.status);
        let data = await safeParseResponse(resp);
        if (!Array.isArray(data)) {
            if (data && Array.isArray(data.items)) data = data.items;
            else if (data && Array.isArray(data.data)) data = data.data;
            else data = [];
        }
        return data.filter(Boolean).map(s => ({
            id: (s.id || s.uuid || s.code || s.slug || '').toString(),
            name: s.name || s.title || s.label || 'Setor'
        })).filter(s => s.id);
    } catch (e) {
        console.warn('[api] Falha ao carregar catálogo público único', e);
        return [];
    }
}