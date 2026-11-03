import React, { useLayoutEffect, useRef, useState } from 'react';
import { Discipline } from '../../types/types';
import './OptativasViews.css';

/**
 * Painel de optativas aberto pelo botão "Ver Optativas".
 * Usa as mesmas classes de cartão da matriz (disciplineCard, hovered, selected) e o mesmo hover/clique,
 * para que optativas e obrigatórias pareçam e funcionem igual.
 */
export interface OptativasViewProps {
  optativas: Discipline[];
  selectedCards: Discipline[];
  hoveredCode: string | null;
  highlighted: string[];
  onHover: (disciplina: Discipline) => void;
  onLeave: () => void;
  onToggle: (disciplina: Discipline) => void;
}

/** Departamentos com menos disciplinas que isso vão juntos para "Outros departamentos". */
const MIN_POR_DEPTO = 3;
/** Nome legível dos departamentos mais comuns; os demais aparecem pelo código. */
const NOME_DEPTO: Record<string, string> = {
  SIN: 'Sistemas de Informação',
  MAP: 'Matemática',
  ADE: 'Administração',
  CDP: 'Ciência de Dados',
  AGR: 'Agronomia',
  CBI: 'Ciências Biológicas',
  QAM: 'Química',
  NUR: 'Nutrição',
  CAL: 'Tecnologia de Alimentos',
  ENP: 'Engenharia de Produção',
  ECV: 'Engenharia Civil',
  CIC: 'Ciências Contábeis',
  FRP: 'Física',
  ESP: 'Estatística',
};

interface Grupo {
  titulo: string;
  disciplinas: Discipline[];
}

/** Altura do cartão, vão entre cartões e altura do título do grupo, em em (escalam com a fonte do painel). */
const CARTAO_EM = 4.6;
const VAO_EM = 0.55;
const TITULO_EM = 2.4;

/**
 * Agrupa por departamento (prefixo do código: SIN, MAP…). Departamentos maiores primeiro;
 * dentro de cada um, ordem de código. A quebra em colunas é feita no render, com o número de
 * linhas por coluna medido pela altura disponível do painel.
 */
function montarGrupos(optativas: Discipline[]): Grupo[] {
  const porDepto = new Map<string, Discipline[]>();
  for (const d of optativas) {
    const depto = d.CodDisciplina.split(' ')[0];
    porDepto.set(depto, [...(porDepto.get(depto) ?? []), d]);
  }
  const grupos: Grupo[] = [];
  const outros: Discipline[] = [];
  [...porDepto.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([depto, lista]) => {
      const ordenada = [...lista].sort((a, b) => a.CodDisciplina.localeCompare(b.CodDisciplina));
      if (ordenada.length < MIN_POR_DEPTO) outros.push(...ordenada);
      else grupos.push({ titulo: NOME_DEPTO[depto] ?? depto, disciplinas: ordenada });
    });
  if (outros.length > 0) grupos.push({ titulo: 'Outros departamentos', disciplinas: outros });
  return grupos;
}

export const OptativasPainel: React.FC<OptativasViewProps & { onClose: () => void }> = ({
  optativas, selectedCards, hoveredCode, highlighted, onHover, onLeave, onToggle, onClose,
}) => {
  const grupos = montarGrupos(optativas);
  const selecionadas = optativas.filter(d => selectedCards.some(s => s.CodDisciplina === d.CodDisciplina)).length;

  // Linhas por coluna = quantos cartões cabem na altura da área de grupos (descontado o título).
  // Medido antes da pintura e refeito ao redimensionar; mínimo 2 para não degenerar em uma fileira.
  const gruposRef = useRef<HTMLDivElement>(null);
  const [linhas, setLinhas] = useState(5);
  useLayoutEffect(() => {
    const medir = () => {
      const el = gruposRef.current;
      if (!el) return;
      const fonte = parseFloat(getComputedStyle(el).fontSize);
      const util = el.clientHeight - TITULO_EM * fonte;
      setLinhas(Math.max(2, Math.floor((util + VAO_EM * fonte) / ((CARTAO_EM + VAO_EM) * fonte))));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [optativas]);

  return (
    <div className="optPainel" role="dialog" aria-label="Disciplinas optativas ofertadas">
      <div className="optPainelTopo">
        <div>
          <span className="optPainelTitulo">Optativas ofertadas no semestre</span>
          <span className="optPainelSub">
            {optativas.length} disciplinas{selecionadas > 0 ? ` · ${selecionadas} selecionada${selecionadas > 1 ? 's' : ''}` : ''}
          </span>
        </div>
        <button type="button" className="optFechar" onClick={onClose} aria-label="Fechar optativas">×</button>
      </div>

      <div className="optGrupos" ref={gruposRef}>
        {grupos.map(grupo => (
          <section key={grupo.titulo} className="optGrupo">
            <header className="optGrupoTitulo">
              {grupo.titulo}
              <span className="optGrupoQtd">{grupo.disciplinas.length}</span>
            </header>
            <div className="optGrupoColunas">
              {Array.from({ length: Math.ceil(grupo.disciplinas.length / linhas) }, (_, i) =>
                grupo.disciplinas.slice(i * linhas, (i + 1) * linhas)
              ).map((coluna, i) => (
                <div key={i} className="optColuna">
                  {coluna.map(d => (
                    <div
                      key={d.CodDisciplina}
                      className={`disciplineCard optCard ${hoveredCode === d.CodDisc ? 'hovered' : ''} ${
                        hoveredCode !== d.CodDisc && highlighted.includes(d.CodDisc) ? 'highlight' : ''
                      } ${selectedCards.some(s => s.CodDisciplina === d.CodDisciplina) ? 'selected' : ''}`}
                      onMouseEnter={() => onHover(d)}
                      onMouseLeave={onLeave}
                      onClick={() => onToggle(d)}
                    >
                      <h5 className="disciplineCode">{d.CodDisciplina}</h5>
                      <h5 className="disciplineName">{d.NomeDisciplina}</h5>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
