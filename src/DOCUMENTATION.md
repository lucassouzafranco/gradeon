# Documentação Técnica do Cálculo de Balanceamento de Grade

## Contexto do Problema

O objetivo deste projeto é calcular o **balanceamento de grades de disciplinas** de um curso universitário. O balanceamento é avaliado com base no número de créditos das disciplinas e na distribuição das matérias dentro da grade curricular.

O **balanceamento da grade** é fundamental para garantir que os alunos não sobrecarreguem sua carga de trabalho e que a distribuição de disciplinas ao longo dos períodos do curso seja eficiente, levando em consideração tanto a quantidade de créditos quanto a natureza das disciplinas (optativas, obrigatórias, com alto ou baixo número de créditos).

### Desafios do Cálculo de Balanceamento

1. **Diferentes números de créditos**: A grande maioria das disciplinas tem 4 créditos, mas há casos de disciplinas com 6 créditos, que podem impactar o balanceamento.
2. **Diversidade de matérias**: Há situações com um número pequeno de disciplinas (1-2) ou um número alto de disciplinas (7 ou mais), que exigem abordagens distintas.
3. **Mudanças futuras**: A inclusão de uma **porcentagem de reprovação** de cada disciplina poderá ser usada no futuro para ajustar o cálculo do balanceamento.

## Objetivo do Cálculo

O **balanceamento da grade** é uma métrica que visa a avaliar como os créditos das disciplinas estão distribuídos em relação ao número de disciplinas selecionadas. Agradecemos a influência de três critérios principais:

1. **Número de Disciplinas**: A quantidade total de matérias na grade.
2. **Número de Créditos**: A soma dos créditos das disciplinas, com maior ênfase nas disciplinas de 4 e 6 créditos.
3. **Diversidade de Créditos**: A diversidade de créditos dentro da grade curricular.

## Filosofia de Decisão

### 1. Balanceamento com 1 ou 2 Disciplinas
- **Decisão**: Com 1 ou 2 disciplinas, o cálculo de balanceamento não é possível ou relevante. Para essas combinações, deixamos o campo de balanceamento vazio.
- **Justificativa**: Não é possível analisar o balanceamento com apenas uma ou duas disciplinas devido à baixa quantidade de dados.

### 2. Balanceamento com 3 ou Mais Disciplinas
- **Decisão**: A partir de 3 disciplinas, começamos a calcular o balanceamento com base na média de créditos. Para a maioria das combinações de disciplinas (considerando que a maior parte tem 4 créditos), a grade é classificada como **balanceada** ou **desbalanceada**.
- **Justificativa**: O cálculo do balanceamento é diretamente influenciado pela quantidade de créditos e pelo número de disciplinas, com um enfoque especial nas disciplinas de 6 créditos, que são consideradas **raras** e desproporcionais.

### 3. Divisão de Disciplinas com 6 Créditos
- **Decisão**: Disciplinas com 6 créditos são consideradas um fator de atenção, principalmente quando ocorrem mais de uma vez na grade.
- **Justificativa**: Como essas disciplinas são raras e exigem maior carga de trabalho, mais de uma delas pode sobrecarregar a grade e reduzir a possibilidade de balanceamento.

### 4. Futuras Modificações: Porcentagem de Reprovação
- **Decisão**: Um espaço foi reservado no código para integrar, futuramente, a porcentagem de reprovação de cada disciplina, a fim de ajustar o cálculo do balanceamento. 
- **Justificativa**: A inclusão da porcentagem de reprovação ajudará a refinar o balanceamento da grade, permitindo que disciplinas com altas taxas de reprovação possam influenciar negativamente o balanceamento, já que indicam uma maior carga de dificuldades.

## Lógica de Cálculo Atual

A lógica de balanceamento da grade é baseada nas seguintes considerações:

1. **Cálculo do Total de Créditos**: A soma de todos os créditos das disciplinas.
2. **Número de Disciplinas**: A quantidade de disciplinas selecionadas.
3. **Balanceamento da Grade**:
    - **Vazio**: Quando a grade contém 1 ou 2 disciplinas, não há cálculo possível.
    - **Balanceada**: Quando a média de créditos por disciplina está dentro de um intervalo aceitável (entre 0.85 e 1.15 da média ideal de 4 créditos).
    - **Levemente Desbalanceada**: Quando a média de créditos ultrapassa ligeiramente o limite ideal (entre 1.15 e 1.50).
    - **Desbalanceada**: Quando a média de créditos está fora desses limites ou quando há várias disciplinas de 6 créditos.

### Cálculo do Balanceamento

```


```tsx
// Cálculo total de créditos
const totalCredits = selectedCards.reduce((sum, card) => sum + parseInt(card.CargaSemanal.split('(')[0]), 0);
const numDisciplinas = selectedCards.length;

// Balanceamento da grade
let balanceamentoDaGrade: string | number = '';
if (numDisciplinas > 2 && numDisciplinas < 7) {
  balanceamentoDaGrade = totalCredits / numDisciplinas;
} else if (numDisciplinas >= 7) {
  balanceamentoDaGrade = 'Desbalanceada';
}

// Função de classificação
const gradeClassification = (balance: any) => {
  if (balance === '') return '';  
  if (balance === 'Desbalanceada') return 'Desbalanceada';
  if (balance < 0.85) return 'Desbalanceada';
  if (balance <= 1.15) return 'Balanceada';
  if (balance <= 1.50) return 'Levemente Desbalanceada';
  return 'Desbalanceada';
};
```

## Casos Clássicos

Abaixo estão os **casos clássicos** testados empiricamente para validar a abordagem de balanceamento:

### Caso 1: **3 Disciplinas, 4 Créditos Cada**

- **Resultado Esperado**: `Balanceada`
- **Justificativa**: Média de créditos = 12 créditos / 3 disciplinas = 4 créditos por disciplina.

### Caso 2: **3 Disciplinas, 6 Créditos Cada**

- **Resultado Esperado**: `Desbalanceada`
- **Justificativa**: Média de créditos = 18 créditos / 3 disciplinas = 6 créditos por disciplina. Uma grade com múltiplas disciplinas de 6 créditos sobrecarrega a distribuição.

### Caso 3: **5 Disciplinas, 4 Créditos Cada**

- **Resultado Esperado**: `Balanceada`
- **Justificativa**: Média de créditos = 20 créditos / 5 disciplinas = 4 créditos por disciplina.

### Caso 4: **5 Disciplinas, 6 Créditos Cada**

- **Resultado Esperado**: `Desbalanceada`
- **Justificativa**: Média de créditos = 30 créditos / 5 disciplinas = 6 créditos por disciplina. Uma grade com várias disciplinas de 6 créditos tende a ser desbalanceada.

### Caso 5: **7 Disciplinas, 4 Créditos Cada**

- **Resultado Esperado**: `Levemente Desbalanceada`
- **Justificativa**: Média de créditos = 28 créditos / 7 disciplinas = 4 créditos por disciplina, mas devido ao número elevado de disciplinas, a grade é considerada levemente desbalanceada.

## Testes Empíricos

Durante os testes empíricos, diversas combinações de grades foram testadas e analisadas. Os resultados mostraram que a fórmula de balanceamento funciona bem para a maioria das combinações típicas de disciplinas, especialmente para aquelas com 4 créditos.

A presença de múltiplas disciplinas de 6 créditos nas grades sempre resultou em um balanceamento desbalanceado, como esperado.

## Como o Código Pode Ser Expandido no Futuro

Com a inclusão da **porcentagem de reprovação** no futuro, o cálculo do balanceamento poderá ser ajustado para dar mais peso às disciplinas com altas taxas de reprovação. O sistema de balanceamento pode ser ajustado da seguinte maneira:

```
tsxCopiarEditar// Cálculo do balanceamento com reprovação
const reprovaçãoImpact = selectedCards.reduce((sum, card) => sum + card.porcentagemReprovacao, 0) / selectedCards.length;
balanceamentoDaGrade += reprovaçãoImpact * fatorDeImpacto;
```

Neste caso, a **porcentagem de reprovação** será um dado adicional a ser integrado na fórmula de balanceamento. O `fatorDeImpacto` será um número que ajustará a influência dessa métrica no resultado final.