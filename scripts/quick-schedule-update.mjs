import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllSchedules } from './dti-schedule-scraper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scrapedDataPath = join(__dirname, '..', 'src', 'data', 'scrapedData.json');

console.log('================================================================================');
console.log('GRADEON - QUICK OPERATIONAL SCHEDULE UPDATE');
console.log('================================================================================');
console.log('Loading existing curriculum structure...');
const data = JSON.parse(readFileSync(scrapedDataPath, 'utf8'));

console.log('Initiating real-time schedules scraping from DTI UFV...');
const schedules = await scrapeAllSchedules();

console.log('Integrating DTI schedules into course database...');
let integratedCount = 0;

for (const periodo of Object.keys(data.courseData)) {
  for (const disc of data.courseData[periodo]) {
    const normalizedCode = disc.CodDisc;
    
    // Find matching sections (Theory and Practice)
    const turmasT = Object.values(schedules).filter(s => 
      s.codigo === normalizedCode && s.tipo === 'T'
    );
    const turmasP = Object.values(schedules).filter(s => 
      s.codigo === normalizedCode && s.tipo === 'P'
    );
    
    // If sections were found, integrate schedules
    if (turmasT.length > 0 || turmasP.length > 0) {
      if (turmasT.length > 0) {
        disc.Horarios = turmasT[0].horarios.join('\n');
        disc.Sala = turmasT[0].salas.join('\n');
      } else if (turmasP.length > 0) {
        disc.Horarios = turmasP[0].horarios.join('\n');
        disc.Sala = turmasP[0].salas.join('\n');
      }
      
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
      
      integratedCount++;
      console.log(`✅ Integrated schedules for ${disc.CodDisciplina} (${disc.NomeDisciplina})`);
    } else {
      // Clean old schedules if no operational data is currently available
      // Note: TCC or extension activities may not have listed class slots
      delete disc.TurmasDisponiveis;
      disc.Horarios = '';
      disc.Sala = '';
    }
  }
}

data.metadata.generatedAt = new Date().toISOString();
data.metadata.source = 'unified-quick-scraping';

writeFileSync(scrapedDataPath, JSON.stringify(data, null, 2), 'utf8');

console.log('================================================================================');
console.log(`SUCCESS: Successfully updated schedules for ${integratedCount} disciplines.`);
console.log(`File updated: ${scrapedDataPath}`);
console.log('================================================================================\n');
