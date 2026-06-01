import fs from 'fs';
import path from 'path';

// Carregar os dados do scraper
const rawData = fs.readFileSync('C:\\Users\\lucas\\Documents\\gradeon\\src\\data\\scrapedData.json', 'utf-8');
const data = JSON.parse(rawData);
const courseData = data.courseData;
const courseMetadata = data.metadata;
const fallbackGlobal = courseMetadata?.medianaGlobalReprovacao || 20.2;

// Mapear todas as disciplinas para busca rápida e limpar duplicatas
const disciplineMap = {};
Object.entries(courseData).forEach(([periodStr, list]) => {
  list.forEach(d => {
    if (!disciplineMap[d.CodDisciplina]) {
      const creds = parseInt(d.CargaSemanal.split('(')[0]);
      disciplineMap[d.CodDisciplina] = {
        ...d,
        credits: creds,
        reprova: d.reprovaPercentual !== null && d.reprovaPercentual !== undefined ? d.reprovaPercentual : fallbackGlobal
      };
    }
  });
});

// Mapeamento de dias da semana para o parser de horários
const DAY_MAP = {
  '2': 'SEG', '3': 'TER', '4': 'QUA', '5': 'QUI', '6': 'SEX',
};

// Parser de horários para detecção de conflitos de grade
function parseInterval(horario) {
  const parts = horario.split('=');
  if (parts.length !== 2) return null;
  const day = DAY_MAP[parts[0].trim()];
  if (!day) return null;
  const timeParts = parts[1].trim().split('-');
  if (timeParts.length !== 2) return null;
  
  const parseTimeToMinutes = (tStr) => {
    const p = tStr.trim().split(':');
    const h = parseInt(p[0]);
    const m = p.length > 1 ? parseInt(p[1]) : 0;
    return h * 60 + m;
  };
  
  return {
    day,
    start: parseTimeToMinutes(timeParts[0]),
    end: parseTimeToMinutes(timeParts[1] || timeParts[0])
  };
}

// Verifica se existe conflito de horário entre duas turmas (Correção de overlap)
function checkScheduleConflicts(selectedCodes) {
  const occupiedIntervals = [];
  const conflicts = [];
  
  selectedCodes.forEach(code => {
    const disc = disciplineMap[code];
    if (!disc) return;
    
    // Obter horários da Turma 1 (ou a primeira disponível)
    let horarios = [];
    if (disc.TurmasDisponiveis?.teoricas?.length > 0) {
      horarios = disc.TurmasDisponiveis.teoricas[0].horarios;
    } else if (disc.Horarios) {
      horarios = disc.Horarios.split('\n');
    }
    
    horarios.forEach(h => {
      const interval = parseInterval(h);
      if (!interval) return;
      
      // Checar sobreposição matemática exata: A < D && C < B
      const conflictingInterval = occupiedIntervals.find(occ => 
        occ.day === interval.day && interval.start < occ.end && occ.start < interval.end
      );
      
      if (conflictingInterval) {
        conflicts.push({
          disc1: conflictingInterval.code,
          disc2: code,
          day: interval.day,
          time1: conflictingInterval.timeLabel,
          time2: h.split('=')[1]
        });
      }
      
      occupiedIntervals.push({
        ...interval,
        timeLabel: h.split('=')[1],
        code
      });
    });
  });
  
  return conflicts;
}

// Função de cálculo de balanceamento de acordo com a lógica da Overview.tsx
function calculateGradeBalance(selectedCodes) {
  const selectedCards = selectedCodes.map(code => disciplineMap[code]).filter(Boolean);
  const numDisciplinas = selectedCards.length;
  
  if (numDisciplinas === 0) {
    return {
      totalCredits: 0,
      averageReprova: 0,
      classification: 'Vazio',
      score: 0,
      advice: 'Nenhuma disciplina selecionada.'
    };
  }
  
  const totalCredits = selectedCards.reduce((sum, card) => sum + card.credits, 0);
  const totalReprova = selectedCards.reduce((sum, card) => sum + card.reprova, 0);
  const averageReprova = totalReprova / numDisciplinas;
  
  // Identifica se é grade regular completa de um único período
  const firstPeriod = selectedCards[0]?.Periodo?.toString();
  const isSinglePeriod = selectedCards.every(c => c.Periodo?.toString() === firstPeriod);
  
  const periodDisciplines = firstPeriod ? (courseData[firstPeriod] || []) : [];
  const uniquePeriodDisciplines = periodDisciplines.filter((disc, idx, self) =>
    self.findIndex(d => d.NomeDisciplina === disc.NomeDisciplina) === idx
  );
  
  const isRegularGrid = isSinglePeriod && 
                        numDisciplinas === uniquePeriodDisciplines.length;

  let balanceamentoDaGrade = '';
  let classification = '';
  
  if (isRegularGrid) {
    classification = 'Grade Regular';
    balanceamentoDaGrade = 'N/A';
  } else if (numDisciplinas > 2 && numDisciplinas < 7) {
    const numTranquilas = selectedCards.filter(card => card.reprova < 15.0).length;
    const discount = 1 - numTranquilas * 0.04;
    balanceamentoDaGrade = ((totalCredits / 20) * (1 + averageReprova / 100)) * discount;
    
    if (balanceamentoDaGrade < 0.75) {
      classification = 'Carga Reduzida';
    } else if (balanceamentoDaGrade <= 1.25) {
      classification = 'Grade Balanceada';
    } else if (balanceamentoDaGrade <= 1.50) {
      classification = 'Carga Elevada';
    } else {
      classification = 'Sobrecarga Severa';
    }
    
    // Amortecimento de limite físico para 3 disciplinas
    if (numDisciplinas <= 3 && classification === 'Sobrecarga Severa') {
      classification = 'Carga Elevada';
    }
  } else if (numDisciplinas >= 7) {
    balanceamentoDaGrade = 'Desbalanceada';
    classification = 'Sobrecarga Severa';
  } else {
    // 1 ou 2 disciplinas
    classification = 'Carga Reduzida';
    balanceamentoDaGrade = 'N/A';
  }
  
  // Conselhos pedagógicos extraídos do modelo real
  let advice = '';
  if (classification === 'Grade Regular') {
    advice = 'Excelente escolha! Cursar as disciplinas prescritas para o período regular mantém o discente no fluxo recomendado pela instituição, reduzindo o risco de retenção acadêmica.';
  } else if (classification === 'Carga Reduzida') {
    advice = numDisciplinas < 3 
      ? 'Selecione pelo menos 3 disciplinas para que a análise matemática e pedagógica de esforço do semestre seja ativada de forma consistente.'
      : 'Semestre com demanda acadêmica reduzida, ideal para conciliar com estágios ou atividades extracurriculares. Para acelerar a progressão no curso, recomenda-se adicionar mais 1 disciplina.';
  } else if (classification === 'Grade Balanceada') {
    advice = 'Combinação ideal! A distribuição de disciplinas com diferentes perfis de retenção histórica atinge o ponto de equilíbrio perfeito (equivalente a 20 créditos padrão). Permite aprendizado sólido com ritmo de estudos saudável.';
  } else if (classification === 'Carga Elevada') {
    advice = 'Atenção! Carga acadêmica densa e exigente. Este semestre demandará alto nível de dedicação aos estudos. É recomendado intercalar componentes curriculares com maiores taxas de retenção com disciplinas amortecedoras para atenuar o desgaste.';
  } else if (classification === 'Sobrecarga Severa') {
    advice = 'Cuidado crítico! Risco elevado de trancamento e múltiplas reprovações. A combinação de alta carga horária com disciplinas de altíssima retenção acadêmica pode se tornar insustentável. Considere trocar disciplinas de alta retenção por disciplinas amortecedoras (com reprovação < 15%).';
  }
  
  return {
    totalCredits,
    averageReprova,
    classification,
    score: typeof balanceamentoDaGrade === 'number' ? balanceamentoDaGrade.toFixed(3) : balanceamentoDaGrade,
    isRegularGrid,
    advice
  };
}

// Definição dos Cenários de Cruzamento de Disciplinas (Sem pré-requisitos fictícios ou travas acadêmicas)
const scenarios = [
  {
    id: 1,
    title: 'Cenário 1: Caso Clássico - Grade Regular Completa (1º Período)',
    nameShort: '1 Grade Regular Completa (1º Período)',
    description: 'Filosofia do modelo: Respeita o fluxo institucional sugerido. O modelo define como "Grade Regular" e estimula o aluno a seguir o fluxo padrão.',
    codes: ['MAP 199', 'SIN 110', 'SIN 130', 'SIN 222']
  },
  {
    id: 2,
    title: 'Cenário 2: Filosofia do Modelo - Grade Perfeitamente Balanceada (Equilíbrio Dinâmico)',
    nameShort: '2 Grade Perfeitamente Balanceada',
    description: 'Um aluno reordenando sua grade cruza matérias pesadas pendentes do 1º período (Cálculo I e Lógica) com disciplinas amortecedoras de períodos posteriores que NÃO possuem conflito de horário. Combinação 100% válida e viável!',
    codes: ['MAP 199', 'SIN 130', 'SIN 101', 'SIN 421', 'SIN 143']
  },
  {
    id: 3,
    title: 'Cenário 3: Caso Clássico - Sobrecarga Física Extrema',
    nameShort: '3 Sobrecarga Física Extrema',
    description: 'Tentativa de cursar 7 disciplinas ao mesmo tempo, cruzando matérias do 1º e 2º períodos. O limite físico de disciplinas é estourado, classificando a grade como Sobrecarga Severa.',
    codes: ['MAP 199', 'SIN 110', 'SIN 130', 'SIN 222', 'ESP 105', 'MAP 298', 'SIN 101']
  },
  {
    id: 4,
    title: 'Cenário 4: Caso Clássico - Sobrecarga Cognitiva Real (Semestre da Morte)',
    nameShort: '4 Sobrecarga Cognitiva Real',
    description: 'Cruzamento de 5 disciplinas pesadíssimas e de alta retenção de períodos variados. O aluno pode se matricular, mas o GradeOn acusa risco severo de reprovação acumulada devido ao score elevado.',
    codes: ['MAP 298', 'SIN 211', 'SIN 132', 'SIN 141', 'SIN 251']
  },
  {
    id: 5,
    title: 'Cenário 5: Exceção do Modelo - Amortecimento por Baixo Volume',
    nameShort: '5 Amortecimento por Baixo Volume',
    description: 'Apenas 3 disciplinas muito difíceis. O modelo atenua o score matemático de sobrecarga pesada porque com apenas 3 disciplinas o aluno tem fôlego operacional (menos provas e laboratórios).',
    codes: ['MAP 199', 'SIN 110', 'SIN 132']
  },
  {
    id: 6,
    title: 'Cenário 6: Caso Clássico - Carga Reduzida (Semestre Leve)',
    nameShort: '6 Carga Reduzida (Semestre Leve)',
    description: 'Cruzamento focado em matérias de alta aprovação. Excelente para conciliação extracurricular.',
    codes: ['SIN 101', 'SIN 421', 'SIN 322']
  },
  {
    id: 7,
    title: 'Cenário 7: Exceção do Modelo - Volume Insuficiente para Análise',
    nameShort: '7 Volume Insuficiente para Análise',
    description: 'Apenas 2 disciplinas de entrada selecionadas. Sem dados curriculares suficientes para análise de correlação pedagógica.',
    codes: ['MAP 199', 'SIN 110']
  },
  {
    id: 8,
    title: 'Cenário 8: Filosofia do Modelo - Efeito Amortecedor (Inserção de Buffers)',
    nameShort: '8 Efeito Amortecedor (Inserção de Buffers)',
    description: 'Mostra como o planejamento inteligente mitiga o esforço. Substituímos matérias difíceis de uma grade pesada de 5 matérias por disciplinas amortecedoras (IHC e Lab Prog), mantendo o mesmo número de créditos mas reduzindo a sobrecarga.',
    codes: ['MAP 298', 'SIN 211', 'SIN 132', 'SIN 421', 'SIN 143']
  },
  {
    id: 9,
    title: 'Cenário 9: Exceção Operacional - Conflito de Horário Direto (Independentes)',
    nameShort: '9 Exceção Operacional (Conflito de Horário Direto)',
    description: 'Tentativa de cruzar matérias cujos horários de Turma 1 colidem exatamente na terça-feira no mesmo horário, impedindo a montagem física da grade.',
    codes: ['SIN 110', 'ADE 104', 'SIN 130']
  }
];

// Pré-calcular dados de todos os cenários para construir a tabela resumo de forma limpa
const evaluatedScenarios = scenarios.map(sc => {
  const result = calculateGradeBalance(sc.codes);
  const scheduleConflicts = checkScheduleConflicts(sc.codes);
  
  let status = 'Autorizada';
  if (scheduleConflicts.length > 0) {
    status = 'Bloqueada (Colisão Física)';
  } else if (sc.codes.length >= 7) {
    status = 'Bloqueada (Limite Físico)';
  }
  
  return {
    id: sc.id,
    nameShort: sc.nameShort,
    numDiscs: sc.codes.length,
    credits: result.totalCredits,
    classification: result.classification,
    score: result.score,
    status,
    result,
    scheduleConflicts,
    codes: sc.codes,
    description: sc.description,
    title: sc.title
  };
});

// Construir a tabela de texto no formato clássico solicitado
let summaryTable = `======================================================================================================================
                                         TABELA RESUMO DOS CENÁRIOS DE TESTE                                         
======================================================================================================================
Cenário                                               | Disc. | Créd. | Classificação (Score)     | Status de Matrícula
----------------------------------------------------------------------------------------------------------------------\n`;

evaluatedScenarios.forEach(esc => {
  const nameCol = esc.nameShort.padEnd(53, ' ');
  const discsCol = esc.numDiscs.toString().padStart(5, ' ');
  const creditsCol = esc.credits.toString().padStart(5, ' ');
  
  // Format score nicely with parentheses e.g. (1,321) or (N/A)
  let scoreFormatted = esc.score;
  if (typeof scoreFormatted === 'string' && !isNaN(parseFloat(scoreFormatted.replace(',', '.')))) {
    scoreFormatted = parseFloat(scoreFormatted.replace(',', '.')).toFixed(3).replace('.', ',');
  }
  const scoreLabel = `(${scoreFormatted})`;
  const classCol = `${esc.classification} ${scoreLabel}`.padEnd(25, ' ');
  
  const statusCol = esc.status.padEnd(25, ' ');
  
  summaryTable += `${nameCol} | ${discsCol} | ${creditsCol} | ${classCol} | ${statusCol}\n`;
});
summaryTable += `======================================================================================================================`;

// Gerar o conteúdo do arquivo TXT final
let output = `================================================================================
          GRADEON - RELATÓRIO DE TESTES DE CRUZAMENTO DE DISCIPLINAS          
================================================================================
Data de Execução: ${new Date().toLocaleString('pt-BR')}
Filosofia do Modelo: O GradeOn equilibra a carga acadêmica correlacionando créditos,
taxa de reprovação histórica e disciplinas amortecedoras (reprovação < 15%), 
respeitando o fluxo das grades regulares.

[RESTRIÇÃO DE ESCOPO]: A análise de colisões físicas de horários é realizada nesta
suíte para validar a montagem da grade simulada. O sistema é flexível e não 
aplica travas curriculares rígidas (como pré-requisitos bloqueantes) na interface 
do usuário, visto que o aluno pode solicitar quebras de pré-requisito e dispõe 
de total liberdade de montagem no portal.

--------------------------------------------------------------------------------
DADOS DE REFERÊNCIA DAS DISCIPLINAS CATALOGADAS (AMOSTRA):
${Object.values(disciplineMap).sort((a,b) => a.Periodo - b.Periodo).map(d => `   - ${d.CodDisciplina}: ${d.NomeDisciplina} (${d.credits} cr, Reprovação: ${d.reprova.toFixed(1)}%)`).join('\n')}

================================================================================
MATRIZ RESUMO DOS RESULTADOS DE CRUZAMENTO
================================================================================
${summaryTable}

================================================================================
EXECUÇÃO DETALHADA DOS CENÁRIOS DE TESTE
================================================================================\n\n`;

evaluatedScenarios.forEach(esc => {
  output += `────────────────────────────────────────────────────────────────────────────────
${esc.title.toUpperCase()}
────────────────────────────────────────────────────────────────────────────────
Descrição: ${esc.description}

Fórmula de Balanceamento Aplicada:
`;

  // Formatação solicitada pelo usuário: nome da disciplina (créditos, reprovação%) + ... = balanceamento
  const formulaParts = esc.codes.map(code => {
    const disc = disciplineMap[code];
    if (!disc) return `${code} (Desconhecida)`;
    return `${disc.NomeDisciplina} (${disc.credits} cr, ${disc.reprova.toFixed(1)}%)`;
  });
  
  const formattedFormula = formulaParts.join(' + \n  ');
  const resultString = ` = ${esc.classification} [Score: ${esc.score}]`;
  
  output += `  ${formattedFormula}\n  ${resultString}\n\n`;
  
  output += `STATUS DE VIABILIDADE CURRICULAR:
   • Total de Disciplinas: ${esc.numDiscs}
   • Carga Horária Total: ${esc.credits} créditos
   • Média Histórica de Retenção: ${esc.result.averageReprova.toFixed(2)}%
   • Disciplinas Amortecedoras (<15%): ${esc.codes.map(c => disciplineMap[c]).filter(d => d && d.reprova < 15.0).map(d => d.CodDisciplina).join(', ') || 'Nenhuma'}
   • Score de Esforço Pedagógico: ${esc.score}
   • Classificação Final: ${esc.classification}
   • Viabilidade Acadêmica (Matrícula): ${esc.status}

CONSELHO PEDAGÓGICO DO MODELO:
   » "${esc.result.advice}"

CONFLITOS DE HORÁRIO DETECTADOS (TURMA 1):
`;

  if (esc.scheduleConflicts.length > 0) {
    esc.scheduleConflicts.forEach(c => {
      output += `   [⚠️ COLISÃO FÍSICA] ${c.disc1} e ${c.disc2} colidem no dia (${c.day}) nos horários [${c.time1}] vs [${c.time2}].\n`;
    });
  } else {
    output += `   [✅ GRADE FÍSICA OK] Sem colisão de horários. Montagem operacional de grade autorizada.\n`;
  }
  
  output += `\n\n`;
});

output += `================================================================================
RESUMO GERAL DAS EXCEÇÕES E FILOSOFIA DE DESIGN VALIDADA
================================================================================
1. [FILOSOFIA] Grade Regular Completa: Prioriza o fluxo institucional recomendado (Grade Regular).
   Mesmo com alta taxa de reprovação, seguir a grade regular é o caminho recomendado pela instituição.

2. [EXCEÇÃO] Menos de 3 Disciplinas: Não ativam as fórmulas pedagógicas consistentes
   por volume de exames irrelevante, resultando diretamente em "Carga Reduzida".

3. [EXCEÇÃO] Amortecimento de 3 Disciplinas: Se apenas 3 matérias pesadas forem escolhidas, 
   o modelo rebaixa o score de "Sobrecarga Severa" para "Carga Elevada", visto que a carga
   de esforço diário de exames é operacionalmente viável por ter poucas disciplinas.

4. [EXCEÇÃO] Limite Físico de Disciplinas (7+): Acima de 7 disciplinas, independentemente 
   dos pesos ou pré-requisitos, a grade é cravada diretamente como "Sobrecarga Severa"
   devido ao limite biológico de carga de atividades.

5. [FILOSOFIA] Disciplinas Amortecedoras: Cada disciplina com reprovação < 15% 
   atua como alívio psicológico e cognitivo, concedendo um desconto cumulativo de 4% 
   (factor de 0.04) sobre o índice matemático de esforço total do semestre.
`;

const destPath = 'C:\\Users\\lucas\\Documents\\gradeon\\testes_cruzamento.txt';
fs.writeFileSync(destPath, output, 'utf-8');
console.log(`Relatório de cruzamento atualizado gerado com sucesso em: ${destPath}`);
