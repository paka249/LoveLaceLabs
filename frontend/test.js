import { evaluate, preloadSymbolicMath } from './src/utils/mathEvaluator.js';

async function run() {
  await preloadSymbolicMath();
  
  const expressions = [
    'd/dx(x^2)',
    'd/dx( d/dx(x^3) )',
    'Σ(i=1→3)(i)',
    'lim(x→0)(2*x)',
    'd/dt(t) + d/dt(t^2)'
  ];

  for (const expr of expressions) {
    console.log(`${expr} =`, await evaluate(expr));
  }
}

run();