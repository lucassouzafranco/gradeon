/**
 * PRE-BUILD SCRAPING SCRIPT
 * Coleta o catálogo da UFV e os horários da DTI para todos os cursos e grava um JSON por curso
 * em src/data/cursos/<ANO>/<ID>.json, mais src/data/cursos/index.json com as combinações disponíveis.
 *
 * Uso: node scripts/prebuild-scrape.mjs [--force] [--curso=SIP,ADP] [--anos=2024,2025,2026]
 *   --force        ignora o cache de MAX_AGE_HOURS e raspa de novo
 *   --curso=A,B    raspa só os cursos indicados
 *   --horarios-ano=2026  consulta os dois semestres desse ano
 *   --horarios-only     atualiza os horários sem consultar novamente as matrizes
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, readFileSync, mkdirSync, readdirSync, renameSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeAllSchedules } from './dti-schedule-scraper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURACAO
// ════════════════════════════════════════════════════════════════════════════════
const arg = (nome, padrao) => process.argv.find(a => a.startsWith('--' + nome + '='))?.split('=')[1] ?? padrao;
const ANOS = arg('anos', '2024,2025,2026').split(',').map(Number);
const HORARIOS_ANO = Number(arg('horarios-ano', '2026'));
if (ANOS.some(a => !Number.isInteger(a) || a < 2000 || a > 2100) || !Number.isInteger(HORARIOS_ANO)) throw new Error('Anos inválidos');
const CONFIG = {
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
    ano: curso.ano, curso: curso.id, periodo: 1, complemento: curso.complemento, disciplina: cod,
  });
  const $ = cheerio.load(html);
  if (!$('#disciplina-ch').text().trim()) throw new Error('Detalhe de disciplina incompleto');

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
  const html = await fetchHtml({ ano: curso.ano, curso: curso.id, periodo, complemento: curso.complemento });
  const $ = cheerio.load(html);
  if (!$('#disciplinas').length || !$.text().includes(String(curso.ano))) throw new Error('Página de catálogo inválida');
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
    if (porPeriodo[p].length === 0) {
      if (periodos.some(n => n > p && porPeriodo[n].length)) throw new Error('Matriz com lacuna de períodos');
      break;
    }
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
    disc.Horarios = ''; disc.Sala = ''; disc.Oferecida = 'S';
    disc.TurmasDisponiveis = { teoricas: [], praticas: [] };
    const turmasT = todas.filter(s => s.codigo === disc.CodDisc && s.tipo === 'T');
    const turmasP = todas.filter(s => s.codigo === disc.CodDisc && s.tipo === 'P');
    if (turmasT.length === 0 && turmasP.length === 0) continue;
    // Primeira turma teórica como padrão para Horarios/Sala
    if (turmasT.length > 0) {
      disc.Horarios = turmasT[0].horarios.join('\n');
      disc.Sala = turmasT[0].salas.join('\n');
    }
    const mapear = t => ({ turma: t.turma, horarios: t.horarios, salas: t.salas, professor: t.professor, semestre: t.semestre });
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

function caminhoDoCurso(curso) { return join(OUT_DIR, String(curso.ano), curso.id + '.json'); }
function lerSalvo(curso) {
  try { const d = JSON.parse(readFileSync(caminhoDoCurso(curso), 'utf8')); return d.metadata.anoCatalogo === curso.ano && d.metadata.curso.id === curso.id ? d : null; } catch { return null; }
}
function gravarAtomico(arquivo, valor) {
  mkdirSync(dirname(arquivo), {recursive:true});
  writeFileSync(arquivo + '.tmp', JSON.stringify(valor, null, 2));
  renameSync(arquivo + '.tmp', arquivo);
}
function gravarIndice() {
  const entradas = [];
  for (const ano of readdirSync(OUT_DIR).filter(a => /^\d{4}$/.test(a)).sort().reverse()) {
    for (const curso of CURSOS) {
      const salvo = lerSalvo({...curso, ano:Number(ano)});
      if (!salvo) continue;
      entradas.push({id:curso.id, nome:curso.nome, anoCatalogo:Number(ano), periodos:salvo.metadata.periodos, totalDisciplinas:salvo.metadata.totalDisciplinas, totalOptativasOfertadas:salvo.metadata.totalOptativasOfertadas});
    }
  }
  gravarAtomico(join(OUT_DIR,'index.json'), {generatedAt:new Date().toISOString(), cursos:entradas});
}
async function main() {
  mkdirSync(OUT_DIR, {recursive:true});
  const filtro = arg('curso','').split(',').filter(Boolean);
  if (filtro.some(id => !CURSOS.some(c => c.id === id))) throw new Error('Curso desconhecido');
  const alvos = ANOS.flatMap(ano => CURSOS.filter(c => !filtro.length || filtro.includes(c.id)).map(c => ({...c,ano})));
  const novos = [];
  let falhas = 0;
  await mapLimit(alvos, 3, async curso => {
    const salvo = lerSalvo(curso);
    const idade = (Date.now() - Date.parse(salvo?.metadata.generatedAt ?? '')) / 36e5;
    if (!process.argv.includes('--force') && !process.argv.includes('--horarios-only') && idade < MAX_AGE_HOURS && salvo?.metadata.horarios?.ano === HORARIOS_ANO) return;
    try {
      if (process.argv.includes('--horarios-only') && !salvo) throw new Error('Matriz anterior inexistente');
      const dados = process.argv.includes('--horarios-only') ? {courseData:salvo.courseData,optativas:salvo.optativas} : await scrapeCurso(curso);
      if (!Object.keys(dados.courseData).length) throw new Error('Matriz vazia');
      novos.push({curso,dados});
    } catch (e) { falhas++; console.error('[CATALOGO]',curso.id,curso.ano,e.message,'Arquivo anterior preservado.'); }
  });
  if (novos.length) {
    const deptos = departamentosDe(novos.flatMap(({dados}) => [...Object.values(dados.courseData).flat(), ...dados.optativas]));
    // Os dois semestres são consultados para todas as matrizes; uma falha impede publicação parcial.
    const schedules = await scrapeAllSchedules(deptos, HORARIOS_ANO);
    for (const {curso,dados} of novos) {
      const obrigatorias = Object.values(dados.courseData).flat();
      integrarHorarios([...obrigatorias,...dados.optativas], schedules);
      const metadata = { generatedAt:new Date().toISOString(), ano:curso.ano, anoCatalogo:curso.ano,
        curso:{id:curso.id,nome:curso.nome}, campus:CONFIG.campus, complemento:curso.complemento,
        horarios:{ano:HORARIOS_ANO,semestres:[1,2]}, totalDisciplinas:obrigatorias.length, periodos:Object.keys(dados.courseData).length,
        totalOptativas:dados.optativas.length, totalOptativasOfertadas:dados.optativas.filter(d =>
          d.TurmasDisponiveis.teoricas.length || d.TurmasDisponiveis.praticas.length).length,
        source:'catalogo.ufv.br + dti.ufv.br' };
      gravarAtomico(caminhoDoCurso(curso), {metadata,...dados});
      console.log('[PUBLICADO]',curso.id,curso.ano,'horários',HORARIOS_ANO,obrigatorias.length);
    }
  }
  gravarIndice();
  if (falhas) process.exitCode = 1;
}
main().catch(e => {console.error(e); process.exitCode = 1;});
