import type { DerivativeResult } from './symbolic';
import type { VariableResult } from './uncertainty';
import { formatNumber } from './rounding';

export interface ExportData {
  expression: string;
  resultVariable: string;
  expressionLatex: string;
  derivatives: DerivativeResult[];
  variableResults: VariableResult[];
  finalValue: number;
  finalUncertainty: number;
  formattedValue: string;
  formattedUncertainty: string;
  confidence: number;
}

/**
 * 生成完整的LaTeX文档内容
 */
export function generateLatex(data: ExportData): string {
  const lines: string[] = [];
  
  // 标题
  lines.push('\\section*{不确定度计算过程}');
  lines.push('');
  
  // 原始公式
  lines.push('\\subsection*{1. 测量公式}');
  lines.push('\\begin{equation}');
  lines.push(`${data.resultVariable} = ${data.expressionLatex}`);
  lines.push('\\end{equation}');
  lines.push('');
  
  // 两边取对数
  lines.push('\\subsection*{2. 两边取对数}');
  lines.push('\\begin{equation}');
  lines.push(`\\ln ${data.resultVariable} = \\ln\\left(${data.expressionLatex}\\right)`);
  lines.push('\\end{equation}');
  lines.push('');
  
  // 对数偏导数
  lines.push('\\subsection*{3. 对数偏导数}');
  data.derivatives.forEach(d => {
    lines.push('\\begin{equation}');
    lines.push(`\\frac{\\partial \\ln ${data.resultVariable}}{\\partial ${d.variable}} = ${d.logDerivativeLatex}`);
    lines.push('\\end{equation}');
  });
  lines.push('');
  
  // 相对不确定度传递公式
  lines.push('\\subsection*{4. 相对不确定度传递公式}');
  lines.push('\\begin{equation}');
  const terms = data.derivatives.map(d => 
    `\\left(${d.logDerivativeLatex}\\right)^2 u_c^2(${d.variable})`
  );
  lines.push(`\\frac{u_c(${data.resultVariable})}{|${data.resultVariable}|} = \\sqrt{${terms.join(' + ')}}`);
  lines.push('\\end{equation}');
  lines.push('');
  
  // 各变量计算
  lines.push('\\subsection*{5. 各变量不确定度计算}');
  data.variableResults.forEach(vr => {
    const n = vr.data.values.filter(v => !isNaN(v)).length;
    const validValues = vr.data.values.filter(v => !isNaN(v));
    
    lines.push(`\\subsubsection*{变量 $${vr.name}$}`);
    lines.push('');
    lines.push('\\textbf{原始数据:}');
    lines.push(`$${vr.name}_i = ${validValues.map(v => formatNumber(v)).join(', ')}$`);
    lines.push('');
    
    lines.push('\\textbf{均值:}');
    lines.push('\\begin{equation}');
    lines.push(`\\bar{${vr.name}} = \\frac{1}{${n}}\\sum_{i=1}^{${n}} ${vr.name}_i = ${formatNumber(vr.stats.mean)}`);
    lines.push('\\end{equation}');
    
    if (n > 1) {
      lines.push('\\textbf{样本标准差:}');
      lines.push('\\begin{equation}');
      lines.push(`S_{${vr.name}} = \\sqrt{\\frac{1}{${n}-1}\\sum_{i=1}^{${n}}(${vr.name}_i - \\bar{${vr.name}})^2} = ${formatNumber(vr.stats.sampleStd)}`);
      lines.push('\\end{equation}');
      
      lines.push('\\textbf{A类不确定度:}');
      lines.push('\\begin{equation}');
      lines.push(`u_A(${vr.name}) = t_p \\cdot \\frac{S_{${vr.name}}}{\\sqrt{n}} = ${formatNumber(vr.data.tFactor ?? 0)} \\times \\frac{${formatNumber(vr.stats.sampleStd)}}{\\sqrt{${n}}} = ${formatNumber(vr.stats.uA)}`);
      lines.push('\\end{equation}');
    }
    
    lines.push('\\textbf{B类不确定度:}');
    lines.push('\\begin{equation}');
    lines.push(`u_B(${vr.name}) = \\frac{\\Delta_{ins}}{k} = \\frac{${formatNumber(vr.data.instrumentError ?? 0)}}{${formatNumber(vr.data.distributionFactor ?? 1)}} = ${formatNumber(vr.stats.uB)}`);
    lines.push('\\end{equation}');
    
    lines.push('\\textbf{合成不确定度:}');
    lines.push('\\begin{equation}');
    lines.push(`u_c(${vr.name}) = \\sqrt{u_A^2(${vr.name}) + u_B^2(${vr.name})} = \\sqrt{${formatNumber(vr.stats.uA)}^2 + ${formatNumber(vr.stats.uB)}^2} = ${formatNumber(vr.stats.uc)}`);
    lines.push('\\end{equation}');
    lines.push('');
  });
  
  // 最终结果
  lines.push('\\subsection*{6. 最终结果}');
  lines.push('\\begin{equation}');
  lines.push(`${data.resultVariable} = ${data.formattedValue} \\pm ${data.formattedUncertainty} \\quad (P = ${data.confidence})`);
  lines.push('\\end{equation}');
  
  return lines.join('\n');
}

/**
 * 生成Markdown文档内容
 */
export function generateMarkdown(data: ExportData): string {
  const lines: string[] = [];
  
  // 标题
  lines.push('# 不确定度计算过程');
  lines.push('');
  
  // 原始公式
  lines.push('## 1. 测量公式');
  lines.push('');
  lines.push('$$');
  lines.push(`${data.resultVariable} = ${data.expressionLatex}`);
  lines.push('$$');
  lines.push('');
  
  // 偏导数
  lines.push('## 2. 偏导数推导');
  lines.push('');
  data.derivatives.forEach(d => {
    lines.push('$$');
    lines.push(`\\frac{\\partial ${data.resultVariable}}{\\partial ${d.variable}} = ${d.logDerivativeLatex}`);
    lines.push('$$');
    lines.push('');
  });
  
  // 不确定度传递公式
  lines.push('## 3. 不确定度传递公式');
  lines.push('');
  lines.push('$$');
  const terms = data.derivatives.map(d => 
    `\\left(\\frac{\\partial ${data.resultVariable}}{\\partial ${d.variable}}\\right)^2 u_c^2(${d.variable})`
  );
  lines.push(`u_c(${data.resultVariable}) = \\sqrt{${terms.join(' + ')}}`);
  lines.push('$$');
  lines.push('');
  
  // 各变量计算
  lines.push('## 4. 各变量不确定度计算');
  lines.push('');
  
  data.variableResults.forEach(vr => {
    const n = vr.data.values.filter(v => !isNaN(v)).length;
    const validValues = vr.data.values.filter(v => !isNaN(v));
    
    lines.push(`### 变量 $${vr.name}$`);
    lines.push('');
    lines.push(`**原始数据:** $${vr.name}_i = ${validValues.map(v => formatNumber(v)).join(', ')}$`);
    lines.push('');
    
    lines.push('**均值:**');
    lines.push('$$');
    lines.push(`\\bar{${vr.name}} = \\frac{1}{${n}}\\sum_{i=1}^{${n}} ${vr.name}_i = ${formatNumber(vr.stats.mean)}`);
    lines.push('$$');
    lines.push('');
    
    if (n > 1) {
      lines.push('**样本标准差:**');
      lines.push('$$');
      lines.push(`S_{${vr.name}} = \\sqrt{\\frac{1}{${n}-1}\\sum_{i=1}^{${n}}(${vr.name}_i - \\bar{${vr.name}})^2} = ${formatNumber(vr.stats.sampleStd)}`);
      lines.push('$$');
      lines.push('');
      
      lines.push('**A类不确定度:**');
      lines.push('$$');
      lines.push(`u_A(${vr.name}) = t_p \\cdot \\frac{S_{${vr.name}}}{\\sqrt{n}} = ${formatNumber(vr.data.tFactor ?? 0)} \\times \\frac{${formatNumber(vr.stats.sampleStd)}}{\\sqrt{${n}}} = ${formatNumber(vr.stats.uA)}`);
      lines.push('$$');
      lines.push('');
    }
    
    lines.push('**B类不确定度:**');
    lines.push('$$');
    lines.push(`u_B(${vr.name}) = \\frac{\\Delta_{ins}}{k} = \\frac{${formatNumber(vr.data.instrumentError ?? 0)}}{${formatNumber(vr.data.distributionFactor ?? 1)}} = ${formatNumber(vr.stats.uB)}`);
    lines.push('$$');
    lines.push('');
    
    lines.push('**合成不确定度:**');
    lines.push('$$');
    lines.push(`u_c(${vr.name}) = \\sqrt{u_A^2 + u_B^2} = ${formatNumber(vr.stats.uc)}`);
    lines.push('$$');
    lines.push('');
  });
  
  // 最终结果
  lines.push('## 5. 最终结果');
  lines.push('');
  lines.push('$$');
  lines.push(`${data.resultVariable} = ${data.formattedValue} \\pm ${data.formattedUncertainty} \\quad (P = ${data.confidence})`);
  lines.push('$$');
  
  return lines.join('\n');
}