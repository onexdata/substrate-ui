const createSubstrate = require('./substrate.js');

// Test data
const vars = {
  user: { 
    name: 'John',
    role: 'admin'
  },
  theme: { 
    primary: 'blue',
    secondary: 'green'
  }
};

const funcs = {
  upper: str => str.toUpperCase(),
  lower: str => str.toLowerCase(),
  greet: name => `Hello, ${name}!`
};

const components = {
  Button: true,
  Card: true,
  Icon: true
};

// Create substrate instance
const substrate = createSubstrate()
  .withVariables(vars)
  .withFunctions(funcs)
  .withComponents(components);

// Test cases
console.log('\n1. Basic variable substitution:');
const template1 = '<Button :label="user.name" />';
console.log('Input:', template1);
console.log('Output:', JSON.stringify(substrate.convert(template1), null, 2));

console.log('\n2. Function processing:');
const template2 = '<Button>{{ upper(`hello user.name`) }}</Button>';
console.log('Input:', template2);
console.log('Output:', JSON.stringify(substrate.convert(template2), null, 2));

console.log('\n3. Complex nested example:');
const template3 = `
<Card :theme="theme.primary">
  <Button :label="user.name" :color="theme.secondary">
    {{ upper(\`Welcome \${user.role}\`) }}
  </Button>
</Card>`;
console.log('Input:', template3);
console.log('Output:', JSON.stringify(substrate.convert(template3), null, 2));

console.log('\n4. Component validation test:');
try {
  const template4 = '<InvalidComponent />';
  substrate.convert(template4);
} catch (error) {
  console.log('Error caught successfully:', error.message);
}

console.log('\n5. String output test:');
const stringSubstrate = createSubstrate()
  .withVariables(vars)
  .withFunctions(funcs)
  .withComponents(components, false); // false to get string output

const template5 = '<Button :label="user.name">{{ upper(`Click me!`) }}</Button>';
console.log('Input:', template5);
console.log('Output:', stringSubstrate.convert(template5));

// Test multiple functions in one template
console.log('\n6. Multiple functions test:');
const template6 = `
<Card>
  {{ upper(\`hello \${user.name}\`) }}
  {{ lower(\`WELCOME \${user.role}\`) }}
  {{ greet(user.name) }}
</Card>`;
console.log('Input:', template6);
console.log('Output:', JSON.stringify(substrate.convert(template6), null, 2));

// Test error handling for undefined variables
console.log('\n7. Undefined variable test:');
try {
  const template7 = '<Button :label="undefined.variable" />';
  substrate.convert(template7);
} catch (error) {
  console.log('Error caught successfully:', error.message);
}

// Test complex attribute combinations
console.log('\n8. Complex attributes test:');
const template8 = `
<Button 
  :label="user.name"
  :color="theme.primary"
  disabled="true"
  data-test="static"
  :role="user.role">
  {{ upper(\`Complex \${user.role}\`) }}
</Button>`;
console.log('Input:', template8);
console.log('Output:', JSON.stringify(substrate.convert(template8), null, 2));