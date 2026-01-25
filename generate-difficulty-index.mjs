import fs from 'fs';

// Ler e parsear CSV
const csv = fs.readFileSync('src/data/historico-disciplina-filtered.csv', 'utf8');
const lines = csv.split('\n').filter(line => line.trim());
const header = lines[0].split(';');

// Mapear índices das colunas
const cols = {
  AnoOferta: header.indexOf('AnoOferta'),
  SemestreOferta: header.indexOf('SemestreOferta'),
  CodigoDisciplina: header.indexOf('CodigoDisciplina'),
  Disciplina: header.indexOf('Disciplina'),
  Curso: header.indexOf('Curso'),
  CargaHorariaDisciplina: header.indexOf('CargaHorariaDisciplina'),
  NumEstudantes: header.indexOf('NumEstudantes'),
  Aprovacoes: header.indexOf('Aprovacoes'),
  Reprovacoes: header.indexOf('Reprovacoes'),
  Abandonos: header.indexOf('Abandonos'),
  MediaNota: header.indexOf('MediaNota'),
  MenorNota: header.indexOf('MenorNota'),
  MaiorNota: header.indexOf('MaiorNota'),
  Notas0a10: header.indexOf('Notas0a10'),
  Notas10a20: header.indexOf('Notas10a20'),
  Notas20a30: header.indexOf('Notas20a30'),
  Notas30a40: header.indexOf('Notas30a40'),
  Notas40a50: header.indexOf('Notas40a50'),
  Notas50a60: header.indexOf('Notas50a60'),
  Notas60a70: header.indexOf('Notas60a70'),
  Notas70a80: header.indexOf('Notas70a80'),
  Notas80a90: header.indexOf('Notas80a90'),
  Notas90a100: header.indexOf('Notas90a100')
};

// Estrutura para agregar disciplinas
const disciplinas = new Map();

// Processar cada linha
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  const fields = line.split(';');
  
  const codigo = fields[cols.CodigoDisciplina]?.trim();
  const nome = fields[cols.Disciplina]?.trim();
  const key = `${codigo}|${nome}`;
  
  if (!disciplinas.has(key)) {
    disciplinas.set(key, {
      codigo_disciplina: codigo,
      disciplina: nome,
      carga_horaria: parseFloat(fields[cols.CargaHorariaDisciplina]) || 0,
      registros: [],
      anos: new Map()
    });
  }
  
  const disc = disciplinas.get(key);
  
  const ano = parseInt(fields[cols.AnoOferta]);
  const numEstudantes = parseInt(fields[cols.NumEstudantes]) || 0;
  const aprovacoes = parseInt(fields[cols.Aprovacoes]) || 0;
  const reprovacoes = parseInt(fields[cols.Reprovacoes]) || 0;
  const abandonos = parseInt(fields[cols.Abandonos]) || 0;
  const mediaNota = parseFloat(fields[cols.MediaNota]) || 0;
  const menorNota = parseFloat(fields[cols.MenorNota]) || 0;
  const maiorNota = parseFloat(fields[cols.MaiorNota]) || 0;
  
  const registro = {
    ano,
    numEstudantes,
    aprovacoes,
    reprovacoes,
    abandonos,
    mediaNota,
    menorNota,
    maiorNota,
    notas: {
      n0a10: parseInt(fields[cols.Notas0a10]) || 0,
      n10a20: parseInt(fields[cols.Notas10a20]) || 0,
      n20a30: parseInt(fields[cols.Notas20a30]) || 0,
      n30a40: parseInt(fields[cols.Notas30a40]) || 0,
      n40a50: parseInt(fields[cols.Notas40a50]) || 0,
      n50a60: parseInt(fields[cols.Notas50a60]) || 0,
      n60a70: parseInt(fields[cols.Notas60a70]) || 0,
      n70a80: parseInt(fields[cols.Notas70a80]) || 0,
      n80a90: parseInt(fields[cols.Notas80a90]) || 0,
      n90a100: parseInt(fields[cols.Notas90a100]) || 0
    }
  };
  
  disc.registros.push(registro);
  
  // Agregar por ano
  if (!disc.anos.has(ano)) {
    disc.anos.set(ano, {
      numEstudantes: 0,
      aprovacoes: 0,
      reprovacoes: 0,
      abandonos: 0,
      somaMediaPonderada: 0,
      menorNota: Infinity,
      maiorNota: -Infinity
    });
  }
  
  const anoData = disc.anos.get(ano);
  anoData.numEstudantes += numEstudantes;
  anoData.aprovacoes += aprovacoes;
  anoData.reprovacoes += reprovacoes;
  anoData.abandonos += abandonos;
  anoData.somaMediaPonderada += mediaNota * numEstudantes;
  if (menorNota > 0) anoData.menorNota = Math.min(anoData.menorNota, menorNota);
  anoData.maiorNota = Math.max(anoData.maiorNota, maiorNota);
}

// Processar e calcular indicadores
const disciplinasArray = [];
const taxasReprovacao = {};
const indicesDificuldade = {};

for (const [key, disc] of disciplinas) {
  // Agregação global
  let totalEstudantes = 0;
  let totalAprovacoes = 0;
  let totalReprovacoes = 0;
  let totalAbandonos = 0;
  let somaMediaPonderada = 0;
  let menorNotaGlobal = Infinity;
  let maiorNotaGlobal = -Infinity;
  
  const notasGlobais = {
    n0a10: 0, n10a20: 0, n20a30: 0, n30a40: 0, n40a50: 0,
    n50a60: 0, n60a70: 0, n70a80: 0, n80a90: 0, n90a100: 0
  };
  
  for (const reg of disc.registros) {
    totalEstudantes += reg.numEstudantes;
    totalAprovacoes += reg.aprovacoes;
    totalReprovacoes += reg.reprovacoes;
    totalAbandonos += reg.abandonos;
    somaMediaPonderada += reg.mediaNota * reg.numEstudantes;
    if (reg.menorNota > 0) menorNotaGlobal = Math.min(menorNotaGlobal, reg.menorNota);
    maiorNotaGlobal = Math.max(maiorNotaGlobal, reg.maiorNota);
    
    for (const faixa in reg.notas) {
      notasGlobais[faixa] += reg.notas[faixa];
    }
  }
  
  if (totalEstudantes === 0) continue;
  
  // Indicadores globais
  const TR = totalReprovacoes / totalEstudantes;
  const TA = totalAbandonos / totalEstudantes;
  const NM = somaMediaPonderada / totalEstudantes;
  const NM_d = 1 - (NM / 100);
  
  const notasBaixas = notasGlobais.n0a10 + notasGlobais.n10a20 + 
                      notasGlobais.n20a30 + notasGlobais.n30a40 + 
                      notasGlobais.n40a50 + notasGlobais.n50a60;
  const PNB = notasBaixas / totalEstudantes;
  
  // Calcular CH (consistência histórica)
  const taxasReprovacaoAnuais = [];
  const historicoAnual = {};
  
  for (const [ano, anoData] of disc.anos) {
    const trAno = anoData.numEstudantes > 0 ? 
      anoData.reprovacoes / anoData.numEstudantes : 0;
    taxasReprovacaoAnuais.push(trAno);
    
    const mediaNotaAno = anoData.numEstudantes > 0 ?
      anoData.somaMediaPonderada / anoData.numEstudantes : 0;
    
    historicoAnual[ano] = {
      num_estudantes: anoData.numEstudantes,
      aprovacoes: anoData.aprovacoes,
      reprovacoes: anoData.reprovacoes,
      abandonos: anoData.abandonos,
      media_nota_ponderada: Math.round(mediaNotaAno * 100) / 100,
      menor_nota: anoData.menorNota === Infinity ? 0 : anoData.menorNota,
      maior_nota: anoData.maiorNota,
      taxa_reprovacao: Math.round(trAno * 10000) / 10000,
      taxa_abandono: Math.round((anoData.abandonos / anoData.numEstudantes) * 10000) / 10000
    };
  }
  
  // Desvio padrão das taxas de reprovação anuais
  const mediaTR = taxasReprovacaoAnuais.reduce((a, b) => a + b, 0) / taxasReprovacaoAnuais.length;
  const variancia = taxasReprovacaoAnuais
    .map(tr => Math.pow(tr - mediaTR, 2))
    .reduce((a, b) => a + b, 0) / taxasReprovacaoAnuais.length;
  const desvioPadrao = Math.sqrt(variancia);
  
  const CH = 1 - Math.min(1, desvioPadrao / 0.25);
  
  // Calcular IDD
  const IDD = 0.35 * TR + 0.20 * TA + 0.20 * NM_d + 0.15 * PNB + 0.10 * CH;
  const IDD_normalizado = Math.min(1, Math.max(0, IDD));
  
  // Construir objeto da disciplina
  disciplinasArray.push({
    codigo_disciplina: disc.codigo_disciplina,
    disciplina: disc.disciplina,
    carga_horaria: disc.carga_horaria,
    dados_agregados: {
      total_estudantes: totalEstudantes,
      aprovacoes: totalAprovacoes,
      reprovacoes: totalReprovacoes,
      abandonos: totalAbandonos,
      media_nota_global: Math.round(NM * 100) / 100,
      menor_nota_global: menorNotaGlobal === Infinity ? 0 : menorNotaGlobal,
      maior_nota_global: maiorNotaGlobal
    },
    indicadores: {
      taxa_reprovacao: Math.round(TR * 10000) / 10000,
      taxa_abandono: Math.round(TA * 10000) / 10000,
      proporcao_notas_baixas: Math.round(PNB * 10000) / 10000,
      consistencia_historica: Math.round(CH * 10000) / 10000,
      indice_dificuldade: Math.round(IDD_normalizado * 10000) / 10000
    },
    historico_anual: historicoAnual,
    distribuicao_notas_global: notasGlobais
  });
  
  // Preencher endpoints
  taxasReprovacao[disc.codigo_disciplina] = Math.round(TR * 10000) / 10000;
  indicesDificuldade[disc.codigo_disciplina] = Math.round(IDD_normalizado * 10000) / 10000;
}

// Ordenar por código
disciplinasArray.sort((a, b) => a.codigo_disciplina.localeCompare(b.codigo_disciplina));

// Construir JSON final
const output = {
  metadata: {
    source: "historico-disciplina-filtered.csv",
    generated_at: new Date().toISOString(),
    total_disciplinas: disciplinasArray.length
  },
  endpoints: {
    "/disciplinas": disciplinasArray,
    "/disciplinas/{codigo}/taxa-reprovacao": taxasReprovacao,
    "/disciplinas/{codigo}/indice-dificuldade": indicesDificuldade
  }
};

// Salvar JSON
fs.writeFileSync(
  'src/data/disciplinas-indicadores.json',
  JSON.stringify(output, null, 2),
  'utf8'
);

console.log('✓ JSON gerado com sucesso!');
console.log(`  Total de disciplinas: ${disciplinasArray.length}`);
console.log(`  Arquivo salvo: src/data/disciplinas-indicadores.json`);
