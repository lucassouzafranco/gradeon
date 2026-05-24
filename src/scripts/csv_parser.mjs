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
    const reprovacoesArray = [];

    for (const periodo of Object.keys(scrapedData.courseData)) {
      for (const disc of scrapedData.courseData[periodo]) {
        const codDisc = disc.CodDisc;

        if (statsMap[codDisc]) {
          const stats = statsMap[codDisc];
          if (stats.numEstudantes > 0) {
            const taxa = ((stats.reprovacoes + stats.abandonos) / stats.numEstudantes) * 100;
            const taxaFixa = Number(taxa.toFixed(1));
            disc.reprovaPercentual = taxaFixa;
            reprovacoesArray.push(taxaFixa);
            matchCount++;
          } else {
            disc.reprovaPercentual = null;
          }
        } else {
          disc.reprovaPercentual = null;
        }
      }
    }

    // calcula mediana global
    if (reprovacoesArray.length > 0 && scrapedData.metadata) {
      reprovacoesArray.sort((a, b) => a - b);
      const mid = Math.floor(reprovacoesArray.length / 2);
      let mediana = reprovacoesArray[mid];
      if (reprovacoesArray.length % 2 === 0) {
        mediana = (reprovacoesArray[mid - 1] + reprovacoesArray[mid]) / 2;
      }
      scrapedData.metadata.medianaGlobalReprovacao = Number(mediana.toFixed(2));
      delete scrapedData.metadata.mediaGlobalReprovacao; 
    }

    fs.writeFileSync(JSON_FILE, JSON.stringify(scrapedData, null, 2), 'utf-8');
    console.log(`> merge concluido: ${matchCount} disciplinas mapeadas.`);
    if (scrapedData.metadata?.medianaGlobalReprovacao !== undefined) {
      console.log(`> mediana global: ${scrapedData.metadata.medianaGlobalReprovacao}%`);
    }
  })
  .on('error', (err) => {
    console.error('❌ Erro ao ler CSV:', err);
  });
