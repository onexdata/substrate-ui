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
console.log(result)