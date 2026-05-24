import React, { useState, useMemo, useCallback } from 'react';
import './ScheduleBuilder.css';
import { Discipline, ClassSection } from '../../types/types';
import { courseData } from '../../data/courseData';
import { FaDownload, FaTrashAlt, FaMagic } from 'react-icons/fa';

interface ScheduleBuilderProps {
  selectedCards: Discipline[];
  onBack: () => void;
}

const DAY_MAP: Record<string, string> = {
  '2': 'SEG', '3': 'TER', '4': 'QUA', '5': 'QUI', '6': 'SEX',
};
const DAY_ORDER = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '19:00', '21:00'];

interface ParsedSlot { day: string; startTime: string; endTime: string; }

function parseHorario(horario: string): ParsedSlot | null {
  const parts = horario.split('=');
  if (parts.length !== 2) return null;
  const day = DAY_MAP[parts[0].trim()];
  if (!day) return null;
  const timeParts = parts[1].trim().split('-');
  if (timeParts.length !== 2) return null;
  const norm = (t: string) => t.includes(':') ? t : `${t.padStart(2, '0')}:00`;
  return { day, startTime: norm(timeParts[0]), endTime: norm(timeParts[1]) };
}

function getSlotIndex(startTime: string): number {
  const h = parseInt(startTime.split(':')[0]);
  if (h >= 8 && h < 10) return 0;
  if (h >= 10 && h < 12) return 1;
  if (h >= 12 && h < 14) return 2;
  if (h >= 14 && h < 16) return 3;
  if (h >= 16 && h < 19) return 4;
  if (h >= 19 && h < 21) return 5;
  if (h >= 21) return 6;
  return -1;
}

function compactHorario(horarios: string[]): string {
  return horarios.map(h => {
    const p = h.split('=');
    if (p.length !== 2) return h;
    const t = p[1].trim().split('-')[0];
    return `${p[0].trim()}-${t.includes(':') ? t.split(':')[0] : t}`;
  }).join(' ');
}

interface TurmaInfo { turma: string; horarios: string[]; salas: string[]; }
interface ScheduleEntry {
  codDisc: string; codDisciplina: string; nome: string;
  turma: string; sala: string; day: string;
  slotIndex: number; startTime: string; endTime: string;
}

function getTurmas(disc: Discipline): TurmaInfo[] {
  if (disc.TurmasDisponiveis) {
    const all = [...disc.TurmasDisponiveis.teoricas, ...disc.TurmasDisponiveis.praticas];
    if (all.length > 0) return all.map(s => ({ turma: s.turma, horarios: s.horarios, salas: s.salas }));
  }
  const pd = courseData[disc.Periodo.toString()] || [];
  const at = pd.filter(d => d.CodDisciplina === disc.CodDisciplina && d.Tipo === 'T');
  if (at.length > 0) return at.map(t => ({ turma: t.Turma, horarios: t.Horarios ? t.Horarios.split('\n') : [], salas: t.Sala ? t.Sala.split('\n') : [] }));
  if (disc.Horarios) return [{ turma: disc.Turma || '1', horarios: disc.Horarios.split('\n'), salas: disc.Sala ? disc.Sala.split('\n') : [] }];
  return [];
}

interface DragPayload { codDisciplina: string; turma: string; }

const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({ selectedCards, onBack }) => {
  const [selectedTurmas, setSelectedTurmas] = useState<Record<string, string>>({});

  const [dragOver, setDragOver] = useState(false);
  const [draggedTurma, setDraggedTurma] = useState<{
    codDisciplina: string;
    turma: string;
    slots: ParsedSlot[];
  } | null>(null);

  const turmaData = useMemo(() =>
    selectedCards.map(disc => ({ disc, turmas: getTurmas(disc) })),
    [selectedCards]
  );

  const scheduleEntries = useMemo(() => {
    const entries: ScheduleEntry[] = [];
    selectedCards.forEach(disc => {
      const sel = selectedTurmas[disc.CodDisciplina];
      if (!sel) return;
      const turma = getTurmas(disc).find(t => t.turma === sel);
      if (!turma) return;
      turma.horarios.forEach((h, i) => {
        const p = parseHorario(h);
        if (!p) return;
        const si = getSlotIndex(p.startTime);
        if (si === -1) return;
        entries.push({ codDisc: disc.CodDisc, codDisciplina: disc.CodDisciplina, nome: disc.NomeDisciplina, turma: sel, sala: turma.salas[i] || '', day: p.day, slotIndex: si, startTime: p.startTime, endTime: p.endTime });
      });
    });
    return entries;
  }, [selectedCards, selectedTurmas]);

  const conflicts = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    scheduleEntries.forEach(e => { const k = `${e.day}-${e.slotIndex}`; if (!map.has(k)) map.set(k, []); map.get(k)!.push(e); });
    const cks = new Set<string>();
    map.forEach((v, k) => { if (v.length > 1) cks.add(k); });
    return cks;
  }, [scheduleEntries]);

  const handleDragStart = useCallback((e: React.DragEvent, codDisciplina: string, turma: string, horarios: string[]) => {
    const parsedSlots: ParsedSlot[] = [];
    horarios.forEach(h => {
      const p = parseHorario(h);
      if (p) parsedSlots.push(p);
    });
    const payload: DragPayload = { codDisciplina, turma };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTurma({ codDisciplina, turma, slots: parsedSlots });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTurma(null);
    setDragOver(false);
  }, []);

  const handleGridDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleGridDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleGridDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDraggedTurma(null);
    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'));
      setSelectedTurmas(prev => ({ ...prev, [payload.codDisciplina]: payload.turma }));
    } catch { }
  }, []);

  const handleTurmaSelect = (codDisciplina: string, turma: string) => {
    setSelectedTurmas(prev => ({ ...prev, [codDisciplina]: turma }));
  };

  const handleRemoveFromGrid = (codDisciplina: string) => {
    setSelectedTurmas(prev => {
      const next = { ...prev };
      delete next[codDisciplina];
      return next;
    });
  };

  const handleConflictClick = (entries: ScheduleEntry[]) => {
    setSelectedTurmas(prev => {
      const next = { ...prev };
      entries.forEach(e => delete next[e.codDisciplina]);
      return next;
    });
  };

  const handleExportPDF = () => {
    // Filtra e prepara as disciplinas selecionadas para a grade do PDF
    const selectedList = selectedCards
      .filter(d => d.CodDisciplina in selectedTurmas)
      .map(d => {
        const tSel = selectedTurmas[d.CodDisciplina];
        const turmas = getTurmas(d);
        const activeT = turmas.find(t => t.turma === tSel);
        return {
          cod: d.CodDisc || d.CodDisciplina,
          nome: d.NomeDisciplina,
          turma: tSel,
          creditos: d.Creditos || 4,
          sala: activeT ? activeT.salas.join(', ') : '-'
        };
      });

    const totalCredits = selectedList.reduce((acc, curr) => acc + curr.creditos, 0);

    const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'];
    const timeLabels: Record<string, string> = {
      '08:00': '08:00 - 09:40',
      '10:00': '10:00 - 11:40',
      '12:00': '12:00 - 13:40',
      '14:00': '14:00 - 15:40',
      '16:00': '16:00 - 17:40',
      '19:00': '19:00 - 20:40',
      '21:00': '21:00 - 22:40'
    };

    let tableRowsHtml = '';
    TIME_SLOTS.forEach((time, slotIdx) => {
      let rowHtml = `<tr><td class="time-col">${timeLabels[time] || time}</td>`;
      days.forEach(day => {
        const cellEntries = getEntriesForCell(day, slotIdx);
        if (cellEntries.length > 0) {
          const content = cellEntries.map(e => `
            <div class="grid-cell-item">
              <div class="cell-code">${e.codDisc}</div>
              <div class="cell-sala">${e.sala}</div>
            </div>
          `).join('');
          rowHtml += `<td class="slot-cell filled">${content}</td>`;
        } else {
          rowHtml += `<td class="slot-cell"></td>`;
        }
      });
      rowHtml += '</tr>';
      tableRowsHtml += rowHtml;
    });

    const disciplineRowsHtml = selectedList.map(item => `
      <tr>
        <td>${item.cod} - ${item.nome}</td>
        <td style="text-align: center;">${item.creditos}</td>
        <td style="text-align: center;">T${item.turma}</td>
        <td style="text-align: center;">${item.sala}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para exportar o PDF!');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Grade de Horários - GRADEON</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 25px;
            color: #111;
            background-color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #0c3c60;
            letter-spacing: 1px;
            text-transform: uppercase;
            font-weight: 800;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 13px;
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 13px;
          }
          th, td {
            border: 1px solid #777;
            padding: 8px 10px;
          }
          th {
            background-color: #e6e6e6;
            font-weight: bold;
            color: #111;
          }
          .disc-table th {
            text-align: left;
          }
          .total-row {
            font-weight: bold;
            background-color: #f2f2f2;
          }
          
          .grid-title-row {
            background-color: #cccccc;
            font-weight: bold;
            text-align: center;
            font-size: 14px;
            letter-spacing: 1px;
            color: #111;
            padding: 6px;
          }
          .day-header {
            color: #0c3c60;
            font-weight: bold;
            text-align: center;
            width: 17%;
          }
          .time-col {
            font-weight: bold;
            color: #0c3c60;
            text-align: center;
            width: 15%;
            background-color: #f9f9f9;
          }
          .slot-cell {
            text-align: center;
            height: 48px;
            vertical-align: middle;
          }
          .slot-cell.filled {
            background-color: #fafafa;
          }
          .grid-cell-item {
            padding: 2px 0;
          }
          .cell-code {
            font-weight: bold;
            font-size: 12px;
            color: #111;
          }
          .cell-sala {
            font-size: 11px;
            color: #555;
            margin-top: 1px;
          }

          @media print {
            body {
              margin: 15px;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Grade Horária Acadêmica</h1>
          <p>Gerado pelo GRADEON em ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <table class="disc-table">
          <thead>
            <tr>
              <th>Disciplina</th>
              <th style="width: 120px; text-align: center;">Créditos</th>
              <th style="width: 100px; text-align: center;">Turma</th>
              <th style="width: 150px; text-align: center;">Sala</th>
            </tr>
          </thead>
          <tbody>
            ${disciplineRowsHtml || '<tr><td colspan="4" style="text-align: center; color: #777;">Nenhuma disciplina selecionada</td></tr>'}
            <tr class="total-row">
              <td>Total de Créditos</td>
              <td style="text-align: center;">${totalCredits}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th colspan="6" class="grid-title-row">Horário de Aulas</th>
            </tr>
            <tr>
              <th style="width: 15%;">Horário</th>
              <th class="day-header">Segunda</th>
              <th class="day-header">Terça</th>
              <th class="day-header">Quarta</th>
              <th class="day-header">Quinta</th>
              <th class="day-header">Sexta</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="text-align: center; margin-top: 30px;" class="no-print">
          <button onclick="window.print()" style="padding: 12px 24px; background-color: #0c3c60; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">Imprimir / Salvar como PDF</button>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleClear = () => {
    setSelectedTurmas({});
  };

  const handleRandomGenerate = useCallback(() => {
    if (selectedCards.length === 0) return;

    const findConflictFreeConfig = (
      index: number,
      currentAssignment: Record<string, string>,
      occupiedSlots: Set<string>
    ): Record<string, string> | null => {
      if (index === selectedCards.length) {
        return currentAssignment;
      }

      const disc = selectedCards[index];
      const turmas = getTurmas(disc);
      if (turmas.length === 0) {
        return findConflictFreeConfig(index + 1, currentAssignment, occupiedSlots);
      }

      const shuffledTurmas = [...turmas].sort(() => Math.random() - 0.5);

      for (const t of shuffledTurmas) {
        const slots: ParsedSlot[] = [];
        let conflictDetected = false;

        for (const h of t.horarios) {
          const p = parseHorario(h);
          if (p) {
            slots.push(p);
            const slotKey = `${p.day}-${getSlotIndex(p.startTime)}`;
            if (occupiedSlots.has(slotKey)) {
              conflictDetected = true;
              break;
            }
          }
        }

        if (!conflictDetected) {
          const nextOccupied = new Set(occupiedSlots);
          slots.forEach(p => {
            nextOccupied.add(`${p.day}-${getSlotIndex(p.startTime)}`);
          });

          const nextAssignment = { ...currentAssignment, [disc.CodDisciplina]: t.turma };
          const result = findConflictFreeConfig(index + 1, nextAssignment, nextOccupied);
          if (result) return result;
        }
      }

      return null;
    };

    const solution = findConflictFreeConfig(0, {}, new Set<string>());

    if (solution) {
      setSelectedTurmas(solution);
    } else {
      const fallback: Record<string, string> = {};
      selectedCards.forEach(d => {
        const t = getTurmas(d);
        if (t.length > 0) {
          const randomTurma = t[Math.floor(Math.random() * t.length)];
          fallback[d.CodDisciplina] = randomTurma.turma;
        }
      });
      setSelectedTurmas(fallback);
      alert("Aviso: Não foi possível encontrar uma combinação 100% sem conflitos. Gerando configuração com conflito mínimo.");
    }
  }, [selectedCards]);

  const getEntriesForCell = (day: string, slotIndex: number): ScheduleEntry[] =>
    scheduleEntries.filter(e => e.day === day && e.slotIndex === slotIndex);

  const t1Cards = turmaData.map(({ disc, turmas }) => ({ disc, turma: turmas.find(t => t.turma === '1') || null }));
  const t2Cards = turmaData.map(({ disc, turmas }) => ({ disc, turma: turmas.find(t => t.turma === '2') || null }));

  return (
    <div className="scheduleBuilderWrapper">
      <div className="scheduleMainContent">
        <div className="panelLeft">
          <div className="panelHeaderTitle">TURMAS</div>
          <div className="panelLeftGrid">
            <div className="turmaColumn">
              <div className="turmaColumnTitle">T1</div>
              {t1Cards.map(({ disc, turma }) => {
                if (!turma) return <div key={disc.CodDisciplina} className="turmaCardEmpty" />;
                const isPlaced = disc.CodDisciplina in selectedTurmas;
                if (isPlaced) return <div key={disc.CodDisciplina} className="turmaCardEmpty" />;
                return (
                  <div
                    key={disc.CodDisciplina}
                    className="turmaCard"
                    draggable
                    onDragStart={(e) => handleDragStart(e, disc.CodDisciplina, turma.turma, turma.horarios)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleTurmaSelect(disc.CodDisciplina, turma.turma)}
                  >
                    <div className="turmaCardName">{disc.NomeDisciplina}</div>
                    <div className="turmaCardSchedule">{compactHorario(turma.horarios)}</div>
                  </div>
                );
              })}
            </div>

            <div className="turmaColumn">
              <div className="turmaColumnTitle">T2</div>
              {t2Cards.map(({ disc, turma }) => {
                if (!turma) return <div key={disc.CodDisciplina} className="turmaCardEmpty" />;
                const isPlaced = disc.CodDisciplina in selectedTurmas;
                if (isPlaced) return <div key={disc.CodDisciplina} className="turmaCardEmpty" />;
                return (
                  <div
                    key={disc.CodDisciplina}
                    className="turmaCard"
                    draggable
                    onDragStart={(e) => handleDragStart(e, disc.CodDisciplina, turma.turma, turma.horarios)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleTurmaSelect(disc.CodDisciplina, turma.turma)}
                  >
                    <div className="turmaCardName">{disc.NomeDisciplina}</div>
                    <div className="turmaCardSchedule">{compactHorario(turma.horarios)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`panelRight ${dragOver ? 'gridDragOver' : ''}`}
          onDragOver={handleGridDragOver}
          onDragLeave={handleGridDragLeave}
          onDrop={handleGridDrop}
        >
          <div className="panelHeaderTitle">HORÁRIO DE AULAS</div>
          <div className="gridHeader">
            <div className="gridHeaderCorner" />
            {DAY_ORDER.map(day => (
              <div key={day} className="gridDayHeader">{day}</div>
            ))}
          </div>

          <div className="gridBody">
            <div className="gridTimeColumn">
              {TIME_SLOTS.map(time => (
                <div key={time} className="gridTimeLabel">{time}</div>
              ))}
            </div>

            {DAY_ORDER.map(day => (
              <div key={day} className="gridDayColumn">
                {TIME_SLOTS.map((_, slotIdx) => {
                  const entries = getEntriesForCell(day, slotIdx);
                  const hasConflict = conflicts.has(`${day}-${slotIdx}`);
                  
                  const isPreviewed = draggedTurma?.slots.some(
                    s => s.day === day && getSlotIndex(s.startTime) === slotIdx
                  );
                  
                  const willConflict = isPreviewed && scheduleEntries.some(
                    e => e.day === day && e.slotIndex === slotIdx && e.codDisciplina !== draggedTurma?.codDisciplina
                  );

                  return (
                    <div 
                      key={slotIdx} 
                      className={`gridSlot ${isPreviewed ? 'slotPreviewActive' : ''}`}
                    >
                      {hasConflict ? (
                        <div className="gridEntry entrySelected entryConflict" onClick={() => handleConflictClick(entries)} style={{ cursor: 'pointer' }}>
                          <div className="entryCode" style={{ fontSize: '75%', lineHeight: 1.1 }}>
                            {entries.map(e => e.codDisc).join(' + ')}
                          </div>
                          <div className="entrySala" style={{ color: '#ff4444', fontWeight: 'bold' }}>⚠️ CONFLITO</div>
                        </div>
                      ) : isPreviewed ? (
                        <div className={`gridEntryPreview ${willConflict ? 'conflictPreview' : ''}`}>
                          <div className="previewCode" style={{ fontSize: '80%', fontWeight: 'bold' }}>
                            {draggedTurma?.codDisciplina ? selectedCards.find(c => c.CodDisciplina === draggedTurma.codDisciplina)?.CodDisc : ''}
                          </div>
                          <div className="previewStatus" style={{ fontSize: '65%', color: willConflict ? '#ff4444' : '#e8a44a', fontWeight: 'bold', marginTop: '2px' }}>
                            {willConflict ? '⚠️ CONFLITO' : 'PRÉVIA'}
                          </div>
                        </div>
                      ) : (
                        entries.map((entry, i) => (
                          <div key={i} className="gridEntry entrySelected" onClick={() => handleRemoveFromGrid(entry.codDisciplina)} style={{ cursor: 'pointer' }}>
                            <div className="entryCode">{entry.codDisc}</div>
                            <div className="entrySala">{entry.sala}</div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="scheduleFooter">
        <button className="clearButton" onClick={handleClear}>
          <FaTrashAlt /> LIMPAR GRADE
        </button>
        <button className="exportButton" onClick={handleExportPDF}>
          <FaDownload /> EXPORTAR GRADE
        </button>
        <button className="generateButton" onClick={handleRandomGenerate}>
          <FaMagic /> GERAR ALEATÓRIO
        </button>
      </div>
    </div>
  );
};

export default ScheduleBuilder;
