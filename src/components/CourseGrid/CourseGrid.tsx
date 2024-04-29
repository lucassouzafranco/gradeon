import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface CourseData {
  CodDisciplina: string;
  Tipo: string;
  Turma: string;
  Horarios: string;
  Sala: string;
  Periodo: number;
  NomeDisciplina: string;
  CargaSemanal: string;
  CargaTotal: number;
  Dependencias: string;
  Oferecida: string;
  CodDisc: string;
  Depen: string;
}

interface CourseGridProps {
  data: CourseData[][];
}

const CourseGrid: React.FC<CourseGridProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current && data) {
      const svg = d3.select(chartRef.current)
        .append('svg')
        .attr('width', 800)
        .attr('height', 600);

      const cellSize = 50;
      const padding = 10;

      svg.selectAll('g.row')
        .data<CourseData[]>(data)
        .enter()
        .append('g')
        .attr('class', 'row')
        .attr('transform', (_, i) => `translate(0, ${i * (cellSize + padding)})`)
        .selectAll('rect')
        .data<CourseData>(d => d)
        .enter()
        .append('rect')
        .attr('x', (_, i) => i * (cellSize + padding))
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', 'lightblue')
        .style('stroke', 'white');

      svg.selectAll('g.row')
        .selectAll('text')
        .data<CourseData>(d => d)
        .enter()
        .append('text')
        .attr('x', (_, i) => i * (cellSize + padding) + cellSize / 2)
        .attr('y', cellSize / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .text(d => d.CodDisciplina);
    }
  }, [data]);

  return <div ref={chartRef}></div>;
};

export default CourseGrid;
