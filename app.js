const AppState = {
    months: [],
    currentMonth: null,
    selectedMonthFilter: null,
    periodStartKey: null,
    periodEndKey: null,
    chargeSearch: '',
    chargeCategoryFilter: '',
    charts: {},

    addMonth(monthData) {
        monthData = normalizeMonthData(monthData);

        const existing = this.months.findIndex(m => m.key === monthData.key);
        if (existing !== -1) {
            console.log(`ℹ️ Atualizando mês existente: ${monthData.month}/${monthData.year}`);
            this.months[existing] = monthData;
        } else {
            console.log(`➕ Adicionando novo mês: ${monthData.month}/${monthData.year}`);
            this.months.push(monthData);
        }

        this.months.sort((a, b) => new Date(a.date) - new Date(b.date));

        const latest = this.getLatestMonth();
        const previous = this.getPreviousMonth();

        console.log(`📅 Ordem cronológica (${this.months.length} meses):`, this.months.map(m => `${m.month}/${m.year}`).join(' → '));
        console.log(`🎯 Mês MAIS RECENTE (será exibido nos cards): ${latest.month}/${latest.year}`);
        if (previous) {
            console.log(`📊 Mês ANTERIOR (para comparação): ${previous.month}/${previous.year}`);
        }

        this.save();
    },

    removeMonth(key) {
        this.months = this.months.filter(m => m.key !== key);
        this.save();
    },

    getMonth(key) {
        return this.months.find(m => m.key === key);
    },

    getLatestMonth() {

        if (this.months.length === 0) return null;
        return this.months[this.months.length - 1];
    },

    getPreviousMonth() {

        if (this.months.length < 2) return null;
        return this.months[this.months.length - 2];
    },

    getAllMonthsOrdered() {

        return [...this.months].sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    getFilteredMonths() {
        const orderedMonths = this.getAllMonthsOrdered();
        if (orderedMonths.length === 0) return [];

        const startMonth = this.periodStartKey ? this.getMonth(this.periodStartKey) : null;
        const endMonth = this.periodEndKey ? this.getMonth(this.periodEndKey) : null;
        const startDate = startMonth ? new Date(startMonth.date) : new Date(orderedMonths[0].date);
        const endDate = endMonth ? new Date(endMonth.date) : new Date(orderedMonths[orderedMonths.length - 1].date);
        const rangeStart = startDate <= endDate ? startDate : endDate;
        const rangeEnd = startDate <= endDate ? endDate : startDate;

        return orderedMonths.filter(month => {
            const monthDate = new Date(month.date);
            return monthDate >= rangeStart && monthDate <= rangeEnd;
        });
    },

    getDisplayMonth() {
        if (this.selectedMonthFilter) {
            return this.getMonth(this.selectedMonthFilter);
        }

        const filteredMonths = this.getFilteredMonths();
        return filteredMonths.length > 0 ? filteredMonths[filteredMonths.length - 1] : this.getLatestMonth();
    },

    getDisplayPreviousMonth() {
        const displayMonth = this.getDisplayMonth();
        if (!displayMonth) return null;
        
        const filteredMonths = this.getFilteredMonths();
        const displayIndex = filteredMonths.findIndex(m => m.key === displayMonth.key);
        if (displayIndex > 0) {
            return filteredMonths[displayIndex - 1];
        }
        return null;
    },

    save() {
        try {
            localStorage.setItem('granFlorata_months', JSON.stringify(this.months));
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
        }
    },

    load() {
        try {
            const saved = localStorage.getItem('granFlorata_months');
            if (saved) {
                this.months = JSON.parse(saved).map(month => normalizeMonthData(month));

                this.months.forEach(month => {
                    if (typeof month.date === 'string') {
                        month.date = new Date(month.date);
                    }
                });

                this.months.sort((a, b) => new Date(a.date) - new Date(b.date));
                console.log(`✓ ${this.months.length} mês(es) carregado(s):`, this.months.map(m => `${m.month}/${m.year}`).join(', '));
                return true;
            }
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
        return false;
    },

    clear() {
        this.months = [];
        this.selectedMonthFilter = null;
        this.periodStartKey = null;
        this.periodEndKey = null;
        this.chargeSearch = '';
        this.chargeCategoryFilter = '';
        localStorage.removeItem('granFlorata_months');
    }
};

const standardCategoryNames = [
    'ENCARGOS SOCIAIS',
    'CONCESSIONÁRIAS',
    'ADMINISTRAÇÃO',
    'MANUTENÇÃO E CONSERVAÇÃO',
    'DESPESAS BANCARIAS',
    'OUTROS VALORES INDIVIDUAIS',
    'OUTROS'
];

function createCategoryBuckets() {
    return Object.fromEntries(standardCategoryNames.map(category => [category, []]));
}

function recalculateCategoryTotals(categories) {
    const categoryTotals = {};
    for (const [category, items] of Object.entries(categories)) {
        if (Array.isArray(items) && items.length > 0) {
            categoryTotals[category] = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
        }
    }
    return categoryTotals;
}

function normalizeMonthData(monthData) {
    if (!monthData || !monthData.categories) return monthData;

    const normalizedCategories = createCategoryBuckets();

    Object.entries(monthData.categories).forEach(([category, items]) => {
        if (!Array.isArray(items)) return;

        items.forEach(item => {
            const group = getChargeGroupInfo(item.name);
            const targetCategory = ['agua-saneago', 'energia-equatorial', 'gas-coletivo'].includes(group.key)
                ? 'CONCESSIONÁRIAS'
                : (standardCategoryNames.includes(category) ? category : 'OUTROS');

            normalizedCategories[targetCategory].push({
                name: item.name,
                value: Number(item.value) || 0
            });
        });
    });

    return {
        ...monthData,
        categories: normalizedCategories,
        categoryTotals: recalculateCategoryTotals(normalizedCategories)
    };
}

function parseFinancialReport(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    const titleLine = lines[0];
    const monthMatch = titleLine.match(/(\w+)\/(\d{4})/);
    let month, year;

    if (monthMatch) {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        month = monthNames[parseInt(monthMatch[1]) - 1];
        year = monthMatch[2];
    } else {
        const monthMatch2 = titleLine.match(/(?:Arrecadação\s+)?(\d{4})\s*-\s*(\w+)/i);
        if (monthMatch2) {
            year = monthMatch2[1];
            month = monthMatch2[2];

            const monthAbbreviations = {
                'Jan': 'Janeiro', 'Fev': 'Fevereiro', 'Mar': 'Março',
                'Abr': 'Abril', 'Mai': 'Maio', 'Jun': 'Junho',
                'Jul': 'Julho', 'Ago': 'Agosto', 'Set': 'Setembro',
                'Out': 'Outubro', 'Nov': 'Novembro', 'Dez': 'Dezembro'
            };

            if (monthAbbreviations[month]) {
                month = monthAbbreviations[month];
            }
        }
    }

    const categories = createCategoryBuckets();

    let currentCategory = null;
    let totalGeneral = 0;
    let apartmentFee = 0;
    let reserveFund = 0;

    const knownCategories = Object.keys(categories).filter(c => c !== 'OUTROS');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

        if (line.startsWith('R$')) {
            continue;
        }

        if (knownCategories.includes(line.toUpperCase())) {
            currentCategory = line.toUpperCase();
            continue;
        }

        if (line === line.toUpperCase() &&
            line.length > 3 &&
            !line.startsWith('R$') &&
            !line.toLowerCase().includes('total') &&
            !line.includes('DESPESAS ORDINÁRIAS') &&
            !line.includes('FUNDO DE RESERVA') &&
            !line.includes('VALOR DA TAXA') &&
            !line.includes('Previsão') &&
            !knownCategories.includes(line.toUpperCase()) &&
            !nextLine.startsWith('R$')) {
            currentCategory = 'OUTROS';
            continue;
        }

        if (currentCategory && nextLine.startsWith('R$') && !line.toLowerCase().includes('total')) {
            const valueMatch = nextLine.match(/R\$\s*([\d.,]+)/);
            if (valueMatch) {
                const value = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));

                categories[currentCategory].push({
                    name: line,
                    value: value
                });

                i++;
            }
        }

        if (line === 'TOTAL' && nextLine.startsWith('R$')) {
            const valueMatch = nextLine.match(/R\$\s*([\d.,]+)/);
            if (valueMatch) {
                totalGeneral = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
            }
        }

        if (line.includes('TAXA DE CONDOMINIO') && nextLine.startsWith('R$')) {
            const valueMatch = nextLine.match(/R\$\s*([\d.,]+)/);
            if (valueMatch) {
                apartmentFee = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
            }
        }

        if (line.includes('FUNDO DE RESERVA') && nextLine.startsWith('R$')) {
            const valueMatch = nextLine.match(/R\$\s*([\d.,]+)/);
            if (valueMatch) {
                reserveFund = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
            }
        }
    }

    const categoryTotals = recalculateCategoryTotals(categories);

    return {
        month,
        year,
        key: `${year}-${month}`,
        date: parseMonthDate(month, year),
        categories,
        categoryTotals,
        totalGeneral,
        apartmentFee,
        reserveFund
    };
}

function parseMonthDate(month, year) {
    const monthMap = {
        'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3,
        'Maio': 4, 'Junho': 5, 'Julho': 6, 'Agosto': 7,
        'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };
    return new Date(parseInt(year), monthMap[month] || 0, 1);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatMonthYear(month, year) {
    return `${month} ${year}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesNormalizedQuery(searchText, normalizedQuery) {
    if (!normalizedQuery) return true;
    if (searchText.includes(normalizedQuery)) return true;

    const ignoredTokens = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
    const tokens = normalizedQuery
        .split(' ')
        .filter(token => token.length > 1 && !ignoredTokens.has(token));

    return tokens.every(token => {
        const singularToken = token.endsWith('s') ? token.slice(0, -1) : token;
        return searchText.includes(token) || searchText.includes(singularToken);
    });
}

function cleanChargeLabel(value) {
    return String(value ?? '')
        .replace(/\s*-\s*NF\s*\d+/gi, '')
        .replace(/\bNF\s*\d+\b/gi, '')
        .replace(/\bRef\.?\s*[\d./-]+/gi, '')
        .replace(/\bparc\.?\s*[\d/.-]+/gi, '')
        .replace(/\s*\((?:[^()]*(?:ref|parc|item)[^()]*)\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+-\s*$/g, '')
        .trim();
}

const chargeGroupRules = [
    {
        key: 'agua-saneago',
        label: 'Água / SANEAGO',
        matchTerms: ['saneago', 'agua coletiva'],
        terms: ['agua', 'saneago', 'agua coletiva']
    },
    {
        key: 'energia-equatorial',
        label: 'Energia / EQUATORIAL',
        matchTerms: ['equatorial'],
        terms: ['energia', 'equatorial', 'eletricidade', 'luz', 'conta de luz']
    },
    {
        key: 'gas-coletivo',
        label: 'Gás coletivo',
        matchTerms: ['gas coletiva', 'gas coletivo'],
        terms: ['gas', 'gas coletiva', 'gas coletivo']
    },
    {
        key: 'honorario-juridico',
        label: 'Honorário jurídico / advocacia',
        terms: ['honorario juridico', 'juridico', 'advogado', 'advogados', 'advocacia']
    },
    {
        key: 'honorario-contabil',
        label: 'Honorário contábil',
        terms: ['honorario contabil', 'contabil', 'contabilidade']
    },
    {
        key: 'honorario-sindica',
        label: 'Honorário síndica',
        terms: ['honorario sindica', 'sindica', 'sindico']
    },
    {
        key: 'limpeza',
        label: 'Prestação de limpeza',
        terms: ['limpeza', 'alfa solucoes', 'prestadora de servicos limpeza']
    },
    {
        key: 'elevadores',
        label: 'Manutenção de elevadores',
        terms: ['elevador', 'elevadores', 'otis']
    },
    {
        key: 'seguranca',
        label: 'Segurança / câmeras / acesso',
        terms: ['seguranca', 'camera', 'cameras', 'cerca eletrica', 'acesso', 'federal seguranca']
    },
    {
        key: 'piscina',
        label: 'Manutenção da piscina',
        terms: ['piscina']
    },
    {
        key: 'seguro-predial',
        label: 'Seguro predial',
        terms: ['seguro predial', 'hdi']
    },
    {
        key: 'condobem',
        label: 'Comissão CondoBem',
        terms: ['condobem', 'antecipacao de receita', 'liquidacao de boletos']
    }
];

function getChargeGroupInfo(name) {
    const normalizedName = normalizeText(name);
    const matchedRule = chargeGroupRules.find(rule =>
        (rule.matchTerms || rule.terms).some(term => normalizedName.includes(normalizeText(term)))
    );

    if (matchedRule) {
        return matchedRule;
    }

    const genericKey = normalizedName
        .replace(/\b(nf|ref|referente|parc|parcela|item)\b/g, ' ')
        .replace(/\b\d{1,2}[./-]\d{2,4}\b/g, ' ')
        .replace(/\b\d+\/\d+\b/g, ' ')
        .replace(/\b\d+\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        key: `item-${genericKey || normalizedName || 'sem-nome'}`,
        label: cleanChargeLabel(name) || name || 'Cobrança sem nome',
        terms: []
    };
}

function getMonthLabel(month) {
    return month ? `${month.month} ${month.year}` : '';
}

function getPeriodLabel(months) {
    if (!months || months.length === 0) return 'Nenhum mês';
    if (months.length === 1) return getMonthLabel(months[0]);
    return `${getMonthLabel(months[0])} até ${getMonthLabel(months[months.length - 1])}`;
}

function getChargeItemsForMonth(month) {
    if (!month || !month.categories) return [];

    return Object.entries(month.categories).flatMap(([category, items]) => {
        if (!Array.isArray(items)) return [];

        return items.map(item => ({
            monthKey: month.key,
            monthLabel: getMonthLabel(month),
            monthDate: new Date(month.date),
            category,
            name: item.name,
            value: Number(item.value) || 0
        }));
    });
}

function getAvailableChargeCategories() {
    const categories = new Set();

    AppState.months.forEach(month => {
        Object.entries(month.categories || {}).forEach(([category, items]) => {
            if (Array.isArray(items) && items.length > 0) {
                categories.add(category);
            }
        });
    });

    return [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function getChargeSuggestions() {
    const suggestions = new Map();

    chargeGroupRules.forEach(rule => {
        suggestions.set(rule.label, rule.label);
    });

    AppState.months.forEach(month => {
        getChargeItemsForMonth(month).forEach(item => {
            const group = getChargeGroupInfo(item.name);
            suggestions.set(group.label, group.label);
            suggestions.set(item.name, item.name);
        });
    });

    return [...suggestions.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function getChargeGroups(query = AppState.chargeSearch, categoryFilter = AppState.chargeCategoryFilter) {
    const months = AppState.getFilteredMonths();
    const monthKeys = months.map(month => month.key);
    const normalizedQuery = normalizeText(query);
    const groupsByKey = new Map();

    months.forEach(month => {
        getChargeItemsForMonth(month).forEach(item => {
            if (categoryFilter && item.category !== categoryFilter) return;

            const group = getChargeGroupInfo(item.name);
            const searchText = normalizeText([
                item.name,
                item.category,
                group.label,
                group.key,
                ...(group.terms || [])
            ].join(' '));

            if (!matchesNormalizedQuery(searchText, normalizedQuery)) return;

            if (!groupsByKey.has(group.key)) {
                groupsByKey.set(group.key, {
                    key: group.key,
                    label: group.label,
                    categories: new Map(),
                    monthValues: Object.fromEntries(monthKeys.map(key => [key, 0])),
                    occurrences: [],
                    total: 0
                });
            }

            const entry = groupsByKey.get(group.key);
            entry.monthValues[item.monthKey] = (entry.monthValues[item.monthKey] || 0) + item.value;
            entry.occurrences.push(item);
            entry.total += item.value;
            entry.categories.set(item.category, (entry.categories.get(item.category) || 0) + 1);
        });
    });

    return [...groupsByKey.values()]
        .map(group => {
            const values = monthKeys.map(key => group.monthValues[key] || 0);
            const nonZeroValues = values.filter(value => value > 0);
            const primaryCategory = [...group.categories.entries()]
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem categoria';
            const firstValue = values.find(value => value > 0) || 0;
            const lastValue = [...values].reverse().find(value => value > 0) || 0;

            return {
                ...group,
                values,
                primaryCategory,
                average: values.length > 0 ? group.total / values.length : 0,
                min: nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0,
                max: nonZeroValues.length > 0 ? Math.max(...nonZeroValues) : 0,
                monthsWithValue: nonZeroValues.length,
                variation: lastValue - firstValue
            };
        })
        .filter(group => normalizedQuery || group.total > 0)
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
}

function calculateTrend(current, previous) {
    if (!previous || previous === 0) return { text: '—', class: 'neutral' };

    const diff = current - previous;
    const percent = ((diff / previous) * 100).toFixed(1);

    if (diff > 0) {
        return { text: `↑ ${percent}%`, class: 'negative' };
    } else if (diff < 0) {
        return { text: `↓ ${Math.abs(percent)}%`, class: 'positive' };
    }
    return { text: '→ 0%', class: 'neutral' };
}

const chartColors = {
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    cyan: '#06b6d4',
    orange: '#f97316',
};

const categoryColors = {
    'ENCARGOS SOCIAIS': chartColors.emerald,
    'CONCESSIONÁRIAS': chartColors.amber,
    'ADMINISTRAÇÃO': chartColors.blue,
    'MANUTENÇÃO E CONSERVAÇÃO': chartColors.purple,
    'DESPESAS BANCARIAS': chartColors.pink,
    'OUTROS VALORES INDIVIDUAIS': chartColors.cyan,
    'OUTROS': chartColors.orange
};

Chart.defaults.color = '#9ca3af';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
Chart.defaults.font.family = "'Inter', sans-serif";

function getChartOptions(type = 'default') {
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#e6e8eb',
                    font: { size: 12 },
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(22, 29, 38, 0.95)',
                titleColor: '#e6e8eb',
                bodyColor: '#9ca3af',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }

                        const value = context.parsed.y !== undefined && context.parsed.y !== null
                            ? context.parsed.y
                            : context.parsed.x;
                        if (value !== null && value !== undefined) {
                            label += formatCurrency(value);
                        }
                        return label;
                    }
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuart'
        }
    };

    if (type === 'bar') {
        baseOptions.scales = {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        };
    }

    return baseOptions;
}

function renderEvolutionChart() {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) return;

    if (AppState.charts.evolution) {
        AppState.charts.evolution.destroy();
    }

    const months = AppState.getFilteredMonths();
    if (months.length === 0) {
        AppState.charts.evolution = null;
        return;
    }

    const data = {
        labels: months.map(getMonthLabel),
        datasets: [{
            label: 'Total de Despesas',
            data: months.map(m => m.totalGeneral),
            borderColor: chartColors.emerald,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: chartColors.emerald,
            pointBorderColor: '#0a0e14',
            pointBorderWidth: 2
        }]
    };

    const options = {
        ...getChartOptions('bar'),
        plugins: {
            ...getChartOptions('bar').plugins,
            legend: { display: false }
        }
    };

    AppState.charts.evolution = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

function renderDistributionChart() {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;

    if (AppState.charts.distribution) {
        AppState.charts.distribution.destroy();
    }

    const latestMonth = AppState.getDisplayMonth();
    if (!latestMonth) {
        AppState.charts.distribution = null;
        return;
    }

    const categories = Object.entries(latestMonth.categoryTotals)
        .filter(([_, value]) => value > 0);

    const data = {
        labels: categories.map(([cat, _]) => cat),
        datasets: [{
            data: categories.map(([_, value]) => value),
            backgroundColor: categories.map(([cat, _]) => categoryColors[cat] || chartColors.orange),
            borderColor: '#0a0e14',
            borderWidth: 2,
            hoverOffset: 10
        }]
    };

    const options = {
        ...getChartOptions(),
        plugins: {
            ...getChartOptions().plugins,
            legend: {
                display: true,
                position: 'right',
                labels: {
                    color: '#e6e8eb',
                    font: { size: 11 },
                    padding: 10,
                    generateLabels: function(chart) {
                        const data = chart.data;
                        return data.labels.map((label, i) => ({
                            text: label,
                            fillStyle: data.datasets[0].backgroundColor[i],
                            hidden: false,
                            index: i
                        }));
                    }
                }
            }
        }
    };

    AppState.charts.distribution = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: options
    });
}

function renderTopExpensesChart() {
    const ctx = document.getElementById('topExpensesChart');
    if (!ctx) return;

    if (AppState.charts.topExpenses) {
        AppState.charts.topExpenses.destroy();
    }

    const latestMonth = AppState.getDisplayMonth();
    if (!latestMonth) {
        AppState.charts.topExpenses = null;
        return;
    }

    console.log('📊 Renderizando Top 10 para:', `${latestMonth.month}/${latestMonth.year}`);

    const allItems = [];
    for (const [category, items] of Object.entries(latestMonth.categories)) {
        if (Array.isArray(items) && items.length > 0) {
            console.log(`  ${category}: ${items.length} itens`);
            items.forEach(item => {
                allItems.push({
                    name: item.name,
                    value: item.value,
                    category: category
                });
            });
        }
    }

    console.log(`  Total de itens coletados: ${allItems.length}`);

    const top10 = allItems
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    console.log('  🔝 Top 10:');
    top10.forEach((item, i) => {
        console.log(`    ${i+1}. ${item.name}: ${formatCurrency(item.value)}`);
    });

    if (top10.length === 0) {
        AppState.charts.topExpenses = null;
        return;
    }

    const data = {
        labels: top10.map(item => item.name),
        datasets: [{
            label: 'Valor',
            data: top10.map(item => item.value),
            backgroundColor: top10.map(item => categoryColors[item.category] || chartColors.orange),
            borderColor: '#0a0e14',
            borderWidth: 1
        }]
    };

    const options = {
        ...getChartOptions('bar'),
        indexAxis: 'y',
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    color: '#9ca3af',
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            },
            y: {
                ticks: {
                    color: '#9ca3af'
                },
                grid: {
                    display: false
                }
            }
        },
        plugins: {
            ...getChartOptions('bar').plugins,
            legend: { display: false },
            tooltip: {
                ...getChartOptions('bar').plugins.tooltip,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }

                        label += formatCurrency(context.parsed.x);
                        return label;
                    }
                }
            }
        }
    };

    AppState.charts.topExpenses = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

function renderStackedChart() {
    const ctx = document.getElementById('stackedChart');
    if (!ctx) return;

    if (AppState.charts.stacked) {
        AppState.charts.stacked.destroy();
    }

    const months = AppState.getFilteredMonths();
    if (months.length === 0) {
        AppState.charts.stacked = null;
        return;
    }

    const allCategories = ['ENCARGOS SOCIAIS', 'CONCESSIONÁRIAS', 'ADMINISTRAÇÃO',
                          'MANUTENÇÃO E CONSERVAÇÃO', 'DESPESAS BANCARIAS',
                          'OUTROS VALORES INDIVIDUAIS', 'OUTROS'];

    const datasets = allCategories.map(category => ({
        label: category,
        data: months.map(m => m.categoryTotals[category] || 0),
        backgroundColor: categoryColors[category],
        borderColor: '#0a0e14',
        borderWidth: 1
    }));

    const data = {
        labels: months.map(getMonthLabel),
        datasets: datasets
    };

    const options = {
        ...getChartOptions('bar'),
        scales: {
            x: {
                stacked: true,
                grid: { display: false }
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            }
        }
    };

    AppState.charts.stacked = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

function updateDashboard() {
    const latestMonth = AppState.getDisplayMonth();
    const previousMonth = AppState.getDisplayPreviousMonth();

    console.log('\n🔄 ATUALIZANDO DASHBOARD...');
    console.log('═'.repeat(60));

    if (latestMonth) {
        console.log(`📅 Total de meses carregados: ${AppState.months.length}`);
        console.log(`🎯 MÊS EXIBIDO NOS CARDS: ${latestMonth.month}/${latestMonth.year}`);
        console.log(`   Total: ${formatCurrency(latestMonth.totalGeneral)}`);
        console.log(`   Taxa/Apto: ${formatCurrency(latestMonth.apartmentFee)}`);
        console.log(`   Fundo Reserva: ${formatCurrency(latestMonth.reserveFund)}`);

        if (previousMonth) {
            console.log(`📊 Comparando com: ${previousMonth.month}/${previousMonth.year}`);
            console.log(`   Diferença: ${formatCurrency(latestMonth.totalGeneral - previousMonth.totalGeneral)}`);
        } else {
            console.log(`ℹ️  Sem mês anterior para comparação`);
        }
    }
    console.log('═'.repeat(60) + '\n');

    if (!latestMonth) {
        document.getElementById('totalExpenses').textContent = 'R$ 0,00';
        document.getElementById('apartmentFee').textContent = 'R$ 0,00';
        document.getElementById('reserveFund').textContent = 'R$ 0,00';
        document.getElementById('avgCategory').textContent = 'R$ 0,00';

        ['expensesTrend', 'feeTrend', 'reserveTrend', 'avgTrend'].forEach(id => {
            document.getElementById(id).textContent = '';
            document.getElementById(id).className = 'card-trend neutral';
        });

        Object.values(AppState.charts).forEach(chart => chart && chart.destroy());
        AppState.charts = {};

        updateMonthSelector();
        updateLoadedMonthsBadges();
        renderCategoriesView();
        renderChargesView();
        return;
    }

    document.getElementById('totalExpenses').textContent = formatCurrency(latestMonth.totalGeneral);
    document.getElementById('apartmentFee').textContent = formatCurrency(latestMonth.apartmentFee);
    document.getElementById('reserveFund').textContent = formatCurrency(latestMonth.reserveFund);

    const categoriesWithValues = Object.values(latestMonth.categoryTotals).filter(v => v > 0);
    const avgCategory = categoriesWithValues.length > 0
        ? categoriesWithValues.reduce((a, b) => a + b, 0) / categoriesWithValues.length
        : 0;
    document.getElementById('avgCategory').textContent = formatCurrency(avgCategory);

    if (previousMonth) {
        const expensesTrend = calculateTrend(latestMonth.totalGeneral, previousMonth.totalGeneral);
        const feeTrend = calculateTrend(latestMonth.apartmentFee, previousMonth.apartmentFee);
        const reserveTrend = calculateTrend(latestMonth.reserveFund, previousMonth.reserveFund);

        const prevAvg = Object.values(previousMonth.categoryTotals).filter(v => v > 0);
        const prevAvgValue = prevAvg.length > 0 ? prevAvg.reduce((a, b) => a + b, 0) / prevAvg.length : 0;
        const avgTrend = calculateTrend(avgCategory, prevAvgValue);

        updateTrendElement('expensesTrend', expensesTrend);
        updateTrendElement('feeTrend', feeTrend);
        updateTrendElement('reserveTrend', reserveTrend);
        updateTrendElement('avgTrend', avgTrend);
    } else {
        ['expensesTrend', 'feeTrend', 'reserveTrend', 'avgTrend'].forEach(id => {
            updateTrendElement(id, { text: '—', class: 'neutral' });
        });
    }

    renderEvolutionChart();
    renderDistributionChart();
    renderTopExpensesChart();
    renderStackedChart();

    updateMonthSelector();
    updateLoadedMonthsBadges();

    renderCategoriesView();
    renderChargesView();
}

function updateTrendElement(elementId, trend) {
    const element = document.getElementById(elementId);
    element.textContent = trend.text;
    element.className = `card-trend ${trend.class}`;
}

function updateMonthSelector() {
    const selector = document.getElementById('monthFilter');
    const compareMonth1 = document.getElementById('compareMonth1');
    const compareMonth2 = document.getElementById('compareMonth2');
    const periodStart = document.getElementById('periodStart');
    const periodEnd = document.getElementById('periodEnd');
    const chargeCategoryFilter = document.getElementById('chargeCategoryFilter');
    const chargeSuggestions = document.getElementById('chargeSuggestions');

    const options = AppState.months.map(m =>
        `<option value="${escapeHtml(m.key)}">${escapeHtml(getMonthLabel(m))}</option>`
    ).join('');

    const validMonthKeys = new Set(AppState.months.map(month => month.key));
    if (AppState.selectedMonthFilter && !validMonthKeys.has(AppState.selectedMonthFilter)) {
        AppState.selectedMonthFilter = null;
    }
    if (AppState.periodStartKey && !validMonthKeys.has(AppState.periodStartKey)) {
        AppState.periodStartKey = null;
    }
    if (AppState.periodEndKey && !validMonthKeys.has(AppState.periodEndKey)) {
        AppState.periodEndKey = null;
    }

    if (selector) {
        selector.innerHTML = '<option value="">Último do período</option>' + options;
        selector.value = AppState.selectedMonthFilter || '';
    }

    if (periodStart) {
        periodStart.innerHTML = '<option value="">Início</option>' + options;
        periodStart.value = AppState.periodStartKey || '';
    }

    if (periodEnd) {
        periodEnd.innerHTML = '<option value="">Fim</option>' + options;
        periodEnd.value = AppState.periodEndKey || '';
    }

    if (compareMonth1) {
        const currentValue = compareMonth1.value;
        compareMonth1.innerHTML = '<option value="">Selecione...</option>' + options;
        compareMonth1.value = validMonthKeys.has(currentValue) ? currentValue : '';
    }

    if (compareMonth2) {
        const currentValue = compareMonth2.value;
        compareMonth2.innerHTML = '<option value="">Selecione...</option>' + options;
        compareMonth2.value = validMonthKeys.has(currentValue) ? currentValue : '';
    }

    if (chargeCategoryFilter) {
        const categories = getAvailableChargeCategories();
        const categoryOptions = categories
            .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
            .join('');
        if (AppState.chargeCategoryFilter && !categories.includes(AppState.chargeCategoryFilter)) {
            AppState.chargeCategoryFilter = '';
        }
        chargeCategoryFilter.innerHTML = '<option value="">Todas as categorias</option>' + categoryOptions;
        chargeCategoryFilter.value = AppState.chargeCategoryFilter;
    }

    if (chargeSuggestions) {
        chargeSuggestions.innerHTML = getChargeSuggestions()
            .map(suggestion => `<option value="${escapeHtml(suggestion)}"></option>`)
            .join('');
    }
}

function updateLoadedMonthsBadges() {
    const container = document.getElementById('loadedMonths');
    container.innerHTML = AppState.months.map(m => `
        <div class="month-badge">
            ${escapeHtml(getMonthLabel(m))}
            <button onclick="removeMonth('${escapeHtml(m.key)}')">×</button>
        </div>
    `).join('');
}

function renderCategoriesView() {
    const container = document.getElementById('categoriesGrid');
    const latestMonth = AppState.getDisplayMonth();

    if (!latestMonth) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);"><h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Nenhum dado carregado</h3><p>Clique em "Importar Dados" para começar</p></div>';
        return;
    }

    const categoriesHtml = Object.entries(latestMonth.categoryTotals)
        .filter(([_, value]) => value > 0)
        .map(([category, total]) => {
            const itemsCount = latestMonth.categories[category].length;
            return `
                <div class="card category-card" onclick="showCategoryDetail('${category}')">
                    <div class="category-name">${escapeHtml(category)}</div>
                    <div class="category-total">${formatCurrency(total)}</div>
                    <div class="category-items-count">${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}</div>
                </div>
            `;
        })
        .join('');

    container.innerHTML = categoriesHtml;
}

function showCategoryDetail(categoryName) {
    const modal = document.getElementById('categoryModal');
    const modalTitle = document.getElementById('modalTitle');
    const categoryItems = document.getElementById('categoryItems');

    const latestMonth = AppState.getDisplayMonth();
    if (!latestMonth) return;

    modalTitle.textContent = categoryName;

    const items = latestMonth.categories[categoryName];
    const itemsHtml = items.map(item => `
        <div class="category-item">
            <span class="category-item-name">${escapeHtml(item.name)}</span>
            <span class="category-item-value">${formatCurrency(item.value)}</span>
        </div>
    `).join('');

    categoryItems.innerHTML = itemsHtml;

    renderCategoryHistoryChart(categoryName);

    modal.classList.add('active');
}

function renderCategoryHistoryChart(categoryName) {
    const ctx = document.getElementById('categoryHistoryChart');
    if (!ctx) return;

    if (AppState.charts.categoryHistory) {
        AppState.charts.categoryHistory.destroy();
    }

    const months = AppState.getFilteredMonths();
    const data = {
        labels: months.map(getMonthLabel),
        datasets: [{
            label: categoryName,
            data: months.map(m => m.categoryTotals[categoryName] || 0),
            borderColor: categoryColors[categoryName] || chartColors.emerald,
            backgroundColor: `${categoryColors[categoryName] || chartColors.emerald}33`,
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7
        }]
    };

    AppState.charts.categoryHistory = new Chart(ctx, {
        type: 'line',
        data: data,
        options: getChartOptions('bar')
    });
}

const chargeChartPalette = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#ef4444'
];

function renderChargesView() {
    const searchInput = document.getElementById('chargeSearch');
    const summaryContainer = document.getElementById('chargeSummary');
    const tableContainer = document.getElementById('chargeComparisonTable');
    const detailContainer = document.getElementById('chargeDetails');

    if (!summaryContainer || !tableContainer || !detailContainer) return;

    if (searchInput && searchInput.value !== AppState.chargeSearch) {
        searchInput.value = AppState.chargeSearch;
    }

    const months = AppState.getFilteredMonths();
    const groups = getChargeGroups();
    const hasActiveSearch = Boolean(normalizeText(AppState.chargeSearch) || AppState.chargeCategoryFilter);
    const visibleGroups = hasActiveSearch ? groups : groups.slice(0, 12);
    const totalValue = visibleGroups.reduce((sum, group) => sum + group.total, 0);

    summaryContainer.innerHTML = `
        <div class="charge-stat">
            <span>Período</span>
            <strong>${escapeHtml(getPeriodLabel(months))}</strong>
        </div>
        <div class="charge-stat">
            <span>Cobranças</span>
            <strong>${visibleGroups.length}</strong>
        </div>
        <div class="charge-stat">
            <span>Total filtrado</span>
            <strong>${formatCurrency(totalValue)}</strong>
        </div>
        <div class="charge-stat">
            <span>Meses</span>
            <strong>${months.length}</strong>
        </div>
    `;

    const chargesView = document.getElementById('chargesView');
    const isChargesViewActive = chargesView && chargesView.classList.contains('active');
    if (isChargesViewActive) {
        renderChargeComparisonChart(months, visibleGroups);
    } else if (AppState.charts.chargeComparison) {
        AppState.charts.chargeComparison.destroy();
        AppState.charts.chargeComparison = null;
    }
    tableContainer.innerHTML = renderChargeComparisonTable(months, visibleGroups, hasActiveSearch);
    detailContainer.innerHTML = renderChargeDetails(visibleGroups, hasActiveSearch);
}

function renderChargeComparisonChart(months, groups) {
    const ctx = document.getElementById('chargeComparisonChart');
    if (!ctx) return;

    if (AppState.charts.chargeComparison) {
        AppState.charts.chargeComparison.destroy();
    }

    if (months.length === 0 || groups.length === 0) {
        AppState.charts.chargeComparison = null;
        return;
    }

    const chartGroups = groups.slice(0, 6);
    const data = {
        labels: months.map(getMonthLabel),
        datasets: chartGroups.map((group, index) => {
            const color = chargeChartPalette[index % chargeChartPalette.length];
            return {
                label: group.label,
                data: months.map(month => group.monthValues[month.key] || 0),
                backgroundColor: `${color}cc`,
                borderColor: color,
                borderWidth: 1,
                borderRadius: 4,
                maxBarThickness: 32
            };
        })
    };

    const options = {
        ...getChartOptions('bar'),
        plugins: {
            ...getChartOptions('bar').plugins,
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#e6e8eb',
                    boxWidth: 12,
                    padding: 14
                }
            }
        },
        animation: {
            duration: 450
        }
    };

    AppState.charts.chargeComparison = new Chart(ctx, {
        type: 'bar',
        data,
        options
    });
}

function renderChargeComparisonTable(months, groups, hasActiveSearch) {
    if (months.length === 0) {
        return '<div class="empty-state">Nenhum mês disponível no período selecionado.</div>';
    }

    if (groups.length === 0) {
        const message = hasActiveSearch
            ? 'Nenhuma cobrança encontrada para os filtros atuais.'
            : 'Nenhuma cobrança carregada.';
        return `<div class="empty-state">${message}</div>`;
    }

    const monthHeaders = months.map(month => `
        <th>
            <span>${escapeHtml(month.month.slice(0, 3))}</span>
            <small>${escapeHtml(month.year)}</small>
        </th>
    `).join('');

    const rows = groups.map(group => {
        const monthCells = months.map(month => {
            const value = group.monthValues[month.key] || 0;
            return `<td class="${value > 0 ? '' : 'muted-cell'}">${value > 0 ? formatCurrency(value) : '—'}</td>`;
        }).join('');

        return `
            <tr>
                <td class="charge-name-cell">
                    <strong>${escapeHtml(group.label)}</strong>
                    <span>${escapeHtml(group.primaryCategory)}</span>
                </td>
                <td>${formatCurrency(group.total)}</td>
                <td>${formatCurrency(group.average)}</td>
                <td>${group.monthsWithValue}/${months.length}</td>
                ${monthCells}
            </tr>
        `;
    }).join('');

    return `
        <div class="table-scroll">
            <table class="charge-table">
                <thead>
                    <tr>
                        <th>Cobrança</th>
                        <th>Total</th>
                        <th>Média</th>
                        <th>Meses</th>
                        ${monthHeaders}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderChargeDetails(groups, hasActiveSearch) {
    if (!hasActiveSearch || groups.length === 0) return '';

    const occurrences = groups
        .flatMap(group => group.occurrences.map(item => ({ ...item, groupLabel: group.label })))
        .sort((a, b) => a.monthDate - b.monthDate || a.groupLabel.localeCompare(b.groupLabel, 'pt-BR'));

    const rows = occurrences.slice(0, 80).map(item => `
        <div class="charge-detail-item">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.monthLabel)} · ${escapeHtml(item.category)} · ${escapeHtml(item.groupLabel)}</span>
            </div>
            <strong>${formatCurrency(item.value)}</strong>
        </div>
    `).join('');

    const hiddenCount = Math.max(occurrences.length - 80, 0);
    const footer = hiddenCount > 0
        ? `<div class="charge-detail-footer">Mais ${hiddenCount} lançamento(s) oculto(s) para manter a tela objetiva.</div>`
        : '';

    return `
        <div class="card charge-detail-card">
            <div class="card-header">
                <h3 class="chart-title">Lançamentos encontrados</h3>
            </div>
            <div class="charge-detail-list">${rows}</div>
            ${footer}
        </div>
    `;
}

function renderComparisonView() {
    const month1Key = document.getElementById('compareMonth1').value;
    const month2Key = document.getElementById('compareMonth2').value;
    const resultsContainer = document.getElementById('comparisonResults');

    if (AppState.months.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 3rem;"><h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Nenhum dado carregado</h3><p>Clique em \"Importar Dados\" para começar</p></div>';
        return;
    }

    if (!month1Key || !month2Key) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 2rem;">Selecione dois meses para comparar</p>';
        return;
    }

    const month1 = AppState.getMonth(month1Key);
    const month2 = AppState.getMonth(month2Key);

    if (!month1 || !month2) return;

    const diff = month2.totalGeneral - month1.totalGeneral;
    const diffPercent = month1.totalGeneral > 0 ? ((diff / month1.totalGeneral) * 100).toFixed(1) : '0.0';
    const diffClass = diff > 0 ? 'text-red' : (diff < 0 ? 'text-emerald' : 'text-muted');

    resultsContainer.innerHTML = `
        <div class="comparison-column">
            <div class="comparison-summary">
                <h3 class="comparison-month-title">${month1.month} ${month1.year}</h3>
                <div class="comparison-item">
                    <span class="comparison-item-label">Total de Despesas</span>
                    <span class="comparison-item-value">${formatCurrency(month1.totalGeneral)}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-item-label">Taxa por Apartamento</span>
                    <span class="comparison-item-value">${formatCurrency(month1.apartmentFee)}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-item-label">Fundo de Reserva</span>
                    <span class="comparison-item-value">${formatCurrency(month1.reserveFund)}</span>
                </div>
            </div>
            ${renderCategoryComparison(month1)}
        </div>

        <div class="comparison-column">
            <div class="comparison-summary">
                <h3 class="comparison-month-title">${month2.month} ${month2.year}</h3>
                <div class="comparison-item">
                    <span class="comparison-item-label">Total de Despesas</span>
                    <span class="comparison-item-value">${formatCurrency(month2.totalGeneral)}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-item-label">Taxa por Apartamento</span>
                    <span class="comparison-item-value">${formatCurrency(month2.apartmentFee)}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-item-label">Fundo de Reserva</span>
                    <span class="comparison-item-value">${formatCurrency(month2.reserveFund)}</span>
                </div>
                <div class="comparison-diff">
                    <div class="comparison-diff-label">Diferença</div>
                    <div class="comparison-diff-value ${diffClass}">
                        ${diff > 0 ? '+' : ''}${formatCurrency(diff)}
                        <div style="font-size: 1rem; margin-top: 0.5rem;">
                            (${diff > 0 ? '+' : ''}${diffPercent}%)
                        </div>
                    </div>
                </div>
            </div>
            ${renderCategoryComparison(month2)}
        </div>
    `;
}

function renderCategoryComparison(month) {
    const categoriesHtml = Object.entries(month.categoryTotals)
        .filter(([_, value]) => value > 0)
        .map(([category, total]) => `
            <div class="comparison-item">
                <span class="comparison-item-label">${category}</span>
                <span class="comparison-item-value">${formatCurrency(total)}</span>
            </div>
        `)
        .join('');

    return `
        <div class="comparison-summary" style="margin-top: 1rem;">
            <h4 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">Por Categoria</h4>
            ${categoriesHtml}
        </div>
    `;
}

const fallbackSampleFiles = [
    'sample-data/Arrecadação 2025 - Jul.txt',
    'sample-data/Arrecadação 2025 - Ago.txt',
    'sample-data/Arrecadação 2025 - Set.txt',
    'sample-data/Arrecadação 2025 - Out.txt',
    'sample-data/Arrecadação 2025 - Nov.txt',
    'sample-data/Arrecadação 2025 - Dez.txt',
    'sample-data/Arrecadação 2026 - Jan.txt',
    'sample-data/Arrecadação 2026 - Fev.txt',
    'sample-data/Arrecadação 2026 - Mar.txt',
    'sample-data/Arrecadação 2026 - Abr.txt'
];

async function getSampleDataFiles() {
    try {
        const response = await fetch('sample-data/manifest.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const manifest = await response.json();
        const files = Array.isArray(manifest) ? manifest : manifest.files;

        if (Array.isArray(files) && files.length > 0) {
            return files.map(file => file.startsWith('sample-data/') ? file : `sample-data/${file}`);
        }
    } catch (error) {
        console.warn('Não foi possível carregar sample-data/manifest.json. Usando lista padrão.', error);
    }

    return fallbackSampleFiles;
}

async function loadSampleData(options = {}) {
    const { silent = false } = options;
    const sampleFiles = await getSampleDataFiles();

    console.log(silent ? '📂 Sincronizando dados do repositório...' : '📂 Carregando dados de exemplo...');
    
    let loadedCount = 0;
    for (const filePath of sampleFiles) {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                const text = await response.text();
                const monthData = parseFinancialReport(text);
                if (monthData) {
                    AppState.addMonth(monthData);
                    loadedCount++;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Não foi possível carregar ${filePath}`);
        }
    }
    
    if (loadedCount > 0) {
        console.log(`✅ ${loadedCount} arquivo(s) sincronizado(s)`);
        updateDashboard();
    }
}

function handleFileUpload(event) {
    const files = event.target.files;
    let filesProcessed = 0;

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const monthData = parseFinancialReport(e.target.result);
                AppState.addMonth(monthData);
                console.log(`✓ Arquivo processado: ${monthData.month}/${monthData.year}`);
                console.log(`  Total: ${formatCurrency(monthData.totalGeneral)}`);
                console.log(`  Categorias:`, Object.keys(monthData.categoryTotals).filter(k => monthData.categoryTotals[k] > 0));

                filesProcessed++;
                if (filesProcessed === files.length) {
                    updateDashboard();
                }
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                alert(`Erro ao processar o arquivo ${file.name}. Verifique o formato.`);
            }
        };
        reader.readAsText(file);
    }

    event.target.value = '';
}

function removeMonth(key) {
    if (confirm('Deseja remover este mês?')) {
        AppState.removeMonth(key);
        updateDashboard();
    }
}

function switchView(viewName) {

    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
    });

    document.getElementById(`${viewName}View`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        evolution: 'Evolução',
        categories: 'Categorias',
        charges: 'Cobranças',
        comparison: 'Comparação'
    };
    document.querySelector('.page-title').textContent = titles[viewName];

    if (viewName === 'charges') {
        renderChargesView();
        requestAnimationFrame(() => renderChargesView());
    }
}

function clearAllData() {
    if (confirm('Tem certeza que deseja remover todos os dados carregados?')) {
        AppState.clear();
        updateDashboard();
        alert('Todos os dados foram removidos.');
    }
}

function keepFocusedMonthInsidePeriod() {
    if (!AppState.selectedMonthFilter) return;

    const filteredKeys = new Set(AppState.getFilteredMonths().map(month => month.key));
    if (!filteredKeys.has(AppState.selectedMonthFilter)) {
        AppState.selectedMonthFilter = null;
    }
}

function debugState() {
    console.log('=== ESTADO ATUAL DA APLICAÇÃO ===');
    console.log(`Total de meses carregados: ${AppState.months.length}`);
    AppState.months.forEach((month, i) => {
        const marker = (i === AppState.months.length - 1) ? '👉 [EXIBIDO]' : '  ';
        console.log(`\n${marker} ${i+1}. ${month.month}/${month.year}`);
        console.log(`   Key: ${month.key}`);
        console.log(`   Data: ${month.date}`);
        console.log(`   Total: ${formatCurrency(month.totalGeneral)}`);
        console.log(`   Taxa: ${formatCurrency(month.apartmentFee)}`);
        console.log(`   Categorias:`, Object.keys(month.categoryTotals).filter(k => month.categoryTotals[k] > 0));
    });
    const latest = AppState.getLatestMonth();
    const previous = AppState.getPreviousMonth();
    if (latest) {
        console.log(`\n🎯 MÊS MAIS RECENTE (exibido nos cards): ${latest.month}/${latest.year}`);
        console.log(`   Total: ${formatCurrency(latest.totalGeneral)}`);
    }
    if (previous) {
        console.log(`\n📊 MÊS ANTERIOR (usado para comparação): ${previous.month}/${previous.year}`);
        console.log(`   Total: ${formatCurrency(previous.totalGeneral)}`);
        console.log(`   Diferença: ${formatCurrency(latest.totalGeneral - previous.totalGeneral)}`);
    }
    console.log('================================');
}

function forceReorder() {
    console.log('🔧 Forçando reordenação cronológica...');
    AppState.months.sort((a, b) => {

        const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
        const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
        return dateA - dateB;
    });
    AppState.save();
    console.log('✓ Reordenação completa!');
    console.log(`📅 Nova ordem:`, AppState.months.map(m => `${m.month}/${m.year}`).join(' → '));
    updateDashboard();
}

function initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (!menuToggle || !sidebar) return;
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    sidebar.addEventListener('click', (e) => {
        if (e.target === sidebar || e.target.closest('.nav-item')) {
            sidebar.classList.remove('active');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            e.target !== menuToggle &&
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

window.debugState = debugState;
window.forceReorder = forceReorder;

document.addEventListener('DOMContentLoaded', function() {
    
    initMobileMenu();

    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    document.getElementById('clearBtn').addEventListener('click', clearAllData);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    document.getElementById('modalClose').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.remove('active');
    });

    document.getElementById('categoryModal').addEventListener('click', (e) => {
        if (e.target.id === 'categoryModal') {
            document.getElementById('categoryModal').classList.remove('active');
        }
    });

    document.getElementById('compareMonth1').addEventListener('change', renderComparisonView);
    document.getElementById('compareMonth2').addEventListener('change', renderComparisonView);
    
    document.getElementById('monthFilter').addEventListener('change', function(e) {
        AppState.selectedMonthFilter = e.target.value || null;
        updateDashboard();
    });

    document.getElementById('periodStart').addEventListener('change', function(e) {
        AppState.periodStartKey = e.target.value || null;
        keepFocusedMonthInsidePeriod();
        updateDashboard();
    });

    document.getElementById('periodEnd').addEventListener('change', function(e) {
        AppState.periodEndKey = e.target.value || null;
        keepFocusedMonthInsidePeriod();
        updateDashboard();
    });

    document.getElementById('clearPeriodBtn').addEventListener('click', function() {
        AppState.periodStartKey = null;
        AppState.periodEndKey = null;
        AppState.selectedMonthFilter = null;
        updateDashboard();
    });

    document.getElementById('chargeSearch').addEventListener('input', function(e) {
        AppState.chargeSearch = e.target.value;
        renderChargesView();
    });

    document.getElementById('chargeCategoryFilter').addEventListener('change', function(e) {
        AppState.chargeCategoryFilter = e.target.value || '';
        renderChargesView();
    });

    console.log('\n🚀 INICIALIZANDO GRAN FLORATA DASHBOARD...');
    console.log('═'.repeat(60));

    const loaded = AppState.load();

    if (loaded && AppState.months.length > 0) {
        console.log(`✓ Dados carregados do navegador (localStorage)`);
        console.log(`📅 Meses disponíveis em ordem cronológica:`);
        AppState.months.forEach((m, i) => {
            const marker = (i === AppState.months.length - 1) ? '👉' : '  ';
            console.log(`   ${marker} ${i + 1}. ${m.month}/${m.year} - ${formatCurrency(m.totalGeneral)}`);
        });
        const latest = AppState.getLatestMonth();
        console.log(`\n🎯 O dashboard exibirá: ${latest.month}/${latest.year} (ÚLTIMO MÊS)`);
        console.log('═'.repeat(60) + '\n');
        updateDashboard();
        loadSampleData({ silent: true });
    } else {
        console.log('ℹ️  Nenhum dado salvo encontrado.');
        console.log('📂 Carregando dados de exemplo para demonstração...');
        console.log('═'.repeat(60) + '\n');
        loadSampleData();
    }
});
