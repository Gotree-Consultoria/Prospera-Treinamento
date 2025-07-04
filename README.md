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


### 📅 03/07/2025
- 🎠 Adicionado carrossel dinâmico na página de FAQ com suporte à navegação entre seções (FAQ, Privacidade, Termos e Suporte).
- 🔗 Implementada navegação via parâmetro de URL (?card=suporte, por exemplo), permitindo abrir diretamente uma seção específica.
- 🧠 Integração complexa com sistema de páginas parciais: foi necessário garantir que o carrossel só fosse inicializado após o carregamento assíncrono (fetch()) da faqPage.html, respeitando o tempo de montagem do DOM.
- 📌 Corrigido um bug crítico onde a página FAQ abria rapidamente e voltava para a Home automaticamente. O problema estava ligado à função initializeApp() que forçava showPage('home') antes da conclusão do carregamento da página FAQ.
- 🔁 URLs agora são atualizadas dinamicamente conforme o usuário navega no carrossel usando os botões "Próximo" e "Anterior", sem recarregar a página, utilizando history.pushState.
- 🧪 Testes manuais extensivos foram necessários para ajustar o timing de carregamento, ativação de classes .active, compatibilidade com a navegação e persistência de estado.
- ⚠️ Este foi um dos pontos mais desafiadores da estrutura SPA: lidar com navegação baseada em URL em páginas que são carregadas dinamicamente de forma assíncrona, sem quebrar o fluxo do usuário ou gerar comportamento inesperado.
- 📄 Código revisado e modularizado para facilitar a manutenção futura da lógica do carrossel.
- ✍️ Organizado e comentado o código, adicionando explicações nas funções de navegação do carrossel, controle de histórico de URL, busca de produtos, animações e tratamento de erros. Melhorada a organização geral para facilitar a compreensão do fluxo do código e futuras manutenções.
- 📊 Atualizada a contagem de e-books nas categorias: a função de dados estáticos foi modificada para calcular dinamicamente o número de produtos por categoria, garantindo que a contagem de e-books seja correta ao exibir as categorias.



### 📅 04/07/2025
- 🗂️ Adicionada a pasta api para organização do back-end com Spring.
- ⚠️ Implementado popup obrigatório que impede finalização de compra sem perfil atualizado, com redirecionamento automático para a aba de conta.

  
### 🧑‍💻 Dependências da API (Spring Boot):
- Spring Boot Starter Web – Para criar a aplicação web e expor as APIs RESTful.
- Spring Boot Starter Data JPA – Para integração com o banco de dados e operações CRUD.
- Spring Boot Starter Security – Para implementar autenticação e autorização no sistema.
- Spring Boot Starter Validation – Para validar os dados da API, como a validação de parâmetros de entrada.
- Spring Boot Starter Actuator – Para monitoramento e métricas da aplicação.
- Spring Boot Starter Mail – Para envio de notificações por e-mail.
- Spring Boot Starter Test – Para realizar testes unitários e de integração da API.
- Spring Boot Starter Logging (Logback) – Para gerenciar os logs da aplicação.
- Spring Boot Starter OAuth2 Client – Caso precise de autenticação via OAuth2 em serviços externos.
- Spring Boot DevTools – Para facilitar o desenvolvimento com recarga automática e outras ferramentas.



## 🌐 Acesso ao Projeto Online

Você pode visualizar o projeto em tempo real através do link abaixo.  
Todas as atualizações feitas no repositório são refletidas automaticamente no deploy:

🔗 [prospera-treinamento.vercel.app](https://prospera-treinamento.vercel.app/)








------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------











## ⚙️ Coisas a Corrigir ou Melhorar (FrontEnd)

### 1. 🔙 **Correção de Bugs no Botão de Voltar/Avançar do Navegador**
   - **Descrição**: O comportamento de navegação nos botões "voltar" e "avançar" do navegador não está funcionando corretamente, especialmente ao navegar pelas seções carregadas dinamicamente. A página recarrega em vez de voltar corretamente.
   - **Tarefa**: Revisar a manipulação do histórico de navegação e garantir que as mudanças de estado (por exemplo, ao alternar entre seções ou cards) sejam bem integradas com os botões de navegação do navegador.
   - **Status**: **Em andamento / Aguardando testes adicionais**.

### 2. 🚀 **Otimização da Performance no Carrossel**
   - **Descrição**: O carrossel está sendo carregado de forma assíncrona, mas ainda há espaço para melhorar a performance, especialmente quando há muitos produtos ou cards.
   - **Tarefa**: Refatorar o código para garantir que a navegação entre as seções do carrossel seja mais fluida, possivelmente carregando os itens de forma "lazy load" ou otimizando o número de renders.
   - **Status**: Planejado.

### 3. 📱 **Ajustes na Responsividade do Carrossel**
   - **Descrição**: Embora o carrossel seja responsivo, há alguns pontos onde ele não se adapta tão bem em dispositivos menores.
   - **Tarefa**: Melhorar o layout para telas pequenas (mobile) e garantir que a navegação, botões e cards se ajustem corretamente.
   - **Status**: Em andamento.

### 4. 🔗 **Correção na Navegação com Parâmetros de URL**
   - **Descrição**: A navegação baseada nos parâmetros de URL (`?card=`) funciona na maioria dos casos, mas há alguns comportamentos inesperados quando o parâmetro é alterado manualmente ou quando a página é atualizada com o parâmetro presente.
   - **Tarefa**: Ajustar o código para garantir que a navegação via URL seja completamente estável, evitando recarregamentos ou falhas no carregamento da seção correta.
   - **Status**: Em andamento.

### 5. 🛒 **Melhorias no Sistema de Carrinho de Compras**
   - **Descrição**: O carrinho de compras está funcional, mas existem algumas melhorias que podem ser feitas, como a adição de animações mais suaves, melhor visibilidade de itens no carrinho e integração com a API de checkout.
   - **Tarefa**: Trabalhar na UI do carrinho, adicionando animações e uma experiência mais fluida para o usuário, além de integrar o processo de checkout.
   - **Status**: Planejado.

### 6. 📝 **Refatoração de Funções de Navegação**
   - **Descrição**: O sistema de navegação está funcionando, mas ainda precisa de ajustes finos para garantir que os estados de navegação, como o carregamento das seções, sejam mais robustos.
   - **Tarefa**: Refatorar as funções de navegação para reduzir a complexidade e garantir uma navegação mais intuitiva e confiável.
   - **Status**: Em andamento.


