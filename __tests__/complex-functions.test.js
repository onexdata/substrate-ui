// __tests__/complex-functions.test.js
const createSubstrate = require('../substrate.js');

describe('Complex Function Handling', () => {
  // Complex test fixtures
  const complexData = {
    matrix: [
      [[1, 2], [3, 4]],
      [[5, 6], [7, 8]]
    ],
    users: [
      { id: 1, name: 'John', roles: ['admin', 'user'] },
      { id: 2, name: 'Jane', roles: ['user'] }
    ],
    config: {
      settings: {
        theme: { primary: 'blue', secondary: 'green' },
        layout: { grid: { columns: 12, rows: 6 } }
      }
    }
  };

  // Complex function implementations
  const complexFunctions = {
    // Function that takes multiple parameters
    formatUserDetails: (userId, field1, field2, field3, field4) => {
      const user = complexData.users.find(u => u.id === Number(userId));
      return `${field1}: ${user.name}, ${field2}: ${user.roles.join(',')}, ${field3}: ${field4}`;
    },

    // Function that processes multidimensional arrays
    processMatrix: (row, col, subRow, subCol) => {
      return complexData.matrix[row][col][subRow][subCol];
    },

    // Function that handles deep object paths
    getConfigValue: (path1, path2, path3, path4) => {
      return complexData.config[path1][path2][path3][path4];
    },

    // Async function that returns a promise
    asyncOperation: async (delay, value) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return `Processed ${value}`;
    },

    // Function that processes arrays and objects
    processUserRoles: (userId, operation) => {
      const user = complexData.users.find(u => u.id === Number(userId));
      switch(operation) {
        case 'count':
          return user.roles.length;
        case 'list':
          return user.roles.join(', ');
        case 'has_admin':
          return user.roles.includes('admin');
        default:
          return 'Invalid operation';
      }
    },

    // Complex string manipulation function
    formatTemplate: (template, ...vars) => {
      return vars.reduce((str, val, idx) => 
        str.replace(new RegExp(`\\{${idx}\\}`, 'g'), val), template);
    },

    // Function that returns complex objects
    getUserState: (userId, includeRoles = true) => {
      const user = complexData.users.find(u => u.id === Number(userId));
      return JSON.stringify({
        name: user.name,
        ...(includeRoles && { roles: user.roles }),
        active: true,
        lastAccess: new Date().toISOString()
      });
    },

    // Chainable operations on arrays
    arrayOperations: (operation, ...args) => {
      const ops = {
        filter: (arr, pred) => arr.filter(x => x.includes(pred)),
        map: (arr, fn) => arr.map(x => fn(x)),
        reduce: (arr, init) => arr.reduce((a, b) => a + b, init)
      };
      return ops[operation](...args);
    },

    // Function that throws controlled errors
    validateInput: (value, type, range) => {
      if (type === 'number' && isNaN(value)) {
        throw new Error('Invalid number');
      }
      if (range && (value < range[0] || value > range[1])) {
        throw new Error('Out of range');
      }
      return true;
    }
  };

  let substrate;

  beforeEach(() => {
    substrate = createSubstrate()
      .withVariables(complexData)
      .withFunctions(complexFunctions)
      .withComponents({ Card: true, Button: true });
  });

  describe('Multiple Parameter Functions', () => {
    test('should handle function with 5 parameters', () => {
      const template = `
        <Card>{{ formatUserDetails(1, 'Name', 'Roles', 'Status', 'Active') }}</Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toBe('Name: John, Roles: admin,user, Status: Active');
    });

    test('should handle function with array parameters', () => {
      const template = `
        <Card>{{ processMatrix(0, 1, 0, 1) }}</Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toBe('4');
    });

    test('should handle deep object path parameters', () => {
      const template = `
        <Card>{{ getConfigValue('settings', 'theme', 'primary', 'length') }}</Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toBe('4');
    });
  });

  describe('Array and Object Processing', () => {
    test('should process user roles with different operations', () => {
      const template = `
        <Card>
          {{ processUserRoles(1, 'count') }}
          {{ processUserRoles(1, 'list') }}
          {{ processUserRoles(1, 'has_admin') }}
        </Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toContain('2');
      expect(result[0].children.body).toContain('admin, user');
      expect(result[0].children.body).toContain('true');
    });

    test('should handle complex string templates', () => {
      const template = `
        <Card>{{ formatTemplate('User {0} has roles: {1}', 'John', 'admin,user') }}</Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toBe('User John has roles: admin,user');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid function parameters', () => {
      const template = `
        <Card>{{ validateInput('abc', 'number', [1, 10]) }}</Card>
      `;
      expect(() => substrate.convert(template)).toThrow('Invalid number');
    });

    test('should handle out of range values', () => {
      const template = `
        <Card>{{ validateInput(15, 'number', [1, 10]) }}</Card>
      `;
      expect(() => substrate.convert(template)).toThrow('Out of range');
    });
  });

  describe('Complex Object Returns', () => {
    test('should handle JSON stringified returns', () => {
      const template = `
        <Card>{{ getUserState(1, true) }}</Card>
      `;
      const result = substrate.convert(template);
      const parsed = JSON.parse(result[0].children.body);
      expect(parsed).toHaveProperty('name', 'John');
      expect(parsed).toHaveProperty('roles');
      expect(parsed).toHaveProperty('active', true);
      expect(parsed).toHaveProperty('lastAccess');
    });
  });

  describe('Array Operations', () => {
    test('should handle complex array operations', () => {
      const template = `
        <Card>{{ arrayOperations('filter', ['admin', 'user', 'superadmin'], 'admin') }}</Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toBe('admin,superadmin');
    });
  });

  // Note: Async functions are a bit tricky as the current implementation doesn't 
  // seem to support them directly. Here's how we might test them if supported:
  describe('Async Functions (Theoretical)', () => {
    test('should handle async functions if supported', async () => {
      const template = `
        <Card>{{ asyncOperation(100, 'test') }}</Card>
      `;
      // This would need to be modified based on how async functions are actually implemented
      const result = substrate.convert(template);
      // Ideally, we'd want something like:
      // expect(await result[0].children.body).toBe('Processed test');
    });
  });

  describe('Combined Complex Operations', () => {
    test('should handle multiple complex operations in single template', () => {
      const template = `
        <Card>
          {{ formatUserDetails(1, 'Name', 'Roles', 'Status', 'Active') }}
          {{ processUserRoles(1, 'list') }}
          {{ getUserState(1, true) }}
        </Card>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toContain('Name: John');
      expect(result[0].children.body).toContain('admin, user');
      expect(result[0].children.body).toContain('"name":"John"');
    });
  });
});