# GradeOn - Sistema de Planejamento de Grade Curricular

Sistema web para visualização, planejamento e balanceamento de grade curricular do curso de Sistemas de Informação da UFV.

## Funcionalidades

- 📚 Visualização de disciplinas por período
- 📊 Análise de balanceamento de grade
- 🔍 Scraping automático de horários do site da UFV
- ⚡ Interface interativa com seleção de disciplinas
- 📈 Cálculo de carga horária e créditos

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Scraping**: Axios + Cheerio
- **Estilo**: CSS Modules

## Instalação

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Scraper de Horários

O sistema inclui um scraper que busca automaticamente os horários atualizados do site da DTI/UFV (https://www.dti.ufv.br/horario_crp/horario.asp).

### Como funciona

1. O build executa `scripts/prebuild-scrape.mjs` e gera `src/data/scrapedData.json`
2. Em runtime, o frontend carrega o JSON pré-gerado (mais rápido e estável)
3. Se o JSON estiver indisponível/inválido, o pipeline tenta scraping em tempo real
4. Se tudo falhar, usa dados legados como fallback

### Estrutura

- `src/data/scraper.ts` - Lógica de web scraping
- `src/data/rawOfferExtractor.ts` - Integração com fallback
- `scripts/prebuild-scrape.mjs` - Scraping no build (gera JSON)
- `src/data/scrapedData.json` - Dados pré-gerados consumidos pelo frontend
- `src/data/courseData.ts` - Fallback legado

Para mais detalhes técnicos, consulte [INTEGRATION.md](INTEGRATION.md).

## Estrutura do Projeto

```
src/
├── components/       # Componentes React
│   ├── CourseGrid/   # Grade de disciplinas
│   ├── Menu/         # Menu principal
│   ├── Overview/     # Visão geral
│   └── ...
├── data/             # Camada de dados
│   ├── scraper.ts    # Web scraping
│   ├── curriculum.ts # Currículo do curso
│   ├── merge.ts      # Combinação de dados
│   └── ...
├── types/            # Definições TypeScript
└── pages/            # Páginas da aplicação
```

## Desenvolvimento

### Requisitos

- Node.js 18+
- npm ou yarn

### Scripts

- `npm run dev` - Servidor de desenvolvimento (porta 5173)
- `npm run build` - Build de produção
- `npm run preview` - Preview do build
- `npm run lint` - Lint do código

### Testes do Scraper

Para testar manualmente o scraper:

```typescript
import { getScrapedOffers } from './data/rawOfferExtractor';

const offers = await getScrapedOffers();
console.log(`${offers.length} ofertas carregadas`);
```

## Licença

Projeto acadêmico - UFV
