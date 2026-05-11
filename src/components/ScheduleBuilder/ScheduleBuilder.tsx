import React, { useState, useMemo, useCallback } from 'react';
import './ScheduleBuilder.css';
import { Discipline, ClassSection } from '../../types/types';
import { courseData } from '../../data/courseData';
import { FaDownload, FaTrashAlt } from 'react-icons/fa';

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
  const [selectedTurmas, setSelectedTurmas] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    selectedCards.forEach(d => { const t = getTurmas(d); if (t.length > 0) init[d.CodDisciplina] = t[0].turma; });
    return init;
  });

  const [dragOver, setDragOver] = useState(false);

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

  const handleDragStart = useCallback((e: React.DragEvent, codDisciplina: string, turma: string) => {
    const payload: DragPayload = { codDisciplina, turma };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
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
    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData('application/json'));
      setSelectedTurmas(prev => ({ ...prev, [payload.codDisciplina]: payload.turma }));
    } catch { }
  }, []);

  const handleTurmaSelect = (codDisciplina: string, turma: string) => {
    setSelectedTurmas(prev => ({ ...prev, [codDisciplina]: turma }));
  };

  const handleClear = () => {
    setSelectedTurmas({});
  };

  const getEntriesForCell = (day: string, slotIndex: number): ScheduleEntry[] =>
    scheduleEntries.filter(e => e.day === day && e.slotIndex === slotIndex);

  const t1Cards = turmaData.map(({ disc, turma }) => ({ disc, turma: turmas.find(t => t.turma === '1') || null }));
  const t2Cards = turmaData.map(({ disc, turma }) => ({ disc, turma: turmas.find(t => t.turma === '2') || null }));

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
                const isActive = selectedTurmas[disc.CodDisciplina] === turma.turma;
                return (
                  <div
                    key={disc.CodDisciplina}
                    className={`turmaCard ${isActive ? 'turmaCardActive' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, disc.CodDisciplina, turma.turma)}
                    onClick={() => handleTurmaSelect(disc.CodDisciplina, turma.turma)}
                  >
                    <div className="turmaCardCode">{disc.CodDisc}</div>
                    <div className="turmaCardSchedule">{compactHorario(turma.horarios)}</div>
                  </div>
                );
              })}
            </div>

            <div className="turmaColumn">
              <div className="turmaColumnTitle">T2</div>
              {t2Cards.map(({ disc, turma }) => {
                if (!turma) return <div key={disc.CodDisciplina} className="turmaCardEmpty" />;
                const isActive = selectedTurmas[disc.CodDisciplina] === turma.turma;
                return (
                  <div
                    key={disc.CodDisciplina}
                    className={`turmaCard ${isActive ? 'turmaCardActive' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, disc.CodDisciplina, turma.turma)}
                    onClick={() => handleTurmaSelect(disc.CodDisciplina, turma.turma)}
                  >
                    <div className="turmaCardCode">{disc.CodDisc}</div>
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
                  return (
                    <div key={slotIdx} className="gridSlot">
                      {entries.map((entry, i) => (
                        <div key={i} className={`gridEntry entrySelected ${hasConflict ? 'entryConflict' : ''}`}>
                          <div className="entryCode">{entry.codDisc}</div>
                          <div className="entrySala">{entry.sala}</div>
                        </div>
                      ))}
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
        <button className="exportButton">
          <FaDownload /> EXPORTAR GRADE
        </button>
      </div>
    </div>
  );
};

export default ScheduleBuilder;
