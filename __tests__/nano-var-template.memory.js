// __tests__/nano-var-template.memory.js
const Tpl = require('../nano-var-template.js');

class MemoryLeakDetector {
  constructor(options = {}) {
    this.iterations = options.iterations || 10000;
    this.threshold = options.threshold || 0.1; // 10% growth threshold
    this.stabilizationRounds = options.stabilizationRounds || 3;
    this.gcCollections = options.gcCollections || 10;
    this.results = [];
  }

  async forceGC() {
    if (global.gc) {
      for (let i = 0; i < this.gcCollections; i++) {
        global.gc();
        // Small delay to ensure GC has completed
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      rss: usage.rss
    };
  }

  calculateGrowthRate(measurements) {
    if (measurements.length < 2) return 0;
    
    // Use linear regression to calculate growth rate
    const n = measurements.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    measurements.forEach((memory, i) => {
      sumX += i;
      sumY += memory;
      sumXY += i * memory;
      sumXX += i * i;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const averageMemory = sumY / n;
    
    // Return growth rate as percentage per iteration
    return (slope / averageMemory) * 100;
  }

  async detectLeak(name, testFn) {
    console.log(`\nTesting for memory leaks in: ${name}`);
    console.log('Warming up and stabilizing memory...');

    // Initial warmup
    for (let i = 0; i < 1000; i++) {
      await testFn();
    }
    await this.forceGC();

    // Main test
    const measurements = [];
    const samplingInterval = Math.floor(this.iterations / 100); // Take 100 samples

    for (let i = 0; i < this.iterations; i++) {
      await testFn();

      if (i % samplingInterval === 0) {
        await this.forceGC();
        measurements.push(this.getMemoryUsage().heapUsed);
      }
    }
    await this.forceGC();

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(measurements);
    
    // Check for stabilization
    const stabilizationMeasurements = [];
    console.log('Checking memory stabilization...');
    
    for (let round = 0; round < this.stabilizationRounds; round++) {
      await this.forceGC();
      stabilizationMeasurements.push(this.getMemoryUsage().heapUsed);
    }

    const stabilizationVariance = this.calculateVariance(stabilizationMeasurements);
    const isStable = stabilizationVariance < (this.threshold * stabilizationMeasurements[0]);

    const result = {
      name,
      iterations: this.iterations,
      growthRate,
      isStable,
      stabilizationVariance,
      measurements,
      finalMemory: this.getMemoryUsage(),
      hasLeak: growthRate > this.threshold || !isStable
    };

    this.results.push(result);
    this.printTestResult(result);
    
    return result;
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  printTestResult(result) {
    console.log('\nResults:');
    console.log(`Test: ${result.name}`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Memory Growth Rate: ${result.growthRate.toFixed(4)}% per iteration`);
    console.log(`Memory Stable: ${result.isStable}`);
    console.log(`Stabilization Variance: ${result.stabilizationVariance.toFixed(2)} bytes`);
    console.log(`Leak Detected: ${result.hasLeak}`);
    console.log('\nFinal Memory State:');
    Object.entries(result.finalMemory).forEach(([key, value]) => {
      console.log(`  ${key}: ${(value / 1024 / 1024).toFixed(2)} MB`);
    });
    console.log('\n---');
  }

  printSummary() {
    console.log('\nMemory Leak Detection Summary:');
    console.log('=============================\n');
    
    const leaks = this.results.filter(r => r.hasLeak);
    const stable = this.results.filter(r => !r.hasLeak);
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed (No Leaks): ${stable.length}`);
    console.log(`Failed (Potential Leaks): ${leaks.length}\n`);
    
    if (leaks.length > 0) {
      console.log('Tests with potential memory leaks:');
      leaks.forEach(result => {
        console.log(`- ${result.name} (Growth Rate: ${result.growthRate.toFixed(4)}%)`);
      });
    }
  }
}

async function runMemoryTests() {
  const detector = new MemoryLeakDetector({
    iterations: 10000,
    threshold: 0.1,
    stabilizationRounds: 3,
    gcCollections: 10
  });

  // Test 1: Basic template creation
  await detector.detectLeak('Template Creation', () => {
    Tpl();
    Tpl({ functions: true });
  });

  // Test 2: Simple variable substitution with reused template
  const simpleTemplate = Tpl();
  const simpleData = { value: 'test' };
  await detector.detectLeak('Simple Variable Substitution', () => {
    simpleTemplate('${value}', simpleData);
  });

  // Test 3: Deep object access
  const deepTemplate = Tpl();
  const deepData = {
    level1: { level2: { level3: { level4: { value: 'test' } } } }
  };
  await detector.detectLeak('Deep Object Access', () => {
    deepTemplate('${level1.level2.level3.level4.value}', deepData);
  });

  // Test 4: Large template processing
  const largeTemplate = Tpl();
  const largeData = {};
  const variables = Array(1000).fill('${key}').join(' ');
  for (let i = 0; i < 1000; i++) {
    largeData[`key${i}`] = `value${i}`;
  }
  await detector.detectLeak('Large Template Processing', () => {
    largeTemplate(variables, largeData);
  });

  // Test 5: Function processing
  const funcTemplate = Tpl({ functions: true });
  const funcs = {
    test: (arg) => `processed-${arg}`,
    complex: (...args) => args.join(',')
  };
  await detector.detectLeak('Function Processing', () => {
    funcTemplate('#{test:arg} #{complex:1:2:3:4:5}', funcs);
  });

  // Test 6: Mixed variable and function processing
  const mixedTemplate = Tpl({ functions: true });
  const mixedData = {
    value: 'test',
    process: (arg) => `processed-${arg}`
  };
  await detector.detectLeak('Mixed Processing', () => {
    mixedTemplate('${value} #{process:${value}}', mixedData);
  });

  // Test 7: Template with custom delimiters
  const customTemplate = Tpl({ start: '[[', end: ']]' });
  await detector.detectLeak('Custom Delimiters', () => {
    customTemplate('[[value]]', simpleData);
  });

  // Test 8: Rapid template creation and destruction
  await detector.detectLeak('Template Lifecycle', () => {
    const template = Tpl();
    template('${value}', simpleData);
  });

  // Print summary of all tests
  detector.printSummary();
}

// Run with --expose-gc flag
if (!global.gc) {
  console.log('This script must be run with --expose-gc flag:');
  console.log('node --expose-gc __tests__/nano-var-template.memory.js');
  process.exit(1);
}

runMemoryTests().catch(console.error);

module.exports = { MemoryLeakDetector };