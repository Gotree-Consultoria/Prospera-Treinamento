// Módulo de treinamentos - dados mock e render
const trainingsBySector = {
    'alimentacao': [
        { id: 'a1', title: 'Boas Práticas na Produção de Alimentos', description: 'Procedimentos de manipulação segura', duration: '4h', format: 'Digital', typeCode: 'N01', obligatoriness: 'Compulsório', price: 0 },
        { id: 'a2', title: 'Controle de Contaminação Cruzada', description: 'Fluxos e higienização', duration: '3h', format: 'Ao vivo', typeCode: 'N02', obligatoriness: 'Eletivo', price: 0 }
    ],
    'construcao-civil': [
        { id: 'c1', title: 'Segurança em Obras - NR-18 Básico', description: 'Requisitos de segurança em canteiros', duration: '8h', format: 'Ao vivo', typeCode: 'NR18', obligatoriness: 'Compulsório', price: 0 },
        { id: 'c2', title: 'Uso de EPI e Proteção Coletiva', description: 'EPI adequado e medidas coletivas', duration: '2h', format: 'Digital', typeCode: 'N03', obligatoriness: 'Eletivo', price: 0 }
    ],
    'educacao': [
        { id: 'e1', title: 'Primeiros Socorros em Ambientes Educacionais', description: 'Atendimento inicial a alunos', duration: '6h', format: 'Ao vivo', typeCode: 'N04', obligatoriness: 'Compulsório', price: 0 },
        { id: 'e2', title: 'Metodologias Ativas de Ensino', description: 'Estratégias pedagógicas', duration: '5h', format: 'Digital', typeCode: 'N05', obligatoriness: 'Eletivo', price: 0 }
    ],
    'industria': [
        { id: 'i1', title: 'Segurança em Máquinas e Equipamentos', description: 'Proteções e bloqueios', duration: '8h', format: 'Ao vivo', typeCode: 'NR12', obligatoriness: 'Compulsório', price: 0 },
        { id: 'i2', title: 'Lean Manufacturing', description: 'Melhoria contínua', duration: '6h', format: 'Digital', typeCode: 'N06', obligatoriness: 'Eletivo', price: 0 }
    ],
    'saude': [
        { id: 's1', title: 'Biossegurança para Serviços de Saúde', description: 'Procedimentos de proteção', duration: '4h', format: 'Digital', typeCode: 'N07', obligatoriness: 'Compulsório', price: 0 },
        { id: 's2', title: 'Atendimento ao Paciente', description: 'Comunicação e acolhimento', duration: '3h', format: 'Ao vivo', typeCode: 'N08', obligatoriness: 'Eletivo', price: 0 }
    ],
    'transporte-logistica': [
        { id: 't1', title: 'Direção Defensiva e Segurança', description: 'Boas práticas na direção', duration: '6h', format: 'Ao vivo', typeCode: 'N09', obligatoriness: 'Compulsório', price: 0 },
        { id: 't2', title: 'Otimização de Rotas', description: 'Técnicas para logística eficiente', duration: '4h', format: 'Digital', typeCode: 'N10', obligatoriness: 'Eletivo', price: 0 }
    ],
    'varejo-atacado': [
        { id: 'v1', title: 'Atendimento e Segurança no Varejo', description: 'Procedimentos e prevenção', duration: '3h', format: 'Digital', typeCode: 'N11', obligatoriness: 'Compulsório', price: 0 },
        { id: 'v2', title: 'Visual Merchandising', description: 'Exposição e vendas', duration: '4h', format: 'Ao vivo', typeCode: 'N12', obligatoriness: 'Eletivo', price: 0 }
    ]
};

export function getTrainingsForSector(sector) {
    return trainingsBySector[sector] || [];
}

export function getTrainingById(id) {
    for (const sector in trainingsBySector) {
        const t = trainingsBySector[sector].find(x => x.id === id);
        if (t) return t;
    }
    return null;
}

// Render básico com refinamentos locais
export function renderTrainingsForSector(sector) {
    const container = document.getElementById('trainingsList');
    if (!container) return;

    const data = getTrainingsForSector(sector);
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'trainings-header';
    const title = document.createElement('h3');
    title.textContent = 'Treinamentos — ' + sector.replace(/-/g, ' ');
    header.appendChild(title);

    // Refinements
    const refinements = document.createElement('div');
    refinements.className = 'trainings-refinements';

    // TypeCode select (prioritized list + codes present in data)
    const prioritizedCodes = ['NR01', 'NR12', 'NR18', 'NR35', 'NR36', 'NR17', 'NR06', 'NR07', 'N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07', 'N08', 'N09', 'N10', 'N11', 'N12'];
    const dataCodes = [...new Set(data.map(d => d.typeCode).filter(Boolean))];
    const combinedCodes = Array.from(new Set([...prioritizedCodes, ...dataCodes]));
    const typeSelect = document.createElement('select');
    typeSelect.id = 'refineTypeCode';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'Tipo de Treinamento';
    typeSelect.appendChild(optAll);
    combinedCodes.forEach(code => { const o = document.createElement('option'); o.value = code; o.textContent = code; typeSelect.appendChild(o); });

    // Obrigatoriness select
    const obligSelect = document.createElement('select');
    obligSelect.id = 'refineOblig';
    ['', 'Compulsório', 'Eletivo'].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v === '' ? 'Todos' : v; obligSelect.appendChild(o); });

    // Context select (novo) - opções de contexto relacionadas ao tipo de treinamento
    const contextSelect = document.createElement('select');
    contextSelect.id = 'refineContext';
    const optCtxAll = document.createElement('option'); optCtxAll.value = ''; optCtxAll.textContent = 'Todos os contextos'; contextSelect.appendChild(optCtxAll);
    ['Normas Regulamentadoras', 'Segurança Operacional', 'Gestão', 'Saúde e Biossegurança', 'Competências Técnicas'].forEach(ctx => {
        const o = document.createElement('option'); o.value = ctx; o.textContent = ctx; contextSelect.appendChild(o);
    });

    // Modality select
    const modSet = [...new Set(data.map(d => d.format))];
    const modSelect = document.createElement('select');
    modSelect.id = 'refineModality';
    const modAll = document.createElement('option'); modAll.value = ''; modAll.textContent = 'Todas as modalidades'; modSelect.appendChild(modAll);
    modSet.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; modSelect.appendChild(o); });

    refinements.appendChild(typeSelect);
    refinements.appendChild(contextSelect);
    refinements.appendChild(obligSelect);
    refinements.appendChild(modSelect);

    header.appendChild(refinements);

    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'trainings-list-items';
    container.appendChild(list);

    function matchesContext(item, context) {
        if (!context) return true;
        const txt = (item.title + ' ' + item.description + ' ' + (item.typeCode || '')).toLowerCase();
        if (context === 'Normas Regulamentadoras') {
            return (item.typeCode || '').toUpperCase().startsWith('NR') || /nr\d+/i.test(item.typeCode || '');
        }
        if (context === 'Competências Técnicas') {
            // códigos que começam com N (exceto NR)
            return /^N\d+/i.test(item.typeCode || '') && !/^NR/i.test(item.typeCode || '') || /lean|competência|metodologia|técnica/i.test(txt);
        }
        if (context === 'Segurança Operacional') {
            return /seguranç|e p i|ecan|obra|direção|máquin/i.test(txt) || /nr12|nr18|nr35/i.test((item.typeCode || '').toLowerCase());
        }
        if (context === 'Gestão') {
            return /gest|lean|metodolog/i.test(txt);
        }
        if (context === 'Saúde e Biossegurança') {
            return /saúd|biossegur|pacient|biós/i.test(txt) || /nr07/i.test((item.typeCode || '').toLowerCase());
        }
        return true;
    }

    function applyFilters() {
        const type = document.getElementById('refineTypeCode').value;
        const context = document.getElementById('refineContext').value;
        const oblig = document.getElementById('refineOblig').value;
        const mod = document.getElementById('refineModality').value;
        let filtered = data.slice();
        if (type) filtered = filtered.filter(x => x.typeCode === type);
        if (context) filtered = filtered.filter(x => matchesContext(x, context));
        if (oblig) filtered = filtered.filter(x => x.obligatoriness === oblig);
        if (mod) filtered = filtered.filter(x => x.format === mod);
        renderList(filtered);
    }

    function renderList(items) {
        list.innerHTML = '';
        if (items.length === 0) {
            list.innerHTML = '<p>Nenhum treinamento encontrado para os filtros selecionados.</p>';
            return;
        }
        items.forEach(t => {
            const card = document.createElement('div');
            card.className = 'training-card';
            card.innerHTML = `
                <h4>${t.title}</h4>
                <p class="training-desc">${t.description}</p>
                <p class="training-meta">Duração: ${t.duration} • Modalidade: ${t.format} • ${t.obligatoriness}</p>
                <div class="training-actions">
                    <button class="btn btn-secondary add-to-cart-btn" data-id="${t.id}" data-type="training">Adicionar ao carrinho</button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    typeSelect.addEventListener('change', applyFilters);
    obligSelect.addEventListener('change', applyFilters);
    modSelect.addEventListener('change', applyFilters);

    // inicial render
    applyFilters();
}
