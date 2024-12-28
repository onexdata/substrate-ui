// __tests__/complex-variables.test.js
const createSubstrate = require('../substrate.js');

describe('Complex Variable Handling', () => {
  // Complex test fixtures with deeply nested structures
  const complexVars = {
    app: {
      settings: {
        theme: {
          colors: {
            primary: {
              main: '#1a73e8',
              light: '#4285f4',
              dark: '#0d47a1',
              contrast: {
                text: '#ffffff',
                border: '#e8f0fe'
              }
            },
            secondary: {
              main: '#34a853',
              light: '#66bb6a',
              dark: '#1b5e20',
              contrast: {
                text: '#ffffff',
                border: '#e8f4e8'
              }
            }
          },
          spacing: {
            units: {
              base: '4px',
              multipliers: [1, 2, 4, 8, 16]
            }
          }
        }
      }
    },
    user: {
      profile: {
        personal: {
          name: {
            first: 'John',
            middle: 'Robert',
            last: 'Doe',
            prefix: 'Dr',
            suffix: 'Jr'
          },
          contact: {
            email: {
              primary: 'john@example.com',
              secondary: ['work@example.com', 'other@example.com'],
              preferences: {
                notifications: {
                  marketing: false,
                  updates: true,
                  security: {
                    twoFactor: true,
                    backup: {
                      enabled: true,
                      method: 'authenticator'
                    }
                  }
                }
              }
            }
          }
        }
      },
      preferences: {
        dashboard: {
          widgets: [
            {
              id: 1,
              type: 'chart',
              settings: {
                refresh: '5m',
                display: {
                  mode: 'dark',
                  size: 'large'
                }
              }
            },
            {
              id: 2,
              type: 'list',
              settings: {
                refresh: '1m',
                display: {
                  mode: 'light',
                  size: 'medium'
                }
              }
            }
          ],
          layout: {
            grid: {
              columns: {
                desktop: 12,
                tablet: 8,
                mobile: 4
              },
              spacing: {
                x: 16,
                y: 24
              }
            }
          }
        }
      }
    },
    data: {
      collections: {
        items: [
          { id: 1, name: 'Item 1', tags: ['tag1', 'tag2'] },
          { id: 2, name: 'Item 2', tags: ['tag2', 'tag3'] }
        ],
        metadata: {
          lastUpdated: '2024-01-01',
          version: '1.0.0',
          status: {
            sync: {
              state: 'complete',
              details: {
                lastSync: '2024-01-01T12:00:00Z',
                nextSync: '2024-01-02T12:00:00Z'
              }
            }
          }
        }
      }
    }
  };

  let substrate;

  beforeEach(() => {
    substrate = createSubstrate()
      .withVariables(complexVars)
      .withFunctions({})
      .withComponents({ Card: true, Button: true, Text: true });
  });

  describe('Deep Path Navigation', () => {
    test('should handle 5-level deep color values', () => {
      const template = '<Card :color="app.settings.theme.colors.primary.main" />';
      const result = substrate.convert(template);
      expect(result[0].props.color).toBe('#1a73e8');
    });

    test('should handle 6-level deep contrast values', () => {
      const template = '<Text :color="app.settings.theme.colors.primary.contrast.text" />';
      const result = substrate.convert(template);
      expect(result[0].props.color).toBe('#ffffff');
    });

    test('should handle deeply nested user profile data', () => {
      const template = '<Card :title="user.profile.personal.name.prefix" />';
      const result = substrate.convert(template);
      expect(result[0].props.title).toBe('Dr');
    });
  });

  describe('Array Access', () => {
    test('should handle array access in theme spacing', () => {
      const template = '<Card :spacing="app.settings.theme.spacing.units.multipliers.0" />';
      const result = substrate.convert(template);
      expect(result[0].props.spacing).toBe(1);
    });

    test('should handle nested array access in user preferences', () => {
      const template = '<Card :type="user.preferences.dashboard.widgets.0.type" />';
      const result = substrate.convert(template);
      expect(result[0].props.type).toBe('chart');
    });

    test('should handle deep array access with nested objects', () => {
      const template = '<Button :mode="user.preferences.dashboard.widgets.1.settings.display.mode" />';
      const result = substrate.convert(template);
      expect(result[0].props.mode).toBe('light');
    });
  });

  describe('Complex Object Navigation', () => {
    test('should handle multiple deep paths in single template', () => {
      const template = `
        <Card 
          :primary-color="app.settings.theme.colors.primary.main"
          :secondary-color="app.settings.theme.colors.secondary.main"
          :contrast="app.settings.theme.colors.primary.contrast.text"
          :user-name="user.profile.personal.name.first"
          :email="user.profile.personal.contact.email.primary"
          :widget-type="user.preferences.dashboard.widgets.0.type"
          :grid-columns="user.preferences.dashboard.layout.grid.columns.desktop"
        />
      `;
      const result = substrate.convert(template);
      
      expect(result[0].props).toEqual({
        'primary-color': '#1a73e8',
        'secondary-color': '#34a853',
        'contrast': '#ffffff',
        'user-name': 'John',
        'email': 'john@example.com',
        'widget-type': 'chart',
        'grid-columns': 12
      });
    });

    test('should handle deeply nested security settings', () => {
      const template = `
        <Card 
          :two-factor="user.profile.personal.contact.email.preferences.notifications.security.twoFactor"
          :backup-method="user.profile.personal.contact.email.preferences.notifications.security.backup.method"
        />
      `;
      const result = substrate.convert(template);
      
      expect(result[0].props).toEqual({
        'two-factor': true,
        'backup-method': 'authenticator'
      });
    });
  });

  describe('Error Handling for Deep Paths', () => {
    test('should throw error for invalid deep path', () => {
      const template = '<Card :color="app.settings.theme.colors.nonexistent.value" />';
      expect(() => substrate.convert(template)).toThrow();
    });

    test('should throw error for invalid array index', () => {
      const template = '<Card :widget="user.preferences.dashboard.widgets.999.type" />';
      expect(() => substrate.convert(template)).toThrow();
    });

    test('should throw error for accessing array as object', () => {
      const template = '<Card :email="user.profile.personal.contact.email.secondary.primary" />';
      expect(() => substrate.convert(template)).toThrow();
    });
  });

  describe('Mixed Data Types', () => {
    test('should handle mixed data types in collections', () => {
      const template = `
        <Card 
          :item-name="data.collections.items.0.name"
          :item-tag="data.collections.items.0.tags.0"
          :sync-state="data.collections.metadata.status.sync.state"
          :last-sync="data.collections.metadata.status.sync.details.lastSync"
        />
      `;
      const result = substrate.convert(template);
      
      expect(result[0].props).toEqual({
        'item-name': 'Item 1',
        'item-tag': 'tag1',
        'sync-state': 'complete',
        'last-sync': '2024-01-01T12:00:00Z'
      });
    });
  });

  describe('Complex String Interpolation', () => {
    test('should handle multiple variable interpolation in text', () => {
      const template = `
        <Text>
          {{ upper(\`Welcome \${user.profile.personal.name.prefix} \${user.profile.personal.name.first} \${user.profile.personal.name.last} \${user.profile.personal.name.suffix}!\`) }}
        </Text>
      `;
      const result = substrate.convert(template);
      expect(result[0].children.body).toBe('WELCOME DR JOHN DOE JR!');
    });
    
    test('should handle deep path interpolation in attributes', () => {
      const template = `
        <Card 
          :style="app.settings.theme.colors.primary.main"
          :greeting="user.profile.personal.name.prefix + ' ' + user.profile.personal.name.first"
        />
      `;
      const result = substrate.convert(template);
      expect(result[0].props.style).toBe('#1a73e8');
      expect(result[0].props.greeting).toBe('Dr John');
    });
  });
});