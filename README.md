## 📝 Changelog

### 📅 30/06/2025
- ✅ Corrigida a formatação monetária da API: alterado de Euro (€) para Real (R$).  
- ❌ Removida a aplicação da taxa IVA, por não se aplicar à legislação brasileira.

### 📅 01/07/2025
- 🔧 Iniciada a modularização da página HTML unificada.  
- 📁 Separadas as lógicas em arquivos distintos, utilizando JavaScript com lógica de container, para facilitar manutenção e escalabilidade.  
- ⏳ Progresso: **80% concluído**.

### 📅 02/07/2025
- 🚀 Deploy inicial realizado na Vercel, permitindo que o projeto possa ser visualizado online e facilitando o acompanhamento pela equipe.
- 🌐 Primeira versão pública do site em ambiente de produção: prospera-treinamento.vercel.app
- 🛠️ Renomeado o arquivo principal para index.html para garantir o reconhecimento automático pela Vercel.
- 📁 Separação da seção de FAQ em um container independente, melhorando a organização do código e seguindo o padrão do projeto.
- 🎨 Estilização completa da página de FAQ, com foco em experiência do usuário e identidade visual mais agradável e moderna.
- 🛒 Ajustes e início da melhoria no contador de itens do carrinho, incluindo planejamento para tratar popups, alinhamento e responsividade.
- 🛒 Correção na exibição do contador de itens do carrinho: movida a variável cartCount para dentro da função updateCartDisplay(), garantindo que o elemento exista no DOM antes de ser acessado.
- 🌐 Adicionado botão "Site Oficial" na navegação com redirecionamento para o site institucional da Gootree, substituindo o antigo botão "Blog".
- 🔄 Refatorada a navegação para usar data-page ao invés de onclick, promovendo uma separação mais clara entre HTML e JavaScript, e melhorando a escalabilidade do projeto.
- 🧼 Melhorias no código e estruturação HTML, com correções em classes, organização de seções e comentários.


📅 03/07/2025
- 🎠 Adicionado carrossel dinâmico na página de FAQ com suporte à navegação entre seções (FAQ, Privacidade, Termos e Suporte).
- 🔗 Implementada navegação via parâmetro de URL (?card=suporte, por exemplo), permitindo abrir diretamente uma seção específica.
- 🧠 Integração complexa com sistema de páginas parciais: foi necessário garantir que o carrossel só fosse inicializado após o carregamento assíncrono (fetch()) da faqPage.html, respeitando o tempo de montagem do DOM.
- 📌 Corrigido um bug crítico onde a página FAQ abria rapidamente e voltava para a Home automaticamente. O problema estava ligado à função initializeApp() que forçava showPage('home') antes da conclusão do carregamento da página FAQ.
- 🔁 URLs agora são atualizadas dinamicamente conforme o usuário navega no carrossel usando os botões "Próximo" e "Anterior", sem recarregar a página, utilizando history.pushState.
- 🧪 Testes manuais extensivos foram necessários para ajustar o timing de carregamento, ativação de classes .active, compatibilidade com a navegação e persistência de estado.
- ⚠️ Este foi um dos pontos mais desafiadores da estrutura SPA: lidar com navegação baseada em URL em páginas que são carregadas dinamicamente de forma assíncrona, sem quebrar o fluxo do usuário ou gerar comportamento inesperado.
- 📄 Código revisado e modularizado para facilitar a manutenção futura da lógica do carrossel.


## 🌐 Acesso ao Projeto Online

Você pode visualizar o projeto em tempo real através do link abaixo.  
Todas as atualizações feitas no repositório são refletidas automaticamente no deploy:

🔗 [prospera-treinamento.vercel.app](https://prospera-treinamento.vercel.app/)

