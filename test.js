const createSubstrate = require('./substrate.js');
const createTemplate = require('./nano-var-template.js');

const vars = {
  user: { name: 'John' },
  theme: { primary: 'blue' }
};

const funcs = {
  upper: str => str.toUpperCase()
};

// First use substrate to convert syntax
const substrate = createSubstrate()
  .withVariables(vars)
  .withFunctions(funcs)
  .withComponents({ Button: true });

const template = '<Button foo="thing" :label="user.name" :color="theme.primary">{{ upper(`hello user.name`) }}</Button>';
const converted = substrate.convert(template);
console.log("BEFORE substrate:", template);
console.log("AFTER substrate:", converted);

// Now let's see what nano-var-template does
const varTemplate = createTemplate();

const funcTemplate = createTemplate({ functions: true });
const final = funcTemplate(converted, funcs);
console.log("\nAfter func template:", final);