import { createInterface } from 'readline';
import { createReadStream, writeFileSync } from 'fs';
import * as path from 'path';

interface CSVObject {
  CodDisciplina: string;
  Tipo: string;
  Turma: string;
  Horarios: string;
  Sala: string;
  Periodo: number | string;
  NomeDisciplina: string;
  CargaSemanal: string;
  CargaTotal: number;
  Dependencias: string;
  Oferecida: string;
  CodDisc: string;
  Depen: string;
}

// Função para ler o arquivo CSV
const readCSVFile = async (filePath: string): Promise<string[]> => {
  return new Promise<string[]>((resolve, reject) => {
    const lines: string[] = [];
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    rl.on('line', (line: string) => {
      lines.push(line);
    });

    rl.on('close', () => {
      resolve(lines);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
};

// Função principal assíncrona
async function main() {
  // Caminho do arquivo CSV na pasta 'data' (em relação à pasta 'scripts')
  const filePath = path.join(__dirname, '../data/dados_2023-1.csv');
  const data = await readCSVFile(filePath);

  // Parse dos dados CSV para objetos
  const csvObjects: CSVObject[] = data.slice(1).map((line: string) => {
    const fields = line.split(',');
    return {
      CodDisciplina: fields[0],
      Tipo: fields[1],
      Turma: fields[2],
      Horarios: fields[3],
      Sala: fields[4],
      Periodo: isNaN(parseInt(fields[5])) ? fields[5] : parseInt(fields[5]),
      NomeDisciplina: fields[6],
      CargaSemanal: fields[7],
      CargaTotal: parseInt(fields[8]),
      Dependencias: fields[9],
      Oferecida: fields[10],
      CodDisc: fields[11],
      Depen: fields[12]
    };
  });

  // Agrupando disciplinas pelo atributo Periodo
  const disciplinasPorPeriodo: { [key: string]: CSVObject[] } = {};

  csvObjects.forEach((disciplina) => {
    const periodo = String(disciplina.Periodo);
    if (!disciplinasPorPeriodo[periodo]) {
      disciplinasPorPeriodo[periodo] = [];
    }
    disciplinasPorPeriodo[periodo].push(disciplina);
  });

  // Gerando o conteúdo do arquivo TypeScript (courseData.ts)
  const courseDataTS = `// Gerado automaticamente a partir do CSV\n\nexport const courseData = ${JSON.stringify(disciplinasPorPeriodo, null, 2)};`;

  // Caminho de saída para o arquivo courseData.ts
  const outputFilePath = path.join(__dirname, '../src/data/courseData1.ts');
  writeFileSync(outputFilePath, courseDataTS, 'utf-8');
  console.log('Arquivo courseData.ts gerado com sucesso!');
}

// Chamar a função principal
main();
