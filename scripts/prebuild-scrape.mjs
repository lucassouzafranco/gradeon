/**
 * PRE-BUILD SCRAPING SCRIPT
 * Executa scraping antes do build e salva resultado em JSON
 * Uso: node scripts/prebuild-scrape.mjs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeAllSchedules } from './dti-schedule-scraper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURACAO
// ════════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  ano: 2025,
  curso: 'SIP',  // UFV usa SIP para SIN
  campus: 'crp',
  baseUrl: 'https://www.catalogo.ufv.br'
};

console.log('\n' + '='.repeat(80));
console.log('GRADEON - PRE-BUILD SCRAPING');
console.log('='.repeat(80));
console.log(`Ano: ${CONFIG.ano}`);
console.log(`Curso: ${CONFIG.curso} - Campus: ${CONFIG.campus}`);
console.log('='.repeat(80) + '\n');

// ════════════════════════════════════════════════════════════════════════════════
// FUNCOES DE SCRAPING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Busca detalhes de uma disciplina específica (créditos, pré-requisitos, dependentes)
 */
async function fetchDisciplineDetail(cod) {
  const url = `${CONFIG.baseUrl}/interno.php?ano=${CONFIG.ano}&curso=${CONFIG.curso}&campus=${CONFIG.campus}&periodo=1&complemento=*&disciplina=${encodeURIComponent(cod)}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const html = Buffer.from(response.data).toString('latin1');
    const $ = cheerio.load(html);
    
    // Extrair carga horária total (ex: "90 horas")
    let cargaTotal = 0;
    const horasText = $('#disciplina-horas').text().trim();
    const horasMatch = horasText.match(/(\d+)\s*horas/i);
    if (horasMatch) {
      cargaTotal = parseInt(horasMatch[1], 10);
    }
    
    // Extrair carga semanal / créditos (ex: "6(4+2)" ou "4(4-0)")
    let cargaSemanal = '';
    let creditos = 0;
    const chText = $('#disciplina-ch').text().trim();
    if (chText) {
      cargaSemanal = chText;
      // Extrai o primeiro número como créditos
      const creditMatch = chText.match(/^(\d+)/);
      if (creditMatch) {
        creditos = parseInt(creditMatch[1], 10);
      }
    }
    
    // Extrair pré-requisitos do parágrafo #disciplina-pre-requisito
    // Formato: "MAP 191 ou MAP 195 ou MAP 199"
    const prerequisitos = [];
    const preReqText = $('#disciplina-pre-requisito').text().trim();
    if (preReqText) {
      // Extrai todos os códigos no formato "XXX NNN" ou "XXX NNN"
      const codeMatches = preReqText.matchAll(/([A-Z]{3}\s*\d{3})/g);
      for (const match of codeMatches) {
        prerequisitos.push(match[1].replace(/\s+/g, ' ').trim().toUpperCase());
      }
    }
    
    // Extrair dependentes (disciplinas que dependem desta)
    const dependentes = [];
    $('#disciplinas-dependentes ul.disciplinas-itens li a').each((_, link) => {
      const linkText = $(link).text().trim();
      const codeMatch = linkText.match(/([A-Z]{3}\s*\d{3})/);
      if (codeMatch) {
        dependentes.push(codeMatch[1].replace(/\s+/g, ' ').trim().toUpperCase());
      }
    });
    
    return { cargaTotal, cargaSemanal, creditos, prerequisitos, dependentes };
  } catch (error) {
    return { cargaTotal: 0, cargaSemanal: '', creditos: 0, prerequisitos: [], dependentes: [] };
  }
}

async function scrapePeriodo(periodo) {
  const url = `${CONFIG.baseUrl}/interno.php`;
  
  console.log(`[${periodo}] Iniciando scraping do período ${periodo}...`);
  
  try {
    const response = await axios.get(url, {
      params: {
        ano: CONFIG.ano,
        curso: CONFIG.curso,
        campus: CONFIG.campus,
        periodo: periodo,
        complemento: '*'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });

    // O catálogo frequentemente serve HTML em ISO-8859-1/Windows-1252.
    // Decodificar como UTF-8 quebra acentos (Ã§, Ã£, etc.).
    const html = Buffer.from(response.data).toString('latin1');
    const $ = cheerio.load(html);
    const disciplinas = [];
    
    // Parse catalog format (UFV)
    $('#disciplinas .bloco a').each((_, link) => {
      const linkText = $(link).text().trim();
      const codeMatch = linkText.match(/^([A-Z]{3}\s*\d{3})/);
      
      if (codeMatch) {
        const cod = codeMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
        const nome = $(link).find('span').text().trim();
        
        disciplinas.push({
          cod,  // Código temporário para buscar detalhes
          CodDisciplina: cod,
          NomeDisciplina: nome,
          Turma: '1',
          Horarios: '',
          Sala: '',
          Periodo: periodo,
          Tipo: 'T',
          CargaSemanal: '',
          CargaTotal: 0,
          Creditos: 0,
          Dependencias: '',
          Oferecida: 'S',
          CodDisc: cod.replace(/\s+/g, ''),
          Depen: '',
          Prerequisitos: [],
          Dependentes: []
        });
      }
    });
    
    // Buscar detalhes de cada disciplina (créditos, pré-requisitos, dependentes)
    console.log(`[${periodo}] Buscando detalhes de ${disciplinas.length} disciplinas...`);
    for (const disc of disciplinas) {
      const details = await fetchDisciplineDetail(disc.cod);
      disc.CargaTotal = details.cargaTotal;
      disc.CargaSemanal = details.cargaSemanal;
      disc.Creditos = details.creditos;
      disc.Prerequisitos = details.prerequisitos;
      disc.Dependentes = details.dependentes;
      disc.Dependencias = details.prerequisitos.join(' | ');
      delete disc.cod; // Remove campo temporário
      
      // Pequeno delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`[${periodo}] OK: ${disciplinas.length} disciplinas com detalhes`);
    return disciplinas;
    
  } catch (error) {
    console.error(`[${periodo}] ERRO: ${error.message}`);
    return [];
  }
}

async function scrapeAllPeriodos() {
  const periodos = [1, 2, 3, 4, 5, 6, 7, 8];  // UFV SIN tem 8 períodos
  const results = {};
  
  console.log('Fase 1/2: Scraping de todos os periodos\n');
  
  for (const periodo of periodos) {
    // Retry até 3 vezes em caso de falha
    let disciplinas = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      disciplinas = await scrapePeriodo(periodo);
      if (disciplinas.length > 0) break;
      if (attempt < 3) {
        console.log(`[${periodo}] Tentativa ${attempt + 1}/3...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    results[periodo.toString()] = disciplinas;
    
    // Pequeno delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// ════════════════════════════════════════════════════════════════════════════════
// SALVAR RESULTADO
// ════════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();
  
  try {
    // Fase 1: Scraping do catálogo UFV
    const courseData = await scrapeAllPeriodos();
    
    // Fase 2: Scraping dos horários DTI
    console.log('\n' + '='.repeat(80));
    console.log('FASE 2: HORÁRIOS DTI');
    console.log('='.repeat(80));
    const schedules = await scrapeAllSchedules();
    
    // Fase 3: Integrar horários com disciplinas
    console.log('\nFase 3/3: Integrando horários com disciplinas\n');
    let horariosIntegrados = 0;
    
    for (const periodo of Object.keys(courseData)) {
      for (const disc of courseData[periodo]) {
        const normalizedCode = disc.CodDisc;
        
        // Buscar turmas correspondentes (T e P)
        const turmasT = Object.values(schedules).filter(s => 
          s.codigo === normalizedCode && s.tipo === 'T'
        );
        const turmasP = Object.values(schedules).filter(s => 
          s.codigo === normalizedCode && s.tipo === 'P'
        );
        
        // Se encontrou turmas, adicionar horários
        if (turmasT.length > 0 || turmasP.length > 0) {
          // Usar primeira turma teórica como padrão para Horarios/Sala
          if (turmasT.length > 0) {
            disc.Horarios = turmasT[0].horarios.join('\n');
            disc.Sala = turmasT[0].salas.join('\n');
          }
          
          // Adicionar informações de todas as turmas
          disc.TurmasDisponiveis = {
            teoricas: turmasT.map(t => ({
              turma: t.turma,
              horarios: t.horarios,
              salas: t.salas,
              professor: t.professor
            })),
            praticas: turmasP.map(t => ({
              turma: t.turma,
              horarios: t.horarios,
              salas: t.salas,
              professor: t.professor
            }))
          };
          
          horariosIntegrados++;
        }
      }
    }
    
    console.log(`Horários integrados: ${horariosIntegrados} disciplinas`);
    console.log('\nFase 4/4: Salvando dados\n');
    
    const totalDisciplinas = Object.values(courseData).reduce(
      (acc, arr) => acc + arr.length, 
      0
    );
    
    const outputPath = join(__dirname, '..', 'src', 'data', 'scrapedData.json');
    const metadata = {
      generatedAt: new Date().toISOString(),
      ano: CONFIG.ano,
      totalDisciplinas,
      periodos: Object.keys(courseData).length,
      source: 'prebuild-scraping'
    };
    
    const output = {
      metadata,
      courseData
    };
    
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('='.repeat(80));
    console.log('SCRAPING CONCLUIDO COM SUCESSO');
    console.log('='.repeat(80));
    console.log(`Arquivo salvo: src/data/scrapedData.json`);
    console.log(`Total de disciplinas: ${totalDisciplinas}`);
    console.log(`Periodos processados: ${Object.keys(courseData).length}`);
    console.log(`Tempo total: ${duration}s`);
    console.log('='.repeat(80) + '\n');
    
    // Resumo por período
    console.log('Distribuicao por periodo:');
    Object.entries(courseData).forEach(([periodo, disciplinas]) => {
      console.log(`   Periodo ${periodo}: ${disciplinas.length} disciplinas`);
    });
    console.log();

    // Amostra de nomes com caracteres não-ASCII (acentos/ç/til)
    const all = Object.values(courseData).flat();
    const withAccents = all
      .map(d => d.NomeDisciplina)
      .filter(Boolean)
      .filter(name => /[^\x00-\x7F]/.test(name));

    if (withAccents.length > 0) {
      console.log('Amostra (verifique acentos):');
      withAccents.slice(0, 5).forEach(name => console.log(`   - ${name}`));
      console.log();
    }
    
  } catch (error) {
    console.error('\nERRO FATAL:', error.message);
    process.exit(1);
  }
}

main();
