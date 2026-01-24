/**
 * TESTE DE SCRAPING - Validação passo a passo
 * 
 * Execute: node test-scraping.mjs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

console.log('🔍 TESTE DE SCRAPING - Iniciando...\n');

// ============================================================================
// TESTE 1: Scraping de Horários
// ============================================================================
console.log('📊 TESTE 1: Scraping do site de horários');
console.log('─'.repeat(80));

async function testHorarios() {
  const url = 'https://www.registro.ufv.br/Horarios/show.php?Ano=2025&Periodo=1&Campus=crp&Periodo%5B%5D=0&buscaTexto=&Curso%5B%5D=SIN';
  
  try {
    console.log('→ URL:', url);
    console.log('→ Fazendo request...');
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    console.log('✅ Response recebido:', response.status);
    console.log('→ Tamanho do HTML:', (response.data.length / 1024).toFixed(2), 'KB');
    
    const $ = cheerio.load(response.data);
    const disciplineBlocks = $('.well.well-sm');
    
    console.log('→ Blocos de disciplinas encontrados:', disciplineBlocks.length);
    
    if (disciplineBlocks.length > 0) {
      console.log('\n📋 Amostra das primeiras 3 disciplinas:');
      
      disciplineBlocks.slice(0, 3).each((idx, block) => {
        const title = $(block).find('h4 a').text().trim();
        const [cod, ...nomeArr] = title.split(/\s+/);
        const nome = nomeArr.join(' ');
        
        const turmaInfo = $(block).find('strong').text().trim();
        const horarioText = $(block).find('.table tr').first().find('td').eq(1).text().trim();
        const salaText = $(block).find('.table tr').first().find('td').eq(2).text().trim();
        
        console.log(`\n  ${idx + 1}. ${cod} - ${nome}`);
        console.log(`     Turma: ${turmaInfo}`);
        console.log(`     Horário: ${horarioText}`);
        console.log(`     Sala: ${salaText}`);
      });
      
      return { success: true, count: disciplineBlocks.length };
    } else {
      console.log('⚠️  Nenhum bloco encontrado. HTML pode ter mudado.');
      return { success: false, count: 0 };
    }
    
  } catch (error) {
    console.error('❌ Erro no scraping de horários:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TESTE 2: Scraping de Catálogo (Obrigatórias)
// ============================================================================
console.log('\n\n📚 TESTE 2: Scraping do catálogo UFV (obrigatórias)');
console.log('─'.repeat(80));

async function testCatalogo() {
  const url = 'https://www.catalogo.ufv.br/interno.php?ano=2025&curso=SIP&campus=crp&periodo=1&complemento=*';
  
  try {
    console.log('→ URL:', url);
    console.log('→ Fazendo request...');
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Response recebido:', response.status);
    
    const html = Buffer.from(response.data).toString('utf-8');
    const $ = cheerio.load(html);
    
    const disciplinas = [];
    $('#disciplinas .bloco a').each((idx, link) => {
      const linkText = $(link).text().trim();
      const codeMatch = linkText.match(/^([A-Z]{3}\s*\d{3})/);
      
      if (codeMatch) {
        const cod = codeMatch[1];
        const nome = $(link).find('span').text().trim();
        disciplinas.push({ cod, nome });
      }
    });
    
    console.log('→ Disciplinas do período 1:', disciplinas.length);
    
    if (disciplinas.length > 0) {
      console.log('\n📋 Amostra das primeiras 3 disciplinas:');
      disciplinas.slice(0, 3).forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.cod} - ${d.nome}`);
      });
      
      return { success: true, count: disciplinas.length };
    } else {
      console.log('⚠️  Nenhuma disciplina encontrada no catálogo.');
      return { success: false, count: 0 };
    }
    
  } catch (error) {
    console.error('❌ Erro no scraping de catálogo:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TESTE 3: Scraping de Optativas (periodo=0)
// ============================================================================
console.log('\n\n🎓 TESTE 3: Scraping de optativas (periodo=0)');
console.log('─'.repeat(80));

async function testOptativas() {
  const url = 'https://www.catalogo.ufv.br/interno.php?ano=2025&curso=SIP&campus=crp&periodo=0&complemento=*';
  
  try {
    console.log('→ URL:', url);
    console.log('→ Fazendo request...');
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'arraybuffer'
    });
    
    console.log('✅ Response recebido:', response.status);
    
    const html = Buffer.from(response.data).toString('utf-8');
    const $ = cheerio.load(html);
    
    const optativas = [];
    $('#disciplinas .bloco a').each((idx, link) => {
      const linkText = $(link).text().trim();
      const codeMatch = linkText.match(/^([A-Z]{3}\s*\d{3})/);
      
      if (codeMatch) {
        const cod = codeMatch[1];
        const nome = $(link).find('span').text().trim();
        optativas.push({ cod, nome });
      }
    });
    
    console.log('→ Optativas encontradas:', optativas.length);
    
    if (optativas.length > 0) {
      console.log('\n📋 Amostra das primeiras 5 optativas:');
      optativas.slice(0, 5).forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.cod} - ${d.nome}`);
      });
      
      return { success: true, count: optativas.length };
    } else {
      console.log('⚠️  Nenhuma optativa encontrada.');
      return { success: false, count: 0 };
    }
    
  } catch (error) {
    console.error('❌ Erro no scraping de optativas:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXECUÇÃO DOS TESTES
// ============================================================================

async function runTests() {
  const results = {
    horarios: await testHorarios(),
    catalogo: await testCatalogo(),
    optativas: await testOptativas()
  };
  
  // Resumo final
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(80));
  
  console.log('\n✅ Horários:   ', results.horarios.success ? `OK (${results.horarios.count} disciplinas)` : `FALHOU (${results.horarios.error || 'sem dados'})`);
  console.log('✅ Catálogo:   ', results.catalogo.success ? `OK (${results.catalogo.count} disciplinas)` : `FALHOU (${results.catalogo.error || 'sem dados'})`);
  console.log('✅ Optativas:  ', results.optativas.success ? `OK (${results.optativas.count} optativas)` : `FALHOU (${results.optativas.error || 'sem dados'})`);
  
  const allSuccess = results.horarios.success && results.catalogo.success && results.optativas.success;
  
  console.log('\n' + '─'.repeat(80));
  if (allSuccess) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Scraping funcionando corretamente.');
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM. Verifique os erros acima.');
  }
  console.log('='.repeat(80) + '\n');
}

runTests().catch(console.error);
