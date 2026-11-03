/**
 * PRE-BUILD SCRAPING SCRIPT
 * Coleta o catálogo da UFV e os horários da DTI para todos os cursos e grava um JSON por curso
 * em src/data/cursos/<ID>.json, mais src/data/cursos/index.json com a lista de cursos.
 *
 * Uso: node scripts/prebuild-scrape.mjs [--force] [--curso=SIP,ADP]
 *   --force        ignora o cache de MAX_AGE_HOURS e raspa de novo
 *   --curso=A,B    raspa só os cursos indicados
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeAllSchedules } from './dti-schedule-scraper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURACAO
// ════════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  ano: 2026,
  campus: 'crp',
  baseUrl: 'https://www.catalogo.ufv.br',
};

/**
 * Cursos da UFV campus Rio Paranaíba. O `id` é o código que o catálogo usa na URL
 * (lista obtida em novo/ajax.php?campus=crp&categoria=curso&acao=index).
 * `complemento` distingue habilitações: bacharelados de Biologia e Química só respondem com BAC.
 */
const CURSOS = [
  { id: 'SIP', nome: 'Sistemas de Informação', complemento: '*' },
  { id: 'ADP', nome: 'Administração', complemento: '*' },
  { id: 'AGP', nome: 'Agronomia', complemento: '*' },
  { id: 'CBP', nome: 'Ciências Biológicas', complemento: 'BAC' },
  { id: 'CTP', nome: 'Ciências Contábeis', complemento: '*' },
  { id: 'CAP', nome: 'Ciência e Tecnologia de Alimentos', complemento: '*' },
  { id: 'ECP', nome: 'Engenharia Civil', complemento: '*' },
  { id: 'EPP', nome: 'Engenharia de Produção', complemento: '*' },
  { id: 'NTP', nome: 'Nutrição', complemento: '*' },
  { id: 'QMP', nome: 'Química', complemento: 'BAC' },
];

/** Até quantos períodos um curso pode ter; a leitura para no primeiro período vazio. */
const MAX_PERIODOS = 12;
/** Pedidos simultâneos ao catálogo somando todos os cursos: ganho de tempo sem sobrecarregar o servidor da UFV. */
const GLOBAL_CONCURRENCY = 4;
/** Dados com menos que isso de idade são reaproveitados; --force ignora o cache. */
const MAX_AGE_HOURS = Number(process.env.SCRAPE_MAX_AGE_HOURS ?? 24);
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'cursos');

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

// ════════════════════════════════════════════════════════════════════════════════
// INFRAESTRUTURA DE REDE
// ════════════════════════════════════════════════════════════════════════════════

/** Semáforo global: no máximo GLOBAL_CONCURRENCY pedidos em andamento ao mesmo tempo. */
let ativos = 0;
const fila = [];
function adquirir() {
  return new Promise(resolve => {
    const entrar = () => { ativos++; resolve(); };
    if (ativos < GLOBAL_CONCURRENCY) entrar();
    else fila.push(entrar);
  });
}
function liberar() {
  ativos--;
  const proximo = fila.shift();
  if (proximo) proximo();
}

/** Executa fn para cada item com no máximo `limit` execuções ao mesmo tempo. */
async function mapLimit(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

const dormir = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Baixa uma página do catálogo e devolve o HTML decodificado.
 * O catálogo serve ISO-8859-1; decodificar como UTF-8 quebra os acentos.
 * Tenta 3 vezes; depois disso lança o erro, para o chamador distinguir "página vazia" de "rede falhou".
 */
async function fetchHtml(params, tentativas = 3) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    await adquirir();
    try {
      const response = await axios.get(`${CONFIG.baseUrl}/interno.php`, {
        params: { ano: CONFIG.ano, campus: CONFIG.campus, ...params },
        headers: UA,
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data).toString('latin1');
    } catch (error) {
      if (tentativa === tentativas) throw error;
      await dormir(1000 * tentativa);
    } finally {
      liberar();
    }
  }
  throw new Error('inalcançável');
}

const normalizarCodigo = cod => cod.replace(/\s+/g, ' ').trim().toUpperCase();

// ════════════════════════════════════════════════════════════════════════════════
// FUNCOES DE SCRAPING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Busca detalhes de uma disciplina (créditos, pré-requisitos, dependentes) na página do curso.
 */
async function fetchDisciplineDetail(curso, cod) {
  const html = await fetchHtml({
    curso: curso.id, periodo: 1, complemento: curso.complemento, disciplina: cod,
  });
  const $ = cheerio.load(html);

  // Carga horária total (ex: "90 horas")
  let cargaTotal = 0;
  const horasMatch = $('#disciplina-horas').text().trim().match(/(\d+)\s*horas/i);
  if (horasMatch) cargaTotal = parseInt(horasMatch[1], 10);

  // Carga semanal / créditos (ex: "6(4+2)" ou "4(4-0)"); o primeiro número são os créditos
  const cargaSemanal = $('#disciplina-ch').text().trim();
  const creditMatch = cargaSemanal.match(/^(\d+)/);
  const creditos = creditMatch ? parseInt(creditMatch[1], 10) : 0;

  // Pré-requisitos: "MAP 191 ou MAP 195 ou MAP 199"
  const prerequisitos = [];
  for (const match of $('#disciplina-pre-requisito').text().trim().matchAll(/([A-Z]{3}\s*\d{3})/g)) {
    prerequisitos.push(normalizarCodigo(match[1]));
  }

  // Dependentes: disciplinas que exigem esta
  const dependentes = [];
  $('#disciplinas-dependentes ul.disciplinas-itens li a').each((_, link) => {
    const codeMatch = $(link).text().trim().match(/([A-Z]{3}\s*\d{3})/);
    if (codeMatch) dependentes.push(normalizarCodigo(codeMatch[1]));
  });

  return { cargaTotal, cargaSemanal, creditos, prerequisitos, dependentes };
}

/**
 * Lista as disciplinas de um período (0 = optativas) e completa cada uma com os detalhes.
 * Lança erro se a rede falhar; devolve [] só quando a página veio sem disciplinas.
 */
async function scrapePeriodo(curso, periodo) {
  const html = await fetchHtml({ curso: curso.id, periodo, complemento: curso.complemento });
  const $ = cheerio.load(html);
  const disciplinas = [];

  $('#disciplinas .bloco a').each((_, link) => {
    const codeMatch = $(link).text().trim().match(/^([A-Z]{3}\s*\d{3})/);
    if (!codeMatch) return;
    const cod = normalizarCodigo(codeMatch[1]);
    disciplinas.push({
      CodDisciplina: cod,
      NomeDisciplina: $(link).find('span').text().trim(),
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
      Dependentes: [],
    });
  });

  await mapLimit(disciplinas, GLOBAL_CONCURRENCY, async (disc) => {
    const details = await fetchDisciplineDetail(curso, disc.CodDisciplina);
    disc.CargaTotal = details.cargaTotal;
    disc.CargaSemanal = details.cargaSemanal;
    disc.Creditos = details.creditos;
    disc.Prerequisitos = details.prerequisitos;
    disc.Dependentes = details.dependentes;
    disc.Dependencias = details.prerequisitos.join(' | ');
  });

  console.log(`[${curso.id} p${periodo}] ${disciplinas.length} disciplinas`);
  return disciplinas;
}

/**
 * Coleta obrigatórias (períodos 1..N, descobrindo N) e optativas (período 0) de um curso.
 * Os períodos são pedidos em paralelo; a matriz termina no primeiro período vazio.
 */
async function scrapeCurso(curso) {
  const periodos = Array.from({ length: MAX_PERIODOS + 1 }, (_, i) => i); // 0..MAX
  const porPeriodo = {};
  await mapLimit(periodos, GLOBAL_CONCURRENCY, async (p) => {
    porPeriodo[p] = await scrapePeriodo(curso, p);
  });

  const courseData = {};
  for (let p = 1; p <= MAX_PERIODOS; p++) {
    if (porPeriodo[p].length === 0) break;
    courseData[String(p)] = porPeriodo[p];
  }
  return { courseData, optativas: porPeriodo[0] };
}

/**
 * Anexa as turmas teóricas (T) e práticas (P) da DTI a cada disciplina.
 * Retorna quantas disciplinas receberam pelo menos uma turma.
 */
function integrarHorarios(disciplinas, schedules) {
  let integrados = 0;
  const todas = Object.values(schedules);
  for (const disc of disciplinas) {
    const turmasT = todas.filter(s => s.codigo === disc.CodDisc && s.tipo === 'T');
    const turmasP = todas.filter(s => s.codigo === disc.CodDisc && s.tipo === 'P');
    if (turmasT.length === 0 && turmasP.length === 0) continue;
    // Primeira turma teórica como padrão para Horarios/Sala
    if (turmasT.length > 0) {
      disc.Horarios = turmasT[0].horarios.join('\n');
      disc.Sala = turmasT[0].salas.join('\n');
    }
    const mapear = t => ({ turma: t.turma, horarios: t.horarios, salas: t.salas, professor: t.professor });
    disc.TurmasDisponiveis = { teoricas: turmasT.map(mapear), praticas: turmasP.map(mapear) };
    integrados++;
  }
  return integrados;
}

function departamentosDe(disciplinas) {
  return Array.from(new Set(disciplinas.map(d => d.CodDisciplina.match(/^([A-Z]+)/)?.[1]).filter(Boolean)));
}

// ════════════════════════════════════════════════════════════════════════════════
// PERSISTENCIA
// ════════════════════════════════════════════════════════════════════════════════

function caminhoDoCurso(id) {
  return join(OUT_DIR, `${id}.json`);
}

function lerSalvo(id) {
  try {
    return JSON.parse(readFileSync(caminhoDoCurso(id), 'utf-8'));
  } catch {
    return null;
  }
}

function estaFresco(salvo) {
  const idade = (Date.now() - Date.parse(salvo?.metadata?.generatedAt ?? '')) / 36e5;
  return Number.isFinite(idade) && idade < MAX_AGE_HOURS && Array.isArray(salvo?.optativas);
}

function gravarIndice(entradas) {
  const index = {
    generatedAt: new Date().toISOString(),
    ano: CONFIG.ano,
    cursos: entradas,
  };
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();
  const force = process.argv.includes('--force');
  const filtro = process.argv.find(a => a.startsWith('--curso='))?.slice('--curso='.length).split(',').map(s => s.trim().toUpperCase());
  const alvo = filtro ? CURSOS.filter(c => filtro.includes(c.id)) : CURSOS;

  console.log('\n' + '='.repeat(80));
  console.log('GRADEON - PRE-BUILD SCRAPING');
  console.log('='.repeat(80));
  console.log(`Ano: ${CONFIG.ano} - Campus: ${CONFIG.campus} - Cursos: ${alvo.map(c => c.id).join(', ')}`);
  console.log('='.repeat(80) + '\n');

  mkdirSync(OUT_DIR, { recursive: true });

  // Fase 1: catálogo. Cursos com cache válido são reaproveitados.
  const resultados = {}; // id -> { courseData, optativas } | null (falhou)
  const pendentes = [];
  for (const curso of alvo) {
    const salvo = lerSalvo(curso.id);
    if (!force && salvo && estaFresco(salvo)) {
      console.log(`[${curso.id}] cache válido, scraping pulado (use --force para raspar de novo)`);
      resultados[curso.id] = { courseData: salvo.courseData, optativas: salvo.optativas, doCache: true };
    } else {
      pendentes.push(curso);
    }
  }

  await Promise.all(pendentes.map(async (curso) => {
    try {
      const dados = await scrapeCurso(curso);
      if (Object.keys(dados.courseData).length === 0) throw new Error('nenhum período com disciplinas');
      resultados[curso.id] = dados;
    } catch (error) {
      console.error(`[${curso.id}] ERRO: ${error.message}. Mantendo o arquivo anterior, se existir.`);
      resultados[curso.id] = null;
    }
  }));

  // Fase 2: horários da DTI, uma vez para a união dos departamentos de todos os cursos.
  const precisamHorario = pendentes.filter(c => resultados[c.id]);
  if (precisamHorario.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('FASE 2: HORÁRIOS DTI');
    console.log('='.repeat(80));
    const deptos = departamentosDe(precisamHorario.flatMap(c => {
      const r = resultados[c.id];
      return [...Object.values(r.courseData).flat(), ...r.optativas];
    }));
    const schedules = await scrapeAllSchedules(deptos);

    // Fase 3: integrar e gravar cada curso recém-coletado
    for (const curso of precisamHorario) {
      const r = resultados[curso.id];
      const obrigatorias = Object.values(r.courseData).flat();
      const integrados = integrarHorarios(obrigatorias, schedules) + integrarHorarios(r.optativas, schedules);
      const output = {
        metadata: {
          generatedAt: new Date().toISOString(),
          ano: CONFIG.ano,
          curso: { id: curso.id, nome: curso.nome },
          totalDisciplinas: obrigatorias.length,
          periodos: Object.keys(r.courseData).length,
          totalOptativas: r.optativas.length,
          totalOptativasOfertadas: r.optativas.filter(d => d.TurmasDisponiveis).length,
          source: 'prebuild-scraping',
        },
        courseData: r.courseData,
        optativas: r.optativas,
      };
      writeFileSync(caminhoDoCurso(curso.id), JSON.stringify(output, null, 2), 'utf-8');
      console.log(`[${curso.id}] gravado: ${obrigatorias.length} obrigatórias em ${output.metadata.periodos} períodos, ${output.metadata.totalOptativasOfertadas}/${r.optativas.length} optativas com turma, ${integrados} com horário`);
    }
  }

  // Índice: todos os cursos que têm arquivo gravado, na ordem de CURSOS.
  const entradas = [];
  for (const curso of CURSOS) {
    const salvo = lerSalvo(curso.id);
    if (!salvo) continue;
    entradas.push({
      id: curso.id,
      nome: curso.nome,
      periodos: salvo.metadata.periodos,
      totalDisciplinas: salvo.metadata.totalDisciplinas,
      totalOptativasOfertadas: salvo.metadata.totalOptativasOfertadas,
    });
  }
  gravarIndice(entradas);

  const falhas = alvo.filter(c => resultados[c.id] === null && !lerSalvo(c.id));
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(80));
  console.log(falhas.length ? `CONCLUIDO COM FALHAS: ${falhas.map(c => c.id).join(', ')} sem dados` : 'SCRAPING CONCLUIDO COM SUCESSO');
  console.log(`Cursos no índice: ${entradas.map(e => `${e.id}(${e.periodos}p)`).join(' ')}`);
  console.log(`Tempo total: ${duration}s`);
  console.log('='.repeat(80) + '\n');
  if (falhas.length) process.exit(1);
}

main().catch(error => {
  console.error('\nERRO FATAL:', error.message);
  process.exit(1);
});
