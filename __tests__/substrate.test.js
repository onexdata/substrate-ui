// __tests__/substrate.test.js
const createSubstrate = require('../substrate.js');

describe('Substrate UI Template Engine', () => {
  // Test fixtures
  const defaultVars = {
    user: { 
      name: 'John',
      role: 'admin'
    },
    theme: { 
      primary: 'blue',
      secondary: 'green'
    }
  };

  const defaultFuncs = {
    upper: str => str.toUpperCase(),
    lower: str => str.toLowerCase(),
    greet: name => `Hello, ${name}!`
  };

  const defaultComponents = {
    Button: true,
    Card: true,
    Icon: true
  };

  let substrate;

  beforeEach(() => {
    // Fresh instance before each test
    substrate = createSubstrate()
      .withVariables(defaultVars)
      .withFunctions(defaultFuncs)
      .withComponents(defaultComponents);
  });

  describe('Basic Functionality', () => {
    test('should initialize with default options', () => {
      const instance = createSubstrate();
      expect(instance).toHaveProperty('withVariables');
      expect(instance).toHaveProperty('withFunctions');
      expect(instance).toHaveProperty('withComponents');
      expect(instance).toHaveProperty('convert');
    });

    test('should chain configuration methods', () => {
      const instance = createSubstrate()
        .withVariables({})
        .withFunctions({})
        .withComponents({});
      
      expect(instance).toHaveProperty('convert');
    });
  });

  describe('Variable Substitution', () => {
    test('should substitute simple variables', () => {
      const template = '<Button :label="user.name" />';
      const result = substrate.convert(template);
      
      expect(result).toHaveLength(1);
      expect(result[0].props.label).toBe('John');
    });

    test('should handle nested variable paths', () => {
      const template = '<Button :color="theme.secondary" />';
      const result = substrate.convert(template);
      
      expect(result[0].props.color).toBe('green');
    });

    test('should throw error for undefined variables', () => {
      const template = '<Button :label="undefined.variable" />';
      expect(() => substrate.convert(template)).toThrow();
    });
  });

  describe('Function Processing', () => {
    test('should process single function call', () => {
      const template = '<Button>{{ upper(`hello`) }}</Button>';
      const result = substrate.convert(template);
      
      expect(result[0].children.body).toBe('HELLO');
    });

    test('should process function with variable arguments', () => {
      const template = '<Button>{{ greet(user.name) }}</Button>';
      const result = substrate.convert(template);
      
      expect(result[0].children.body).toBe('Hello, John!');
    });

    test('should process multiple functions in one template', () => {
      const template = `
        <Card>
          {{ upper(\`hello\`) }}
          {{ lower(\`WORLD\`) }}
        </Card>
      `;
      const result = substrate.convert(template);
      
      expect(result[0].children.body).toContain('HELLO');
      expect(result[0].children.body).toContain('world');
    });
  });

  describe('Component Processing', () => {
    test('should process simple component', () => {
      const template = '<Button />';
      const result = substrate.convert(template);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    test('should handle nested components', () => {
      const template = `
        <Card>
          <Button />
        </Card>
      `;
      const result = substrate.convert(template);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Card');
    });

    test('should throw error for undefined components', () => {
      const template = '<UndefinedComponent />';
      expect(() => substrate.convert(template)).toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle complex nested template with all features', () => {
      const template = `
        <Card :theme="theme.primary">
          <Button 
            :label="user.name" 
            :color="theme.secondary"
            disabled="true">
            {{ upper(\`Welcome \${user.role}\`) }}
          </Button>
        </Card>
      `;
      const result = substrate.convert(template);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Card');
      expect(result[0].props.theme).toBe('blue');
    });

    test('should handle multiple attributes with mixed binding', () => {
      const template = `
        <Button 
          :label="user.name"
          :color="theme.primary"
          disabled="true"
          data-test="static"
          :role="user.role">
          {{ upper(\`Complex\`) }}
        </Button>
      `;
      const result = substrate.convert(template);
      
      expect(result[0].props).toEqual(expect.objectContaining({
        label: 'John',
        color: 'blue',
        disabled: 'true',
        'data-test': 'static',
        role: 'admin'
      }));
    });
  });

  describe('String Output Mode', () => {
    let stringSubstrate;

    beforeEach(() => {
      stringSubstrate = createSubstrate()
        .withVariables(defaultVars)
        .withFunctions(defaultFuncs)
        .withComponents(defaultComponents, false);
    });

    test('should output string format when configured', () => {
      const template = '<Button :label="user.name">{{ upper(`Click me!`) }}</Button>';
      const result = stringSubstrate.convert(template);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Button');
      expect(result).toContain('John');
      expect(result).toContain('CLICK ME!');
    });
  });
});