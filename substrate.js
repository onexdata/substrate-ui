function createSubstrate(options = {}) {
    options = Object.assign({
      variableStart: '${',
      variableEnd: '}',
      functionStart: '#{',
      functionEnd: '}',
      componentStart: '@{',
      componentEnd: '}',
      delimiter: ',',
    }, options);
  
    let variableScope = {};
    let functionScope = {};
    let componentScope = {};
  
    // Create nano-var-template instance for variable resolution
    const varTemplate = require('./nano-var-template.js')();
  
    const preProcessVariables = (text) => {
      console.log('preProcessVariables input:', text);
      
      // First convert dot notation to ${} syntax
      const withVarSyntax = text.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, 
        (match) => `\${${match}}`
      );
      console.log('after converting to ${} syntax:', withVarSyntax);
      
      // Then resolve using nano-var-template
      const resolved = varTemplate(withVarSyntax, variableScope);
      console.log('after nano-var-template resolution:', resolved);
      
      return resolved;
    };
  
    const processTemplate = (template) => {
      console.log('\nStarting template processing:', template);
  
      // Step 1: Handle all variables in function arguments
      console.log('\nStep 1: Processing function arguments');
      let result = template.replace(/\{\{\s*(\w+)\s*\(`([^`]+)`\)\s*\}\}/g, (match, func, args) => {
        console.log('Found function:', func);
        console.log('With args:', args);
        const resolvedArgs = preProcessVariables(args);
        console.log('Resolved args:', resolvedArgs);
        return `#{${func}:${resolvedArgs}}`;
      });
      console.log('After function processing:', result);
  
      // Step 2: Handle component props
      console.log('\nStep 2: Processing component props');
      result = result.replace(/<(\w+)([^>]*?)(\/?>)/g, (match, tag, props, end) => {
        console.log('Found component:', tag);
        console.log('With props:', props);
        const processedProps = props.replace(/(\:?)(\w+)=["']([^"']+)["']/g, (_, bind, name, value) => {
          console.log('Processing prop:', name);
          console.log('With value:', value);
          if (bind === ':') {
            const resolvedValue = preProcessVariables(value);
            console.log('Resolved value:', resolvedValue);
            return `${name}="${resolvedValue}"`;
          }
          return `${name}="${value}"`;
        });
        console.log('Processed props:', processedProps);
        return `<${tag}${processedProps}${end}`;
      });
      console.log('After component prop processing:', result);
  
      // Step 3: Convert to final component syntax
      console.log('\nStep 3: Converting to final syntax');
      result = result.replace(/<(\w+)([^>]*?)>(.*?)<\/\1>|<(\w+)([^>]*?)\/>/, (match, tag1, props1, content, tag2, props2) => {
        const tag = tag1 || tag2;
        const props = props1 || props2;
        console.log('Converting component:', tag);
        console.log('With final props:', props);
        console.log('And content:', content);
  
        const attributes = [];
        props.replace(/(\w+)="([^"]+)"/g, (_, name, value) => {
          attributes.push(`${name}=${value}`);
        });
  
        const prefix = `${options.componentStart}${tag}:${attributes.join(options.delimiter)}`;
        if (content) {
          return `${prefix}${content}${options.componentEnd}`;
        }
        return `${prefix}${options.componentEnd}`;
      });
      console.log('Final result:', result);
  
      return result;
    };
  
    return {
      withVariables(scope) {
        variableScope = scope;
        return this;
      },
  
      withFunctions(scope) {
        functionScope = scope;
        return this;
      },
  
      withComponents(scope) {
        componentScope = scope;
        return this;
      },
  
      convert(template) {
        return processTemplate(template);
      }
    };
  }
  
  module.exports = createSubstrate;