import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.resolve(__dirname, '../data/historico-disciplina.csv');
// Um JSON por curso, gerado por scripts/prebuild-scrape.mjs (index.json é só a lista de cursos).
const CURSOS_DIR = path.resolve(__dirname, '../data/cursos');

const statsMap = {};

console.log('🔄 Iniciando parse do CSV de histórico...');

fs.createReadStream(CSV_FILE)
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
        const codigo = row.CodigoDisciplina?.trim().toUpperCase();
        if (!codigo) return;

        // Normaliza código (ex: "MAP 199" -> "MAP199")
        const codDisc = codigo.replace(/\s+/g, '');

        const numEstudantes = parseInt(row.NumEstudantes || '0', 10);
        const reprovacoes = parseInt(row.Reprovacoes || '0', 10);
        const abandonos = parseInt(row.Abandonos || '0', 10);

        if (!statsMap[codDisc]) {
            statsMap[codDisc] = { numEstudantes: 0, reprovacoes: 0, abandonos: 0 };
        }

        statsMap[codDisc].numEstudantes += numEstudantes;
        statsMap[codDisc].reprovacoes += reprovacoes;
        statsMap[codDisc].abandonos += abandonos;
    })
    .on('end', () => {
        console.log(`CSV lido. Dados agregados para ${Object.keys(statsMap).length} disciplinas exclusivas.`);

        const arquivos = fs.readdirSync(CURSOS_DIR).filter(f => /^\d{4}$/.test(f)).flatMap(ano => fs.readdirSync(path.join(CURSOS_DIR, ano)).filter(f => f.endsWith('.json')).map(f => path.join(ano, f)));
        if (arquivos.length === 0) {
            console.error(`Nenhum JSON de curso em ${CURSOS_DIR}`);
            process.exit(1);
        }

        // Taxa de insucesso por disciplina: (reprovações + abandonos) / matriculados, somando todos os cursos do CSV.
        const taxaDe = (codDisc) => {
            const stats = statsMap[codDisc];
            if (!stats || stats.numEstudantes === 0) return null;
            return Number((((stats.reprovacoes + stats.abandonos) / stats.numEstudantes) * 100).toFixed(1));
        };

        for (const arquivo of arquivos) {
            const jsonFile = path.join(CURSOS_DIR, arquivo);
            const dados = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
            const taxasObrigatorias = [];

            for (const periodo of Object.keys(dados.courseData)) {
                for (const disc of dados.courseData[periodo]) {
                    disc.reprovaPercentual = taxaDe(disc.CodDisc);
                    if (disc.reprovaPercentual !== null) taxasObrigatorias.push(disc.reprovaPercentual);
                }
            }
            // Optativas recebem a taxa, mas ficam fora da mediana para não mudar a calibração das obrigatórias.
            for (const disc of dados.optativas ?? []) {
                disc.reprovaPercentual = taxaDe(disc.CodDisc);
            }

            // Mediana global de insucesso do curso, usada como valor para disciplinas sem histórico.
            if (taxasObrigatorias.length > 0 && dados.metadata) {
                taxasObrigatorias.sort((a, b) => a - b);
                const mid = Math.floor(taxasObrigatorias.length / 2);
                const mediana = taxasObrigatorias.length % 2 === 0
                    ? (taxasObrigatorias[mid - 1] + taxasObrigatorias[mid]) / 2
                    : taxasObrigatorias[mid];
                dados.metadata.medianaGlobalReprovacao = Number(mediana.toFixed(2));
                delete dados.metadata.mediaGlobalReprovacao;
            }

            fs.writeFileSync(jsonFile, JSON.stringify(dados, null, 2), 'utf-8');
            const total = Object.values(dados.courseData).flat().length;
            console.log(`> ${arquivo.replace('.json', '')}: ${taxasObrigatorias.length}/${total} obrigatórias com taxa, mediana ${dados.metadata?.medianaGlobalReprovacao ?? '-'}%`);
        }
    })
    .on('error', (err) => {
        console.error('Erro ao ler CSV:', err);
    });
