import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SAMPLE_DATA_DIR = path.join(ROOT_DIR, 'sample-data');
const URL_FILE = path.join(ROOT_DIR, 'url.txt');

const MONTHS = {
    janeiro: { number: 1, abbr: 'Jan', name: 'Janeiro' },
    fevereiro: { number: 2, abbr: 'Fev', name: 'Fevereiro' },
    marco: { number: 3, abbr: 'Mar', name: 'Março' },
    março: { number: 3, abbr: 'Mar', name: 'Março' },
    abril: { number: 4, abbr: 'Abr', name: 'Abril' },
    maio: { number: 5, abbr: 'Mai', name: 'Maio' },
    junho: { number: 6, abbr: 'Jun', name: 'Junho' },
    julho: { number: 7, abbr: 'Jul', name: 'Julho' },
    agosto: { number: 8, abbr: 'Ago', name: 'Agosto' },
    setembro: { number: 9, abbr: 'Set', name: 'Setembro' },
    outubro: { number: 10, abbr: 'Out', name: 'Outubro' },
    novembro: { number: 11, abbr: 'Nov', name: 'Novembro' },
    dezembro: { number: 12, abbr: 'Dez', name: 'Dezembro' },
    jan: { number: 1, abbr: 'Jan', name: 'Janeiro' },
    fev: { number: 2, abbr: 'Fev', name: 'Fevereiro' },
    mar: { number: 3, abbr: 'Mar', name: 'Março' },
    abr: { number: 4, abbr: 'Abr', name: 'Abril' },
    mai: { number: 5, abbr: 'Mai', name: 'Maio' },
    jun: { number: 6, abbr: 'Jun', name: 'Junho' },
    jul: { number: 7, abbr: 'Jul', name: 'Julho' },
    ago: { number: 8, abbr: 'Ago', name: 'Agosto' },
    set: { number: 9, abbr: 'Set', name: 'Setembro' },
    out: { number: 10, abbr: 'Out', name: 'Outubro' },
    nov: { number: 11, abbr: 'Nov', name: 'Novembro' },
    dez: { number: 12, abbr: 'Dez', name: 'Dezembro' }
};

function normalizeText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function decodeHtml(value) {
    return String(value ?? '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#039;/gi, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value) {
    return decodeHtml(String(value ?? '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function readFirstUrl(rawText) {
    const url = rawText
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(line => line && !line.startsWith('#'));

    if (!url) {
        throw new Error('url.txt não possui uma URL ativa.');
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'condobem.vouchsolucoes.com.br' || !parsedUrl.pathname.startsWith('/fatura/')) {
        throw new Error('url.txt deve apontar para uma fatura da Condobem.');
    }

    return parsedUrl.toString();
}

function getCpf() {
    const cpf = process.env.CONDOBEM_CPF?.replace(/\D/g, '');
    if (!cpf) {
        throw new Error('Secret/variável CONDOBEM_CPF não configurada.');
    }
    return cpf;
}

async function fetchInvoiceHtml(invoiceUrl, cpf) {
    const response = await fetch(invoiceUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': 'GranFlorataDashboard/1.0'
        },
        body: new URLSearchParams({ credencial: cpf }),
        redirect: 'follow'
    });

    if (!response.ok) {
        throw new Error(`Condobem retornou HTTP ${response.status}.`);
    }

    const html = await response.text();
    if (!html.includes('Balancete') || !html.includes('VALOR DA TAXA DE CONDOMINIO')) {
        throw new Error('CPF aceito não confirmado ou balancete não encontrado na resposta da Condobem.');
    }

    return html;
}

function extractBalanceteHtml(html) {
    const balanceteIndex = html.indexOf('<!-- Coluna 2 - Balancete -->') >= 0
        ? html.indexOf('<!-- Coluna 2 - Balancete -->')
        : html.indexOf('Balancete');

    if (balanceteIndex < 0) {
        throw new Error('Bloco Balancete não encontrado no HTML.');
    }

    const htmlFromBalancete = html.slice(balanceteIndex);
    const titleMatch = htmlFromBalancete.match(/<h6[^>]*>([\s\S]*?)<\/h6>/i);
    const listMatch = htmlFromBalancete.match(/<ul[^>]*class=['"][^'"]*compUl[^'"]*['"][^>]*>([\s\S]*?)<\/ul>/i);

    if (!titleMatch || !listMatch) {
        throw new Error('Título ou lista do balancete não encontrados.');
    }

    return {
        title: stripTags(titleMatch[1]),
        listHtml: listMatch[1]
    };
}

function parseBalanceteToText(html) {
    const { title, listHtml } = extractBalanceteHtml(html);
    const lines = [title];
    const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;

    for (const match of listHtml.matchAll(itemRegex)) {
        const itemHtml = match[1];
        const strongMatch = itemHtml.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);

        if (strongMatch) {
            const strongText = stripTags(strongMatch[1]);
            if (strongText) {
                lines.push(strongText);
            }
            continue;
        }

        const descMatch = itemHtml.match(/class=['"]composicaoDesc['"][^>]*>([\s\S]*?)<\/div>/i);
        const valueMatch = itemHtml.match(/class=['"]composicaoValor['"][^>]*>([\s\S]*?)<\/div>/i);
        const desc = descMatch ? stripTags(descMatch[1]) : '';
        const value = valueMatch ? stripTags(valueMatch[1]) : '';

        if (desc) lines.push(desc);
        if (value) lines.push(value);
    }

    const output = lines
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');

    if (!output.includes('VALOR DA TAXA DE CONDOMINIO COMUM')) {
        throw new Error('Balancete extraído não contém o valor final da taxa.');
    }

    return `${output}\n`;
}

function getReportDate(reportText) {
    const firstLine = reportText.split(/\r?\n/).find(Boolean) || '';
    const match = firstLine.match(/(\d{4})\s*-\s*([A-Za-zÀ-ÿ]+)/);

    if (!match) {
        throw new Error(`Não foi possível identificar ano/mês em: ${firstLine}`);
    }

    const year = Number(match[1]);
    const monthKey = normalizeText(match[2]);
    const month = MONTHS[monthKey];

    if (!month || !year) {
        throw new Error(`Mês inválido no balancete: ${match[2]}`);
    }

    return { year, month };
}

function getOutputFileName(reportText) {
    const { year, month } = getReportDate(reportText);
    return `Arrecadação ${year} - ${month.abbr}.txt`;
}

function getManifestSortKey(fileName) {
    const match = fileName.match(/Arrecadação\s+(\d{4})\s*-\s*([A-Za-zÀ-ÿ]+)/i);
    if (!match) return Number.MAX_SAFE_INTEGER;

    const year = Number(match[1]);
    const month = MONTHS[normalizeText(match[2])]?.number ?? 99;
    return year * 100 + month;
}

async function updateManifest() {
    const entries = await readdir(SAMPLE_DATA_DIR);
    const files = entries
        .filter(file => file.toLowerCase().endsWith('.txt'))
        .sort((a, b) => getManifestSortKey(a) - getManifestSortKey(b) || a.localeCompare(b, 'pt-BR'));

    await writeFile(
        path.join(SAMPLE_DATA_DIR, 'manifest.json'),
        `${JSON.stringify({ files }, null, 2)}\n`,
        'utf8'
    );

    return files;
}

async function main() {
    const invoiceUrl = readFirstUrl(await readFile(URL_FILE, 'utf8'));
    const cpf = getCpf();
    const html = await fetchInvoiceHtml(invoiceUrl, cpf);
    const reportText = parseBalanceteToText(html);
    const fileName = getOutputFileName(reportText);
    const outputPath = path.join(SAMPLE_DATA_DIR, fileName);

    await writeFile(outputPath, reportText, 'utf8');
    const manifestFiles = await updateManifest();

    const { year, month } = getReportDate(reportText);
    console.log(`Balancete importado: ${month.name}/${year}`);
    console.log(`Arquivo atualizado: sample-data/${fileName}`);
    console.log(`Manifesto atualizado com ${manifestFiles.length} arquivo(s).`);
}

main().catch(error => {
    console.error(`Falha ao importar Condobem: ${error.message}`);
    process.exit(1);
});
