import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Onboarding.css';
import { Discipline } from '../../types/types';

/**
 * Ação que conclui um passo do tutorial.
 * - next: o usuário clica em "Próximo" no balão;
 * - hover: o usuário passa o mouse sobre a disciplina-alvo;
 * - click: o usuário clica na disciplina-alvo (ela entra em selectedCards);
 * - selectCount: o usuário seleciona pelo menos `min` disciplinas.
 */
type TourAction =
  | { kind: 'next' }
  | { kind: 'hover' }
  | { kind: 'click' }
  | { kind: 'selectCount'; min: number };

type Side = 'top' | 'bottom' | 'left' | 'right';
/** 'center' põe o balão no meio da tela, sem seta: usado quando o alvo ocupa quase a tela inteira (a matriz). */
type Placement = Side | 'center';

interface TourStep {
  /** Valor do atributo data-tour do elemento destacado; null centraliza o balão sem destaque. */
  target: string | null;
  title: string;
  body: string;
  side: Placement;
  action: TourAction;
}

const TODOS_OS_PASSOS: TourStep[] = [
  {
    target: 'matriz',
    title: 'Matriz curricular',
    body: 'Cada coluna é um período do curso e cada cartão é uma disciplina. Vamos ver o que acontece quando você interage com elas.',
    side: 'center',
    action: { kind: 'next' },
  },
  {
    target: 'disciplina-alvo',
    title: 'Passe o mouse',
    body: 'Passe o mouse sobre esta disciplina. Os pré-requisitos e as disciplinas que dependem dela acendem na matriz.',
    side: 'right',
    action: { kind: 'hover' },
  },
  {
    target: 'painel-disciplina',
    title: 'Detalhes da disciplina',
    body: 'Aqui aparecem os créditos, os pré-requisitos, as turmas, a taxa histórica de reprovação, o período de oferta e as dependentes da disciplina sob o mouse.',
    side: 'top',
    action: { kind: 'next' },
  },
  {
    target: 'disciplina-alvo',
    title: 'Clique para selecionar',
    body: 'Agora clique nesta disciplina para colocá-la no seu plano de estudos.',
    side: 'right',
    action: { kind: 'click' },
  },
  {
    target: 'painel-grade',
    title: 'Resumo da sua grade',
    body: 'Cada disciplina clicada entra neste resumo: número de disciplinas, créditos, locais, códigos e turnos.',
    side: 'top',
    action: { kind: 'next' },
  },
  {
    target: 'matriz',
    title: 'Monte um semestre',
    body: 'Selecione mais disciplinas até ter pelo menos 3. É a partir de 3 que o GRADEON calcula o balanceamento.',
    side: 'center',
    action: { kind: 'selectCount', min: 3 },
  },
  {
    target: 'balanceamento',
    title: 'Balanceamento da grade',
    body: 'Esta classificação combina créditos e a taxa histórica de reprovação das disciplinas escolhidas. Passe o mouse sobre ela, depois do tutorial, para ver a recomendação.',
    side: 'top',
    action: { kind: 'next' },
  },
  {
    target: 'botao-grade',
    title: 'Próximo passo: horários',
    body: 'Com o plano pronto, este botão leva à montagem dos horários da semana.',
    side: 'top',
    action: { kind: 'next' },
  },
];

// Espaço entre balão e alvo, onde fica a seta animada.
const MARGIN = 40;
const EDGE = 12;
const PADDING = 6;

interface Rect { top: number; left: number; width: number; height: number; }

interface OnboardingProps {
  selectedDiscipline: Discipline | null;
  selectedCards: Discipline[];
  /** Mantém a disciplina do tutorial no painel quando o mouse sai do cartão. */
  onPinDiscipline: (discipline: Discipline) => void;
  onFinish: () => void;
  /** false nos cursos sem balanceamento calibrado: remove os passos que dependem dele. */
  comBalanceamento: boolean;
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

const Onboarding: React.FC<OnboardingProps> = ({ selectedDiscipline, selectedCards, onPinDiscipline, onFinish, comBalanceamento }) => {
  // Passos 'Monte um semestre' e 'Balanceamento' só existem onde o balanceamento é calculado.
  const STEPS = comBalanceamento ? TODOS_OS_PASSOS : TODOS_OS_PASSOS.filter(s => s.target !== 'balanceamento' && s.action.kind !== 'selectCount');
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; arrow: number; side: Placement } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const targetCodRef = useRef<string | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const advance = () => {
    if (isLast) onFinish();
    else setStepIndex(i => i + 1);
  };

  // Acompanha a posição do alvo a cada quadro: o cartão muda de tamanho no hover,
  // os dados carregam de forma assíncrona e o painel muda de conteúdo.
  useEffect(() => {
    let frame = 0;
    let last: Rect | null = null;
    const tick = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      let next: Rect | null = null;
      if (el) {
        const r = el.getBoundingClientRect();
        next = { top: r.top - PADDING, left: r.left - PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 };
        if (el.dataset.cod) targetCodRef.current = el.dataset.cod;
      }
      if (!sameRect(last, next)) {
        last = next;
        setRect(next);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step.target]);

  // Conclui os passos que dependem de ação do usuário na interface real.
  useEffect(() => {
    const cod = targetCodRef.current;
    const { action } = step;
    if (action.kind === 'hover' && selectedDiscipline && selectedDiscipline.CodDisciplina === cod) {
      onPinDiscipline(selectedDiscipline);
      advance();
    } else if (action.kind === 'click' && selectedCards.some(d => d.CodDisciplina === cod)) {
      advance();
    } else if (action.kind === 'selectCount' && selectedCards.length >= action.min) {
      advance();
    }
    // advance e onPinDiscipline mudam a cada render; o gatilho real são os dados abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiscipline, selectedCards, stepIndex]);

  // Posiciona o balão no lado pedido, trocando para o oposto se não couber, e mantém dentro da tela.
  useLayoutEffect(() => {
    const pop = popoverRef.current;
    if (!pop) return;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect || step.side === 'center') {
      setPopoverPos({ top: (vh - ph) / 2, left: (vw - pw) / 2, arrow: -1, side: step.side });
      return;
    }

    const fits: Record<Side, boolean> = {
      top: rect.top - ph - MARGIN >= 0,
      bottom: rect.top + rect.height + ph + MARGIN <= vh,
      left: rect.left - pw - MARGIN >= 0,
      right: rect.left + rect.width + pw + MARGIN <= vw,
    };
    const opposite: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    const preferred = step.side;
    const side = fits[preferred] ? preferred : fits[opposite[preferred]] ? opposite[preferred] : preferred;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let top: number;
    let left: number;
    if (side === 'top' || side === 'bottom') {
      top = side === 'top' ? rect.top - ph - MARGIN : rect.top + rect.height + MARGIN;
      left = clamp(cx - pw / 2, EDGE, vw - pw - EDGE);
    } else {
      left = side === 'left' ? rect.left - pw - MARGIN : rect.left + rect.width + MARGIN;
      top = clamp(cy - ph / 2, EDGE, vh - ph - EDGE);
    }
    top = clamp(top, EDGE, vh - ph - EDGE);
    // Posição da seta ao longo da borda do balão, apontando para o centro do alvo.
    const arrow = side === 'top' || side === 'bottom'
      ? clamp(cx - left, 28, pw - 28)
      : clamp(cy - top, 28, ph - 28);
    setPopoverPos({ top, left, arrow, side });
  }, [rect, stepIndex, step.side]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const needsAction = step.action.kind !== 'next';

  return (
    <div className="onboardingRoot" role="dialog" aria-modal="true" aria-label="Tutorial do GRADEON">
      {/* Quatro bloqueadores escurecem e capturam cliques fora do alvo; o alvo fica livre para hover e clique reais. */}
      {rect ? (
        <>
          <div className="onboardingBlocker" style={{ top: 0, left: 0, width: vw, height: Math.max(0, rect.top) }} />
          <div className="onboardingBlocker" style={{ top: rect.top + rect.height, left: 0, width: vw, height: Math.max(0, vh - rect.top - rect.height) }} />
          <div className="onboardingBlocker" style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
          <div className="onboardingBlocker" style={{ top: rect.top, left: rect.left + rect.width, width: Math.max(0, vw - rect.left - rect.width), height: rect.height }} />
          <div
            className={`onboardingSpotlight ${needsAction ? 'awaiting' : ''}`}
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
          {/* Em passos explicativos, o alvo também fica bloqueado: só o balão responde. */}
          {!needsAction && (
            <div className="onboardingShield" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
          )}
        </>
      ) : (
        <div className="onboardingBlocker" style={{ inset: 0 }} />
      )}

      <div
        ref={popoverRef}
        className={`onboardingPopover side-${popoverPos?.side ?? step.side}`}
        style={{ top: popoverPos?.top ?? -9999, left: popoverPos?.left ?? -9999 }}
      >
        {rect && popoverPos && popoverPos.arrow >= 0 && (
          <span
            aria-hidden="true"
            className="onboardingPointer"
            style={popoverPos.side === 'top' || popoverPos.side === 'bottom' ? { left: popoverPos.arrow } : { top: popoverPos.arrow }}
          />
        )}
        <div className="onboardingHeader">
          <div className="onboardingDots" aria-label={`Passo ${stepIndex + 1} de ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={`onboardingDot ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}`} />
            ))}
          </div>
        </div>
        <h4 className="onboardingTitle">{step.title}</h4>
        <p className="onboardingBody" aria-live="polite">{step.body}</p>
        <div className="onboardingActions">
          <button type="button" className="onboardingSkip" onClick={onFinish}>Pular tutorial</button>
          {needsAction ? (
            <span className="onboardingHint">Faça a ação destacada</span>
          ) : (
            <button type="button" className="onboardingNext" onClick={advance} autoFocus>
              {isLast ? 'Concluir' : 'Próximo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
