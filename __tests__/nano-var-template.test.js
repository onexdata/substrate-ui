// __tests__/nano-var-template.test.js
const Tpl = require('../nano-var-template.js');

describe('nano-var-template', () => {
  describe('Configuration Options', () => {
    test('should use default settings when no options provided', () => {
      const tpl = Tpl();
      const result = tpl('${test}', { test: 'value' });
      expect(result).toBe('value');
    });

    test('should use default function settings when functions enabled', () => {
      const tpl = Tpl({ functions: true });
      const result = tpl('#{test:arg}', { test: arg => `processed-${arg}` });
      expect(result).toBe('processed-arg');
    });

    describe('Custom Delimiters', () => {
      test('should handle custom start/end delimiters', () => {
        const tpl = Tpl({ start: '<<', end: '>>' });
        const result = tpl('<<test>>', { test: 'value' });
        expect(result).toBe('value');
      });

      test('should handle special regex characters in delimiters', () => {
        const tpl = Tpl({ start: '(*', end: '*)' });
        const result = tpl('(*test*)', { test: 'value' });
        expect(result).toBe('value');
      });

      test('should handle very long delimiters', () => {
        const tpl = Tpl({ start: '<!--{{', end: '}}-->' });
        const result = tpl('<!--{{test}}-->', { test: 'value' });
        expect(result).toBe('value');
      });

      test('should handle emoji delimiters', () => {
        const tpl = Tpl({ start: '🔥', end: '🔥' });
        const result = tpl('🔥test🔥', { test: 'value' });
        expect(result).toBe('value');
      });
    });

    describe('Path Customization', () => {
      test('should handle custom path regex', () => {
        const tpl = Tpl({
          path: '[A-Z_][A-Z0-9_]*'  // Only uppercase variables
        });
        expect(tpl('${TEST_VAR}', { TEST_VAR: 'value' })).toBe('value');
        expect(tpl('${invalidVar}', { invalidVar: 'value' })).toBe('${invalidVar}');
      });

      test('should handle complex path patterns', () => {
        const tpl = Tpl({
          path: '[a-z]+\\[[0-9]+\\](?:\\.[a-z]+)*'  // Array access pattern
        });
        expect(tpl('${arr[0].prop}', { 'arr[0]': { prop: 'value' } })).toBe('value');
      });

      test('should handle paths with special characters when allowed', () => {
        const tpl = Tpl({
          path: '[a-z0-9_$@#]+'
        });
        expect(tpl('${@special#var}', { '@special#var': 'value' })).toBe('value');
      });
    });
  });

  describe('Variable Processing', () => {
    test('should process simple variables', () => {
      const tpl = Tpl();
      expect(tpl('${var}', { var: 'value' })).toBe('value');
    });

    test('should process multiple variables in one template', () => {
      const tpl = Tpl();
      const result = tpl('${var1} and ${var2}', { var1: 'first', var2: 'second' });
      expect(result).toBe('first and second');
    });

    test('should process nested path variables', () => {
      const tpl = Tpl();
      const data = { user: { profile: { name: 'John' } } };
      expect(tpl('${user.profile.name}', data)).toBe('John');
    });

    test('should process variables with whitespace in template', () => {
      const tpl = Tpl();
      expect(tpl('${ var }', { var: 'value' })).toBe('value');
      expect(tpl('${  var  }', { var: 'value' })).toBe('value');
    });
  });

  describe('Function Processing', () => {
    const functionScope = {
      simple: () => 'result',
      withArgs: (arg) => `processed-${arg}`,
      multiArgs: (arg1, arg2) => `${arg1}-${arg2}`,
      withColon: (arg) => arg.includes(':') ? 'has colon' : 'no colon',
      complex: (args) => args.split(',').join('|')
    };

    test('should process simple functions', () => {
      const tpl = Tpl({ functions: true });
      expect(tpl('#{simple}', functionScope)).toBe('result');
    });

    test('should process functions with arguments', () => {
      const tpl = Tpl({ functions: true });
      expect(tpl('#{withArgs:test}', functionScope)).toBe('processed-test');
    });

    test('should process functions with multiple arguments', () => {
      const tpl = Tpl({ functions: true });
      expect(tpl('#{multiArgs:first:second}', functionScope))
        .toBe('first-second');
    });

    test('should handle colons in function arguments', () => {
      const tpl = Tpl({ functions: true });
      expect(tpl('#{withColon:text:with:colons}', functionScope))
        .toBe('has colon');
    });

    test('should process complex function arguments', () => {
      const tpl = Tpl({ functions: true });
      expect(tpl('#{complex:a,b,c}', functionScope)).toBe('a|b|c');
    });
  });

  describe('Error Handling', () => {
    describe('With Warning Enabled (Default)', () => {
      test('should throw error for undefined variables', () => {
        const tpl = Tpl();
        expect(() => tpl('${undefined.var}', {})).toThrow();
      });

      test('should throw error for undefined functions', () => {
        const tpl = Tpl({ functions: true });
        expect(() => tpl('#{undefined:arg}', {})).toThrow();
      });

      test('should throw error for invalid nested paths', () => {
        const tpl = Tpl();
        expect(() => tpl('${a.b.c}', { a: {} })).toThrow();
      });
    });

    describe('With Warning Disabled', () => {
      test('should silently skip undefined variables', () => {
        const tpl = Tpl({ warn: false });
        expect(tpl('${undefined.var}', {})).toBe('undefined');
      });

      test('should silently skip undefined functions', () => {
        const tpl = Tpl({ functions: true, warn: false });
        expect(tpl('#{undefined:arg}', {})).toBe('undefined');
      });

      test('should silently skip invalid nested paths', () => {
        const tpl = Tpl({ warn: false });
        expect(tpl('${a.b.c}', { a: {} })).toBe('undefined');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty template', () => {
      const tpl = Tpl();
      expect(tpl('', {})).toBe('');
    });

    test('should handle template with only delimiters', () => {
      const tpl = Tpl();
      expect(tpl('${}', {})).toBe('${}');
    });

    test('should handle null/undefined data', () => {
      const tpl = Tpl();
      expect(() => tpl('${var}', null)).toThrow();
      expect(() => tpl('${var}', undefined)).toThrow();
    });

    test('should handle special characters in variable names', () => {
      const tpl = Tpl({
        path: '[a-z0-9_$@#\\[\\]\\(\\)\\{\\}]+' // Allow special characters
      });
      const data = {
        '@special': 'value1',
        '#var': 'value2',
        '[0]': 'value3',
        '{key}': 'value4'
      };
      expect(tpl('${@special}', data)).toBe('value1');
      expect(tpl('${#var}', data)).toBe('value2');
      expect(tpl('${[0]}', data)).toBe('value3');
      expect(tpl('${{key}}', data)).toBe('value4');
    });

    test('should handle nested function calls', () => {
      const tpl = Tpl({ functions: true });
      const funcs = {
        outer: (arg) => `out(${arg})`,
        inner: (arg) => `in(${arg})`
      };
      // Note: Direct nesting isn't supported, but can verify each function works
      expect(tpl('#{outer:test}#{inner:test}', funcs)).toBe('out(test)in(test)');
    });
  });

  describe('Performance Edge Cases', () => {
    test('should handle large templates', () => {
      const tpl = Tpl();
      const template = Array(1000).fill('${var}').join(' ');
      const result = tpl(template, { var: 'value' });
      expect(result).toBe(Array(1000).fill('value').join(' '));
    });

    test('should handle deeply nested paths', () => {
      const tpl = Tpl();
      let data = { level: 'value' };
      let path = 'level';
      // Create 100 levels of nesting
      for (let i = 0; i < 100; i++) {
        const newData = {};
        newData[`level${i}`] = data;
        data = newData;
        path = `level${i}.${path}`;
      }
      expect(tpl(`\${${path}}`, data)).toBe('value');
    });

    test('should handle many concurrent function calls', () => {
      const tpl = Tpl({ functions: true });
      const funcs = {
        test: (arg) => `processed-${arg}`
      };
      const template = Array(100)
        .fill('#{test:arg}')
        .join('');
      const expected = Array(100)
        .fill('processed-arg')
        .join('');
      expect(tpl(template, funcs)).toBe(expected);
    });
  });
});