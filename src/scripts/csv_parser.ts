import { createInterface } from 'readline';
import { createReadStream } from 'fs';

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

// Função para solicitar o upload de um arquivo
async function uploadFile(): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise<string>(resolve => {
		rl.question('Por favor, insira o caminho do arquivo CSV: ', filePath => {
			rl.close();
			resolve(filePath);
		});
	});
}

// Função principal assíncrona
async function main() {
	const filePath = await uploadFile();
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
			CargaSemanal: fields[7].charAt(0),
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
		// Verificando se o período é do tipo number
		if (typeof disciplina.Periodo !== 'number') {
			if (!disciplinasPorPeriodo["Outras"]) {
				disciplinasPorPeriodo["Outras"] = [];
			}
			disciplinasPorPeriodo["Outras"].push(disciplina);
		} else {
			// Caso contrário, agrupar pelo período
			const periodo = String(disciplina.Periodo);
			if (!disciplinasPorPeriodo[periodo]) {
				disciplinasPorPeriodo[periodo] = [];
			}
			disciplinasPorPeriodo[periodo].push(disciplina);
		}
	});

	// Exibindo as disciplinas agrupadas
	console.log(disciplinasPorPeriodo);
}

// Chamar a função principal
main();
