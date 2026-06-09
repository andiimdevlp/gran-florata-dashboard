# Configuração de cobranças

O arquivo `configuracao-cobrancas.json` controla como o dashboard agrupa e classifica as despesas.

## Como funciona

- `categorias`: define as categorias exibidas e quais grupos entram em cada uma.
- `grupos`: define cada cobrança pesquisável e os termos usados para reconhecer lançamentos no balancete.
- `categoriaPadrao`: categoria usada quando um item não encaixa em uma regra configurada.

## Categorias

Exemplo:

```json
{
  "nome": "CONCESSIONÁRIAS",
  "aliases": ["CONCESSIONARIAS"],
  "grupos": ["agua", "energia"],
  "somenteGruposConfigurados": true
}
```

- `nome`: nome exibido no dashboard.
- `aliases`: nomes alternativos que podem vir no balancete e devem cair nessa categoria.
- `grupos`: IDs dos grupos que pertencem à categoria.
- `somenteGruposConfigurados`: quando `true`, a categoria só aceita os grupos listados. Outros itens encontrados nela vão para `categoriaPadrao`.

No padrão atual, `CONCESSIONÁRIAS` aceita somente `agua` e `energia`.

## Grupos

Exemplo:

```json
{
  "id": "agua",
  "nome": "Água",
  "termos": ["saneago", "água coletiva"],
  "termosBusca": ["água", "saneago", "água coletiva"]
}
```

- `id`: identificador estável do grupo, sem espaços.
- `nome`: nome exibido na tela de cobranças.
- `termos`: textos usados para reconhecer o lançamento no balancete.
- `termosBusca`: textos extras usados só para busca.

Use `termosBusca` quando quiser pesquisar por um nome genérico sem classificar qualquer item genérico automaticamente. Por exemplo: buscar por `água` encontra o grupo Água, mas o lançamento só entra nele quando tiver `saneago` ou `água coletiva`.

## Como adicionar um grupo

Para colocar gás em `CONCESSIONÁRIAS`, adicione o ID na categoria:

```json
"grupos": ["agua", "energia", "gas"]
```

Depois adicione o grupo:

```json
{
  "id": "gas",
  "nome": "Gás",
  "termos": ["gás", "gas coletiva", "gás coletiva"],
  "termosBusca": ["gás", "gas"]
}
```
