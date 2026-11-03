import React, { createContext, useContext, useEffect, useState } from 'react';
import { CURSO_PADRAO, CursoDados, CursoInfo, buscarCurso, carregarCurso } from './cursos';

/**
 * Curso selecionado e seus dados, compartilhados por todo o app.
 * `dados` é null enquanto o JSON do curso carrega.
 */
interface CursoContextValue {
  curso: CursoInfo;
  dados: CursoDados | null;
  setCursoId: (id: string) => void;
}

const CursoContext = createContext<CursoContextValue | null>(null);

const STORAGE_KEY = 'gradeon:curso';

function cursoInicial(): string {
  const salvo = sessionStorage.getItem(STORAGE_KEY);
  return salvo && buscarCurso(salvo) ? salvo : CURSO_PADRAO;
}

export const CursoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursoId, setCursoIdState] = useState(cursoInicial);
  const [dados, setDados] = useState<CursoDados | null>(null);

  useEffect(() => {
    let cancelado = false;
    setDados(null);
    carregarCurso(cursoId).then(d => { if (!cancelado) setDados(d); });
    sessionStorage.setItem(STORAGE_KEY, cursoId);
    // Evita que a resposta de um curso anterior sobrescreva a do curso atual se a troca for rápida.
    return () => { cancelado = true; };
  }, [cursoId]);

  const curso = buscarCurso(cursoId) ?? buscarCurso(CURSO_PADRAO)!;

  return (
    <CursoContext.Provider value={{ curso, dados, setCursoId: setCursoIdState }}>
      {children}
    </CursoContext.Provider>
  );
};

export function useCurso(): CursoContextValue {
  const ctx = useContext(CursoContext);
  if (!ctx) throw new Error('useCurso precisa estar dentro de <CursoProvider>');
  return ctx;
}
