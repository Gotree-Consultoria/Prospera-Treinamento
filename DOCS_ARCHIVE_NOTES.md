Resumo das alterações e instruções de arquivamento

Data: 2025-10-02
Branch: chore/archive-docs

O que foi feito

- A pasta `docs/` (contendo arquivos markdown do projeto) passou a ser ignorada pelo Git (adicionada em `.gitignore`).
- Foi criado este arquivo `DOCS_ARCHIVE_NOTES.md` na raiz para documentar a mudança (este arquivo permanece versionado para indicar o que foi feito).

Arquivos originalmente presentes em `docs/` antes da alteração

- REMOVED_FEATURES.md
- migracao-angular.md
- componentizacao.md

Motivação

- Evitar que versões locais das documentações/arquivos MD sejam acidentalmente comitadas durante o desenvolvimento.

Como restaurar / acessar os arquivos

- Os arquivos permanecerão no disco, mas deixarão de ser monitorados pelo Git.
- Se desejar reapontar/trackear um arquivo específico novamente, rode:

  git add -f docs/<arquivo.md>
  git commit -m "chore: force add docs/<arquivo.md> back to repo"

Como reverter esta alteração (opção segura)

1) Criar uma branch de rollback:
   git checkout -b chore/undo-ignore-docs
2) Remover a entrada `docs/` do `.gitignore` (editar manualmente ou reverter o commit)
3) Commit e push

Notas finais

- Caso você queira que eu mova (git mv) os MDs para outra pasta de arquivo (`archive/docs/`) preservando histórico no Git, eu posso fazer isso também. Neste caso, eu criarei a pasta `archive/docs/`, farei `git mv docs/*.md archive/docs/`, commito as mudanças e atualizo este arquivo com o novo caminho.

- Informe se quer que eu execute a sequência completa (criar branch, commitar, desindexar a pasta `docs/`, push) — eu já estou preparado para rodar os comandos git e criar o PR se desejar.
