// __tests__/nano-var-template.perf.js
const Tpl = require('../nano-var-template.js');

class PerfTest {
  constructor() {
    this.results = [];
  }

  async measure(name, fn, iterations = 1000) {
    // Warm up
    for (let i = 0; i < 100; i++) {
      await fn();
    }

    const times = [];
    const memoryUsage = [];

    // Actual measurements
    for (let i = 0; i < iterations; i++) {
      const startMem = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      
      await fn();
      
      const endTime = performance.now();
      const endMem = process.memoryUsage().heapUsed;
      
      times.push(endTime - startTime);
      memoryUsage.push(endMem - startMem);
    }

    // Calculate statistics
    const result = {
      name,
      iterations,
      time: {
        mean: this.mean(times),
        median: this.median(times),
        p95: this.percentile(times, 95),
        min: Math.min(...times),
        max: Math.max(...times)
      },
      memory: {
        mean: this.mean(memoryUsage),
        median: this.median(memoryUsage),
        p95: this.percentile(memoryUsage, 95),
        min: Math.min(...memoryUsage),
        max: Math.max(...memoryUsage)
      }
    };

    this.results.push(result);
    return result;
  }

  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * (p / 100);
    const base = Math.floor(pos);
    const rest = pos - base;
    
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  printResults() {
    console.log('\nPerformance Test Results:\n');
    
    this.results.forEach(result => {
      console.log(`Test: ${result.name}`);
      console.log(`Iterations: ${result.iterations}`);
      console.log('\nTime (ms):');
      console.log(`  Mean:   ${result.time.mean.toFixed(3)}`);
      console.log(`  Median: ${result.time.median.toFixed(3)}`);
      console.log(`  P95:    ${result.time.p95.toFixed(3)}`);
      console.log(`  Min:    ${result.time.min.toFixed(3)}`);
      console.log(`  Max:    ${result.time.max.toFixed(3)}`);
      
      console.log('\nMemory (bytes):');
      console.log(`  Mean:   ${Math.round(result.memory.mean)}`);
      console.log(`  Median: ${Math.round(result.memory.median)}`);
      console.log(`  P95:    ${Math.round(result.memory.p95)}`);
      console.log(`  Min:    ${Math.round(result.memory.min)}`);
      console.log(`  Max:    ${Math.round(result.memory.max)}`);
      console.log('\n---\n');
    });
  }
}

async function runPerfTests() {
  const perfTest = new PerfTest();
  
  // Test data
  const simpleData = { value: 'test' };
  const complexData = {
    deep: { nested: { object: { with: { many: { levels: 'test' } } } } },
    array: Array(100).fill({ value: 'test' })
  };
  
  // Test functions
  const simpleFuncs = {
    test: () => 'result'
  };
  const complexFuncs = {
    process: (arg) => arg.split(',').reverse().join('|'),
    calculate: (...args) => args.reduce((a, b) => a + parseInt(b), 0)
  };

  // 1. Template Creation Performance
  await perfTest.measure('Template Creation', () => {
    Tpl();
    Tpl({ functions: true });
    Tpl({ start: '[[', end: ']]' });
  });

  // 2. Simple Variable Substitution
  const simpleTemplate = Tpl();
  await perfTest.measure('Simple Variable', () => {
    simpleTemplate('${value}', simpleData);
  });

  // 3. Deep Path Navigation
  const deepTemplate = Tpl();
  await perfTest.measure('Deep Path Navigation', () => {
    deepTemplate('${deep.nested.object.with.many.levels}', complexData);
  });

  // 4. Multiple Variables
  const multiVarTemplate = Tpl();
  const multiVarData = { v1: 'one', v2: 'two', v3: 'three', v4: 'four', v5: 'five' };
  await perfTest.measure('Multiple Variables', () => {
    multiVarTemplate('${v1} ${v2} ${v3} ${v4} ${v5}', multiVarData);
  });

  // 5. Simple Function Processing
  const simpleFuncTemplate = Tpl({ functions: true });
  await perfTest.measure('Simple Function', () => {
    simpleFuncTemplate('#{test}', simpleFuncs);
  });

  // 6. Complex Function Processing
  const complexFuncTemplate = Tpl({ functions: true });
  await perfTest.measure('Complex Function', () => {
    complexFuncTemplate('#{process:a,b,c,d,e} #{calculate:1:2:3:4:5}', complexFuncs);
  });

  // 7. Large Template Processing
  const largeTemplate = Tpl();
  const largeData = {};
  const largeTemplateStr = Array(1000).fill('${key}').join(' ');
  for (let i = 0; i < 1000; i++) {
    largeData[`key${i}`] = `value${i}`;
  }
  await perfTest.measure('Large Template', () => {
    largeTemplate(largeTemplateStr, largeData);
  });

  // 8. Array Access Pattern
  const arrayTemplate = Tpl();
  await perfTest.measure('Array Access', () => {
    for (let i = 0; i < 100; i++) {
      arrayTemplate('${array.0.value}', complexData);
    }
  });

  // 9. Custom Delimiter Performance
  const customTemplate = Tpl({ start: '<!--{{', end: '}}-->' });
  await perfTest.measure('Custom Delimiters', () => {
    customTemplate('<!--{{value}}-->', simpleData);
  });

  // 10. Mixed Complex Operations
  const mixedTemplate = Tpl({ functions: true });
  await perfTest.measure('Mixed Operations', () => {
    mixedTemplate(
      '#{process:${deep.nested.object.with.many.levels}} #{calculate:1:${value}}',
      { ...complexData, ...simpleData },
      { ...complexFuncs }
    );
  });

  // Print results
  perfTest.printResults();
}

// Run the tests
runPerfTests().catch(console.error);

module.exports = { PerfTest };