import { create, all, type MathNode } from 'mathjs';

const math = create(all);

// 已知的数学常量
const MATH_CONSTANTS = new Set(['pi', 'e', 'PI', 'E', 'i', 'Infinity', 'NaN']);

// 已知的数学函数
const MATH_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'sqrt', 'log', 'ln', 'log10', 'log2',
  'exp', 'pow', 'abs',
  'ceil', 'floor', 'round',
]);

export interface ParsedExpression {
  original: string;
  resultVariable: string;
  expression: string;
  variables: string[];
  mathNode: MathNode | null;
  error: string | null;
}

/**
 * 从表达式中提取所有变量（排除常量和函数名）
 */
function extractVariables(node: MathNode): Set<string> {
  const variables = new Set<string>();
  
  function traverse(n: MathNode) {
    if (n.type === 'SymbolNode') {
      const name = (n as any).name as string;
      if (!MATH_CONSTANTS.has(name) && !MATH_FUNCTIONS.has(name)) {
        variables.add(name);
      }
    } else if (n.type === 'FunctionNode') {
      // 处理函数节点：不添加函数名，但递归处理参数
      const funcNode = n as any;
      if (funcNode.args) {
        funcNode.args.forEach((arg: MathNode) => traverse(arg));
      }
      return; // 提前返回，避免下面的通用处理
    }
    
    // 递归处理子节点
    if ('args' in n && Array.isArray((n as any).args)) {
      (n as any).args.forEach((arg: MathNode) => traverse(arg));
    }
    if ('content' in n) {
      traverse((n as any).content);
    }
  }
  
  traverse(node);
  return variables;
}

/**
 * 解析表达式
 */
export function parseExpression(input: string): ParsedExpression {
  const result: ParsedExpression = {
    original: input,
    resultVariable: '',
    expression: '',
    variables: [],
    mathNode: null,
    error: null,
  };
  
  if (!input.trim()) {
    result.error = '请输入表达式';
    return result;
  }
  
  try {
    // 检查是否包含等号
    const parts = input.split('=');
    
    if (parts.length === 2) {
      result.resultVariable = parts[0].trim();
      result.expression = parts[1].trim();
    } else if (parts.length === 1) {
      result.resultVariable = 'y';
      result.expression = parts[0].trim();
    } else {
      result.error = '表达式格式错误：只能包含一个等号';
      return result;
    }
    
    // 预处理表达式：将 ^ 替换为 mathjs 的幂运算符
    let processedExpr = result.expression;
    
    // 解析表达式
    const node = math.parse(processedExpr);
    result.mathNode = node;
    
    // 提取变量
    const variables = extractVariables(node);
    result.variables = Array.from(variables).sort();
    
  } catch (e) {
    result.error = `表达式解析错误: ${(e as Error).message}`;
  }
  
  return result;
}

/**
 * 将MathNode转换为LaTeX字符串
 */
export function nodeToLatex(node: MathNode): string {
  let tex = node.toTex({ parenthesis: 'auto', implicit: 'show' });
  return tex.replace(/\\_/g, '_');
}

/**
 * 计算表达式的值
 */
export function evaluateExpression(
  expression: string,
  variables: { [key: string]: number }
): number {
  try {
    const scope = { ...variables, pi: Math.PI, e: Math.E, PI: Math.PI, E: Math.E };
    return math.evaluate(expression, scope) as number;
  } catch {
    return NaN;
  }
}