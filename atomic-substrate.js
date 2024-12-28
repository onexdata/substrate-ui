// atomic-substrate.js
// Creates a single, atomic substrate that performs one pattern replacement across an entire string

const createSubstrate = (options = {}) => {
    // Default pattern matches ${variable} style
    const pattern = options.pattern || /\${([^}]+)}/g;
    
    // Return a function that processes a template with a scope
    return (template, scope = {}) => {
      if (!template) return '';
      if (!scope) return template;
      
      // Single pass replacement of all matches
      return template.replace(pattern, (fullMatch, token) => {
        return scope[token] ?? fullMatch;
      });
    };
  };
  
  // Helper to chain multiple substrates
  const chainSubstrates = (substrates) => {
    return (template, scopes = []) => {
      return substrates.reduce((result, substrate, index) => 
        substrate(result, scopes[index] || {}),
        template
      );
    };
  };
  
  module.exports = {
    createSubstrate,
    chainSubstrates
  };
  
  // Example usage:
  /*
  const { createSubstrate, chainSubstrates } = require('./atomic-substrate');
  
  // Create individual substrates
  const variables = createSubstrate();  // Uses default ${} pattern
  const functions = createSubstrate({ pattern: /#{([^}]+)}/g });
  const components = createSubstrate({ pattern: /@{([^}]+)}/g });
  
  // Chain them together
  const process = chainSubstrates([variables, functions, components]);
  
  // Use them
  const template = 'Hello ${name}! #{format} @{Button}';
  const scopes = [
    { name: 'John' },                    // variables scope
    { format: 'Welcome!' },              // functions scope
    { Button: '<button>Click</button>' } // components scope
  ];
  
  const result = process(template, scopes);
  // Result: "Hello John! Welcome! <button>Click</button>"
  */