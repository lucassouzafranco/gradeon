import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.resolve(__dirname, '../data/historico-disciplina.csv');
const JSON_FILE = path.resolve(__dirname, '../data/scrapedData.json');

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
    console.log(`✅ CSV lido. Dados agregados para ${Object.keys(statsMap).length} disciplinas exclusivas.`);

    console.log('🔄 Mesclando com scrapedData.json...');
    if (!fs.existsSync(JSON_FILE)) {
      console.error(`❌ JSON não encontrado: ${JSON_FILE}`);
      process.exit(1);
    }

    const rawJson = fs.readFileSync(JSON_FILE, 'utf-8');
    const scrapedData = JSON.parse(rawJson);

    let matchCount = 0;

    for (const periodo of Object.keys(scrapedData.courseData)) {
      for (const disc of scrapedData.courseData[periodo]) {
        const codDisc = disc.CodDisc;

        if (statsMap[codDisc]) {
          const stats = statsMap[codDisc];
          if (stats.numEstudantes > 0) {
            const taxa = ((stats.reprovacoes + stats.abandonos) / stats.numEstudantes) * 100;
            disc.reprovaPercentual = Number(taxa.toFixed(1));
            matchCount++;
          } else {
            disc.reprovaPercentual = 0;
          }
        } else {
          disc.reprovaPercentual = 0;
        }
      }
    }

    fs.writeFileSync(JSON_FILE, JSON.stringify(scrapedData, null, 2), 'utf-8');
    console.log(`✅ Sucesso! Taxa de reprovação real injetada em ${matchCount} disciplinas no JSON.`);
  })
  .on('error', (err) => {
    console.error('❌ Erro ao ler CSV:', err);
  });
