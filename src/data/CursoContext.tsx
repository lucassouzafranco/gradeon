import React, { createContext, useContext, useEffect, useState } from 'react';
import { CURSO_PADRAO, CursoDados, CursoInfo, buscarCurso, carregarCurso, anosDoCurso } from './cursos';
import { lerSessao, salvarSessao, lerTextoLegado } from './planejamento';
type Selecao = { id: string; ano: number };
type Carga = { chave: string; estado: 'carregando' } | { chave: string; estado: 'erro'; erro: string } | { chave: string; estado: 'pronto'; dados: CursoDados };
interface CursoContextValue {
  curso: CursoInfo; anoCatalogo: number; anos: number[]; chave: string;
  dados: CursoDados | null; erro: string | null; aviso: string;
  setCursoId: (id: string) => void; setAnoCatalogo: (ano: number) => void; tentarNovamente: () => void;
}
const CursoContext = createContext<CursoContextValue | null>(null);
function inicial(): Selecao {
  const salvo = lerSessao('gradeon:v2:contexto');
  if (typeof salvo === 'object' && salvo !== null && 'id' in salvo && 'ano' in salvo && typeof salvo.id === 'string' && typeof salvo.ano === 'number' && buscarCurso(salvo.id, salvo.ano)) return { id: salvo.id, ano: salvo.ano };
  const legado = lerTextoLegado('gradeon:curso');
  const id = legado && buscarCurso(legado) ? legado : CURSO_PADRAO;
  return { id, ano: anosDoCurso(id)[0] };
}
export const CursoProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [selecao, setSelecao] = useState(inicial);
  const [carga, setCarga] = useState<Carga>({chave: '', estado: 'carregando'});
  const [tentativa, setTentativa] = useState(0);
  const [aviso, setAviso] = useState('');
  const chave = `${selecao.id}:${selecao.ano}`;
  useEffect(() => {
    let cancelado = false;
    setCarga({chave, estado: 'carregando'});
    salvarSessao('gradeon:v2:contexto', selecao);
    carregarCurso(selecao.id, selecao.ano).then(dados => {
      if (!cancelado) setCarga({chave, estado: 'pronto', dados});
    }).catch(() => { if (!cancelado) setCarga({chave, estado: 'erro', erro: 'Não foi possível carregar o catálogo. Tente novamente.'}); });
    return () => { cancelado = true; };
  }, [selecao, chave, tentativa]);
  const curso = buscarCurso(selecao.id, selecao.ano);
  if (!curso) throw new Error('Nenhum catálogo válido disponível.');
  return <CursoContext.Provider value={{curso, chave, anoCatalogo: selecao.ano, anos: anosDoCurso(selecao.id), aviso,
    dados: carga.chave === chave && carga.estado === 'pronto' ? carga.dados : null,
    erro: carga.chave === chave && carga.estado === 'erro' ? carga.erro : null,
    tentarNovamente: () => setTentativa(t => t+1),
    setCursoId: id => {
      const anos = anosDoCurso(id); if (!anos.length) return;
      const ano = anos.includes(selecao.ano) ? selecao.ano : anos[0];
      setAviso(ano !== selecao.ano ? `Catálogo ${selecao.ano} indisponível neste curso. Selecionado ${ano}.` : '');
      setSelecao({id, ano});
    },
    setAnoCatalogo: ano => { if (buscarCurso(selecao.id, ano)) { setAviso(''); setSelecao({...selecao, ano}); } }
  }}>{children}</CursoContext.Provider>;
};
export function useCurso(): CursoContextValue {
  const ctx = useContext(CursoContext);
  if (!ctx) throw new Error('useCurso precisa estar dentro de CursoProvider');
  return ctx;
}
