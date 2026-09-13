import { describe, it, expect } from 'vitest';
import { evaluateMathExpression, calculateFactorial } from '../lib/mathEngine';

describe('Calculator Engine & Operator Chaining', () => {
  it('correctly evaluates basic arithmetic operations', () => {
    expect(evaluateMathExpression('5+5').result).toBe('10');
    expect(evaluateMathExpression('10-3').result).toBe('7');
    expect(evaluateMathExpression('6×7').result).toBe('42');
    expect(evaluateMathExpression('100÷4').result).toBe('25');
  });

  it('handles operator chaining: 5+5=10 then 10÷2=5', () => {
    const step1 = evaluateMathExpression('5+5');
    expect(step1.result).toBe('10');

    // Chaining: new expression starts with previous result + operator + operand
    const chainedExpr = `${step1.result}÷2`;
    const step2 = evaluateMathExpression(chainedExpr);
    expect(step2.result).toBe('5');
  });

  it('handles operator chaining: 10-3=7 then 7×2=14', () => {
    const step1 = evaluateMathExpression('10−3');
    expect(step1.result).toBe('7');

    const chainedExpr = `${step1.result}×2`;
    const step2 = evaluateMathExpression(chainedExpr);
    expect(step2.result).toBe('14');
  });

  it('handles decimals and complex order of operations', () => {
    expect(evaluateMathExpression('2.5+3.5').result).toBe('6');
    expect(evaluateMathExpression('10+2×5').result).toBe('20');
    expect(evaluateMathExpression('(10+2)×5').result).toBe('60');
    expect(evaluateMathExpression('50%').result).toBe('0.5');
  });

  it('handles division by zero and errors gracefully', () => {
    expect(evaluateMathExpression('5÷0').result).toBe('Infinity');
    expect(evaluateMathExpression('sin(90)').result).toBe('1');
    expect(evaluateMathExpression('√(16)').result).toBe('4');
  });

  it('calculates factorials correctly', () => {
    expect(calculateFactorial(0)).toBe(1);
    expect(calculateFactorial(1)).toBe(1);
    expect(calculateFactorial(5)).toBe(120);
    expect(calculateFactorial(6)).toBe(720);
  });

  it('correctly auto-closes unclosed brackets during evaluation', () => {
    // sin(30 -> auto closed to sin(30) -> 0.5 in deg mode
    expect(evaluateMathExpression('sin(30').result).toBe('0.5');
    // nested unclosed brackets: sin(cos(30 -> auto closed to sin(cos(30))
    const nestedRes = evaluateMathExpression('sin(cos(30');
    expect(nestedRes.result).not.toBe('Error');
    expect(parseFloat(nestedRes.result)).toBeGreaterThan(0);

    expect(evaluateMathExpression('√(16').result).toBe('4');
    expect(evaluateMathExpression('(5+5').result).toBe('10');
    expect(evaluateMathExpression('((2+3)×4').result).toBe('20');
  });
});
