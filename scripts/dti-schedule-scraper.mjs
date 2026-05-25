/**
 * DTI SCHEDULE SCRAPER
 * Coleta horários reais das turmas do sistema DTI da UFV
 * Uso: node scripts/dti-schedule-scraper.mjs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper para extrair departamentos dinamicamente de scrapedData.json
function getUniqueDepartments() {
  try {
    const scrapedDataPath = path.resolve(__dirname, '../src/data/scrapedData.json');
    if (fs.existsSync(scrapedDataPath)) {
      const content = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(content);
      if (data && data.courseData) {
        const deptos = new Set();
        Object.values(data.courseData).forEach(disciplines => {
          if (Array.isArray(disciplines)) {
            disciplines.forEach(disc => {
              if (disc && disc.CodDisciplina) {
                const match = disc.CodDisciplina.match(/^([A-Z]+)/);
                if (match) deptos.add(match[1]);
              }
            });
          }
        });
        if (deptos.size > 0) {
          return Array.from(deptos);
        }
      }
    }
  } catch (err) {
    console.warn('[SCRAPER] Warning: Could not read scrapedData.json, using fallback depts:', err.message);
  }
  return ['SIN', 'MAP', 'ADE', 'ESP', 'CRP', 'CIC'];
}

const CONFIG = {
  baseUrl: 'https://www.dti.ufv.br/horario_crp/horario.asp',
  ano: 2025,
  departamento: 'SIN'
};

console.log('\n' + '='.repeat(80));
console.log('DTI SCHEDULE SCRAPER - Coletando horários');
console.log('='.repeat(80));

/**
 * Normaliza código de disciplina removendo espaços
 * "SIN 110" -> "SIN110"
 */
function normalizeCode(code) {
  return code.replace(/\s+/g, '').toUpperCase();
}

/**
 * Extrai horários da coluna "Horário" e formata
 * Input: "2=14-16 3=14-16" ou com quebras de linha
 * Output: ["2=14-16", "3=14-16"]
 */
function parseSchedule(scheduleText) {
  if (!scheduleText || scheduleText.trim() === 'a combinar') {
    return ['a combinar'];
  }
  
  const text = scheduleText.trim();
  
  // Substituir espaços/quebras entre horários por | para facilitar split
  // Padrão: captura "DIGITO=HORA-HORA" ou "DIGITO=HORA:MIN-HORA:MIN"
  const horarios = [];
  let currentMatch = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Iniciar novo horário quando encontrar dígito seguido de =
    if (/\d/.test(char) && i + 1 < text.length && text[i + 1] === '=') {
      // Salvar horário anterior se existir
      if (currentMatch) {
        horarios.push(currentMatch.trim());
      }
      currentMatch = char;
    } else {
      currentMatch += char;
    }
  }
  
  // Adicionar último horário
  if (currentMatch) {
    horarios.push(currentMatch.trim());
  }
  
  return horarios.length > 0 ? horarios : [text];
}

/**
 * Extrai salas da coluna "Sala" 
 * Input: "PVA234 PVA234" ou "PVA234PVA234"
 * Output: ["PVA234", "PVA234"]
 */
function parseRooms(roomText) {
  if (!roomText || roomText.trim() === '') {
    return [];
  }
  
  const text = roomText.trim();
  
  // Padrão: PVA seguido de 3 dígitos
  const pattern = /([A-Z]{3}\d{3})/g;
  const matches = text.match(pattern);
  
  if (matches && matches.length > 0) {
    return matches;
  }
  
  // Fallback: separar por espaços
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Scrape horários de um semestre específico
 */
async function scrapeSemestre(semestre, depto) {
  const url = `${CONFIG.baseUrl}?ano=${CONFIG.ano}&semestre=${semestre}&depto=${depto}`;
  
  console.log(`\n[Semestre ${semestre} - Depto ${depto}] Iniciando scraping...`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });

    const html = Buffer.from(response.data).toString('latin1');
    const $ = cheerio.load(html);
    
    const scheduleData = {};
    
    // Parse tabela HTML
    $('table tr').each((index, row) => {
      // Pula header
      if (index === 0) return;
      
      const cells = $(row).find('td');
      if (cells.length < 11) return;
      
      const codigo = $(cells[0]).text().trim();
      const tipo = $(cells[2]).text().trim();
      const turma = $(cells[3]).text().trim();
      // Extrair horários - note que podem vir em múltiplas linhas ou separados por espaços
      const horarioRaw = $(cells[4]).text().trim();
      const salaRaw = $(cells[5]).text().trim();
      const professor = $(cells[9]).text().trim();
      
      if (!codigo) return;
      
      const normalizedCode = normalizeCode(codigo);
      const key = `${normalizedCode}_${tipo}_${turma}`;
      
      scheduleData[key] = {
        codigo: normalizedCode,
        codigoOriginal: codigo,
        tipo,
        turma,
        horarios: parseSchedule(horarioRaw),
        salas: parseRooms(salaRaw),
        professor: professor === '?' ? '' : professor,
        semestre
      };
    });
    
    console.log(`[Semestre ${semestre} - Depto ${depto}] Coletadas ${Object.keys(scheduleData).length} turmas`);
    return scheduleData;
    
  } catch (error) {
    console.error(`[Semestre ${semestre} - Depto ${depto}] ERRO: ${error.message}`);
    return {};
  }
}

/**
 * Scrape ambos semestres e combina resultados para todos os departamentos
 */
export async function scrapeAllSchedules() {
  const deptos = getUniqueDepartments();
  console.log(`\nColetando horários dos semestres 1 e 2 para os departamentos: ${deptos.join(', ')}...\n`);
  const semestres = [1, 2];
  
  const promises = [];
  deptos.forEach(depto => {
    semestres.forEach(sem => {
      promises.push(
        scrapeSemestre(sem, depto).then(data => ({ depto, sem, data }))
      );
    });
  });
  
  const results = await Promise.all(promises);
  
  // Combinar resultados
  const combined = {};
  
  // Adicionar semestre 2 primeiro, depois semestre 1 (mantendo prioridade de semestre 1 se houver sobreposição de chaves)
  results.forEach(res => {
    if (res.sem === 2) {
      Object.assign(combined, res.data);
    }
  });
  results.forEach(res => {
    if (res.sem === 1) {
      Object.assign(combined, res.data);
    }
  });
  
  const totalTurmas = Object.keys(combined).length;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TOTAL: ${totalTurmas} turmas coletadas`);
  console.log('='.repeat(80));
  
  return combined;
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllSchedules().then(data => {
    console.log('\nAmostra dos dados coletados:');
    const sample = Object.entries(data).slice(0, 3);
    sample.forEach(([key, value]) => {
      console.log(`\n${key}:`);
      console.log(JSON.stringify(value, null, 2));
    });
  });
}
