<<<<<<< HEAD
# gran-florata-dashboard
Dashboard financeiro para condomínio residencial
=======
# 🏢 Gran Florata - Dashboard Financeiro

Dashboard financeiro interativo para acompanhamento e gestão das finanças de condomínios residenciais.

## 🎯 Características

- **Parser Inteligente**: Importa automaticamente demonstrativos financeiros em formato `.txt`
- **Persistência Automática**: Dados salvos no navegador - não precisa reimportar
- **Visualizações Interativas**: Múltiplos gráficos para análise de tendências e distribuições
- **Comparação Mensal**: Compare despesas entre diferentes períodos
- **Design Profissional**: Interface dark refinada com tipografia elegante
- **100% Frontend**: Sem dependências de backend, funciona localmente no navegador

## 🚀 Como Usar

### 1. Abrir a Aplicação
Simplesmente abra o arquivo `index.html` em seu navegador web moderno (Chrome, Firefox, Edge, Safari).

### 2. Primeira Utilização
Na primeira vez, a aplicação estará vazia. Você precisa importar seus arquivos .txt com os demonstrativos financeiros.

### 3. Importar Seus Dados
1. Clique no botão **"Importar Dados"** no rodapé da sidebar
2. Selecione um ou múltiplos arquivos `.txt` com seus demonstrativos
3. Os dados serão processados automaticamente e **salvos no navegador**
4. Os gráficos serão atualizados instantaneamente

### 4. Persistência de Dados
**✨ Os dados são salvos automaticamente no seu navegador!**
- Você pode fechar e reabrir a página que seus dados permanecerão
- Os dados ficam armazenados no localStorage do navegador
- Para remover todos os dados, use o botão **"Limpar Tudo"**

### 4. Navegação

#### 📊 Dashboard
- Cards resumo com totais, taxas e tendências
- Gráfico de evolução mensal
- Distribuição por categoria (pizza)
- Top 10 maiores despesas

#### 📈 Evolução
- Gráfico de barras empilhadas mostrando evolução de todas as categorias mês a mês

#### 🏷️ Categorias
- Cards individuais para cada categoria
- Clique em uma categoria para ver detalhes e histórico

#### 🔄 Comparação
- Compare dois meses lado a lado
- Visualize diferenças absolutas e percentuais

## 📄 Formato do Arquivo .txt

Os arquivos de demonstrativo devem seguir esta estrutura:

```
Arrecadação 2026 - Março
Previsão de Despesas - MARÇO/2026
R$ 0,00
ENCARGOS SOCIAIS
DARF - Condomínio
R$ 5.374,69
ISSQN (Valor retido s/ Prestadores de Serviço)
R$ 1.174,00
Total
R$ 6.548,69
CONCESSIONÁRIAS
EQUATORIAL
R$ 3.987,77
...
TOTAL
R$ 82.345,50
TOTAL DAS DESPESAS ORDINÁRIAS / 160 Aptos
R$ 514,66
FUNDO DE RESERVA DESPESAS ORDINÁRIAS (5%) / 160 Aptos
R$ 25,73
VALOR DA TAXA DE CONDOMINIO COMUM
R$ 540,39
```

### Regras de Formatação:
- Primeira linha contém o mês e ano
- Categorias são escritas em **MAIÚSCULAS**
- Cada item é seguido por seu valor na linha seguinte (formato `R$ X.XXX,XX`)
- Linha "Total" indica subtotal da categoria
- Linha "TOTAL" (isolada) indica total geral
- Últimas linhas contêm taxa por apartamento e fundo de reserva

## 🎨 Categorias Reconhecidas

O parser reconhece automaticamente as seguintes categorias padrão:
- **ENCARGOS SOCIAIS**
- **CONCESSIONÁRIAS**
- **ADMINISTRAÇÃO**
- **MANUTENÇÃO E CONSERVAÇÃO**
- **DESPESAS BANCARIAS**
- **OUTROS VALORES INDIVIDUAIS**

Categorias não reconhecidas são agrupadas em **OUTROS**.

## ✨ Funcionalidades Especiais

### Gerenciamento de Meses
- Visualize badges de todos os meses carregados no cabeçalho
- Remova meses individuais clicando no `×` no badge

### Indicadores de Tendência
- **Verde (↓)**: Redução favorável em relação ao mês anterior
- **Vermelho (↑)**: Aumento em relação ao mês anterior
- **Cinza (→)**: Sem variação

### Detalhamento de Categorias
- Clique em qualquer card de categoria para ver:
  - Lista completa de itens e valores
  - Gráfico de histórico da categoria ao longo dos meses

### Gráficos Interativos
- Passe o mouse sobre os gráficos para ver valores detalhados
- Animações suaves ao carregar dados
- Cores distintas para cada categoria

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Design moderno com glassmorphism e animações
- **JavaScript (ES6+)**: Lógica de negócios e manipulação de dados
- **Chart.js 4.4.0**: Biblioteca de gráficos
- **Google Fonts**: DM Serif Display, IBM Plex Mono, Inter

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- 💻 Desktop (melhor experiência)
- 📱 Tablet
- 📱 Mobile (limitações em gráficos complexos)

## 🔧 Personalização

### Alterar Cores
Edite as variáveis CSS em `styles.css`:
```css
:root {
    --accent-emerald: #10b981;
    --accent-amber: #f59e0b;
    --accent-red: #ef4444;
}
```

### Adicionar Novas Categorias
Edite o array `knownCategories` em `app.js` e adicione a cor correspondente em `categoryColors`.

## 📝 Arquivo de Teste Incluído

Um arquivo de exemplo está incluído: `exemplo-abril-2026.txt`

Para testá-lo:
1. Clique em "Importar Dados"
2. Selecione o arquivo `exemplo-abril-2026.txt`
3. Veja o mês de Abril aparecer nos gráficos!

## 🔍 Debug e Solução de Problemas

A aplicação agora possui ferramentas de debug integradas!

### Console do Navegador
Pressione `F12` para abrir o console e ver logs detalhados de:
- Arquivos importados
- Meses carregados e sua ordem cronológica
- Qual mês está sendo exibido (sempre o mais recente)
- Top 10 despesas calculadas

### Função de Debug
No console, digite:
```javascript
debugState()  // Ver estado completo
forceReorder()  // Forçar reordenação se necessário
```

### Guias Completos
- 📖 [ORDENACAO.md](ORDENACAO.md) - Como funciona a ordenação dos cards (LEIA PRIMEIRO!)
- 🔍 [DEBUG.md](DEBUG.md) - Guia completo de solução de problemas

## ⚠️ Observações

- **Armazenamento Local**: Os dados ficam salvos no localStorage do seu navegador
- **Por Navegador**: Cada navegador tem seu próprio armazenamento (dados no Chrome não aparecem no Firefox)
- **Backup Manual**: Recomenda-se manter os arquivos .txt originais como backup
- **Limite de Armazenamento**: Navegadores têm limite de ~5-10MB no localStorage (suficiente para anos de dados)
- **Limpar Cache**: Limpar o cache do navegador pode apagar os dados salvos

## 🎓 Suporte

Para dúvidas sobre o formato do arquivo ou uso da aplicação, consulte os exemplos incluídos ou entre em contato com o desenvolvedor.

---

**Desenvolvido com ❤️ para Gran Florata**
>>>>>>> ec88101 (Initial commit: Dashboard financeiro Gran Florata)
