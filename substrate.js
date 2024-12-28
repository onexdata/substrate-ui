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
  
    const varTemplate = require('./nano-var-template.js')();
  
    const preProcessVariables = (text) => {
      const withVarSyntax = text.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, 
        (match) => `\${${match}}`
      );
      return varTemplate(withVarSyntax, variableScope);
    };
  
    const processTemplate = (template) => {
      // Step 1: Handle all variables in function arguments
      let result = template.replace(/\{\{\s*(\w+)\s*\(`([^`]+)`\)\s*\}\}/g, (match, func, args) => {
        const resolvedArgs = preProcessVariables(args);
        return `#{${func}:${resolvedArgs}}`;
      });
  
      // Step 2: Handle component props
      result = result.replace(/<(\w+)([^>]*?)(\/?>)/g, (match, tag, props, end) => {
        const processedProps = props.replace(/(\:?)(\w+)=["']([^"']+)["']/g, (_, bind, name, value) => {
          if (bind === ':') {
            const resolvedValue = preProcessVariables(value);
            return `${name}="${resolvedValue}"`;
          }
          return `${name}="${value}"`;
        });
        return `<${tag}${processedProps}${end}`;
      });
  
      // Step 3: Convert to final component syntax
      result = result.replace(/<(\w+)([^>]*?)>(.*?)<\/\1>|<(\w+)([^>]*?)\/>/, (match, tag1, props1, content, tag2, props2) => {
        const tag = tag1 || tag2;
        const props = props1 || props2;
        const attributes = [];
        
        props.replace(/(\w+)="([^"]+)"/g, (_, name, value) => {
          attributes.push(`${name}=${value}`);
        });
  
        const prefix = `${options.componentStart}${tag}:${attributes.join(options.delimiter)}`;
        if (content) {
          return `${prefix}||${content}${options.componentEnd}`;
        }
        return `${prefix}${options.componentEnd}`;
      });
  
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