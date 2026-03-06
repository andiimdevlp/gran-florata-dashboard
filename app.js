const AppState = {
    months: [],
    currentMonth: null,
    selectedMonthFilter: null,
    charts: {},

    addMonth(monthData) {
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

    getDisplayMonth() {
        if (this.selectedMonthFilter) {
            return this.getMonth(this.selectedMonthFilter);
        }
        return this.getLatestMonth();
    },

    getDisplayPreviousMonth() {
        const displayMonth = this.getDisplayMonth();
        if (!displayMonth) return null;
        
        const displayIndex = this.months.findIndex(m => m.key === displayMonth.key);
        if (displayIndex > 0) {
            return this.months[displayIndex - 1];
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
                this.months = JSON.parse(saved);

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
        localStorage.removeItem('granFlorata_months');
    }
};

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

    const categories = {
        'ENCARGOS SOCIAIS': [],
        'CONCESSIONÁRIAS': [],
        'ADMINISTRAÇÃO': [],
        'MANUTENÇÃO E CONSERVAÇÃO': [],
        'DESPESAS BANCARIAS': [],
        'OUTROS VALORES INDIVIDUAIS': [],
        'OUTROS': []
    };

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
            !knownCategories.includes(line) &&
            nextLine.startsWith('R$')) {
            currentCategory = 'OUTROS';
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

    const categoryTotals = {};
    for (const [category, items] of Object.entries(categories)) {
        if (items.length > 0) {
            categoryTotals[category] = items.reduce((sum, item) => sum + item.value, 0);
        }
    }

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

    if (AppState.months.length === 0) {
        AppState.charts.evolution = null;
        return;
    }

    const data = {
        labels: AppState.months.map(m => `${m.month} ${m.year}`),
        datasets: [{
            label: 'Total de Despesas',
            data: AppState.months.map(m => m.totalGeneral),
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

    if (AppState.months.length === 0) {
        AppState.charts.stacked = null;
        return;
    }

    const allCategories = ['ENCARGOS SOCIAIS', 'CONCESSIONÁRIAS', 'ADMINISTRAÇÃO',
                          'MANUTENÇÃO E CONSERVAÇÃO', 'DESPESAS BANCARIAS',
                          'OUTROS VALORES INDIVIDUAIS', 'OUTROS'];

    const datasets = allCategories.map(category => ({
        label: category,
        data: AppState.months.map(m => m.categoryTotals[category] || 0),
        backgroundColor: categoryColors[category],
        borderColor: '#0a0e14',
        borderWidth: 1
    }));

    const data = {
        labels: AppState.months.map(m => `${m.month} ${m.year}`),
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
    }

    renderEvolutionChart();
    renderDistributionChart();
    renderTopExpensesChart();
    renderStackedChart();

    updateMonthSelector();
    updateLoadedMonthsBadges();

    renderCategoriesView();
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

    const options = AppState.months.map(m =>
        `<option value="${m.key}">${m.month} ${m.year}</option>`
    ).join('');

    selector.innerHTML = '<option value="">Todos os meses</option>' + options;
    compareMonth1.innerHTML = '<option value="">Selecione...</option>' + options;
    compareMonth2.innerHTML = '<option value="">Selecione...</option>' + options;
    
    if (AppState.selectedMonthFilter) {
        selector.value = AppState.selectedMonthFilter;
    }
}

function updateLoadedMonthsBadges() {
    const container = document.getElementById('loadedMonths');
    container.innerHTML = AppState.months.map(m => `
        <div class="month-badge">
            ${m.month} ${m.year}
            <button onclick="removeMonth('${m.key}')">×</button>
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
                    <div class="category-name">${category}</div>
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
            <span class="category-item-name">${item.name}</span>
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

    const data = {
        labels: AppState.months.map(m => `${m.month} ${m.year}`),
        datasets: [{
            label: categoryName,
            data: AppState.months.map(m => m.categoryTotals[categoryName] || 0),
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
    const diffPercent = ((diff / month1.totalGeneral) * 100).toFixed(1);
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

async function loadSampleData() {
    const sampleFiles = [
        'sample-data/Arrecadação 2025 - Jul.txt',
        'sample-data/Arrecadação 2025 - Ago.txt',
        'sample-data/Arrecadação 2025 - Set.txt',
        'sample-data/Arrecadação 2025 - Out.txt',
        'sample-data/Arrecadação 2025 - Nov.txt',
        'sample-data/Arrecadação 2025 - Dez.txt',
        'sample-data/Arrecadação 2026 - Jan.txt',
        'sample-data/Arrecadação 2026 - Fev.txt',
        'sample-data/Arrecadação 2026 - Mar.txt'
    ];

    console.log('📂 Carregando dados de exemplo...');
    
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
        console.log(`✅ ${loadedCount} arquivos de exemplo carregados`);
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
        comparison: 'Comparação'
    };
    document.querySelector('.page-title').textContent = titles[viewName];
}

function clearAllData() {
    if (confirm('Tem certeza que deseja remover todos os dados carregados?')) {
        AppState.clear();
        updateDashboard();
        alert('Todos os dados foram removidos.');
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

window.debugState = debugState;
window.forceReorder = forceReorder;

document.addEventListener('DOMContentLoaded', function() {

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
    } else {
        console.log('ℹ️  Nenhum dado salvo encontrado.');
        console.log('📂 Carregando dados de exemplo para demonstração...');
        console.log('═'.repeat(60) + '\n');
        loadSampleData();
    }
});