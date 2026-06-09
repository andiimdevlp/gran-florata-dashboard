# Automação Condobem

Esta automação importa o balancete da Condobem para o dashboard estático do GitHub Pages.

## Como usar mensalmente

1. Atualize o arquivo `url.txt` com o link da fatura Condobem do mês.
2. Faça commit e push dessa alteração.
3. O GitHub Actions executa o workflow `Importar Condobem`.
4. O workflow acessa a fatura com o CPF salvo em Secret, gera o arquivo em `sample-data/` e atualiza `sample-data/manifest.json`.
5. O dashboard publicado passa a carregar o novo mês automaticamente.

## Configuração obrigatória no GitHub

Crie um secret no repositório:

```text
Settings > Secrets and variables > Actions > New repository secret
Name: CONDOBEM_CPF
Value: CPF usado para acessar a fatura
```

O CPF não deve ser salvo no código nem no `url.txt`.

## Execução

O workflow roda em três situações:

- manualmente, por `workflow_dispatch`;
- quando `url.txt` for alterado;
- todo dia 13 de cada mês, às 11:00 UTC.

Se o link da fatura ainda não tiver sido atualizado no `url.txt`, a execução mensal apenas tentará importar o link atual.
