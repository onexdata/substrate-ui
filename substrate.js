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
    let toJSON = true;
  
    const varTemplate = require('./nano-var-template.js')();
    const funcTemplate = require('./nano-var-template.js')({ functions: true });
    
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
  
    const preProcessVariables = (text) => {
      if (!text || typeof text !== 'string') return '';
      // First wrap bare object paths in ${} syntax
      const withVarSyntax = text.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)+)\b/g, 
        (match) => `\${${match}}`
      );
      // Then process all variables
      return varTemplate(withVarSyntax, variableScope);
    };
  
    const processFunctions = (text) => {
      if (!text || typeof text !== 'string') return '';
      try {
        // First process any nested variables
        const processedText = preProcessVariables(text);
        // Handle function calls with proper argument parsing
        return processedText.replace(/\{\{\s*(\w+)\s*\((.*?)\)\s*\}\}/g, (match, func, args) => {
          const processedArgs = args ? args.split(',').map(arg => {
            // Remove quotes and process variables
            return preProcessVariables(arg.trim().replace(/['"]/g, ''));
          }).join(':') : '';
          return funcTemplate(`#{${func}${processedArgs ? ':' + processedArgs : ''}}`, functionScope);
        });
      } catch (e) {
        console.error('Function processing error:', e);
        return text;
      }
    };
  
    const validateComponent = (componentName) => {
      if (!componentName || typeof componentName !== 'string') return false;
      const cleanName = componentName.replace(/[^a-zA-Z0-9]/g, '');
      if (!componentScope[cleanName]) {
        throw new Error(`Component "${cleanName}" is not registered in the component scope`);
      }
      return cleanName;
    };
  
    const processProps = (propsString = '') => {
      const props = {};
      if (!propsString) return props;
  
      const matches = propsString.match(/(\:?[\w-]+)=["']([^"']+)["']/g) || [];
      matches.forEach(match => {
        const [, bind, name, value] = match.match(/(\:?)([\w-]+)=["']([^"']+)["']/) || [];
        if (bind === ':') {
          const processedValue = preProcessVariables(value);
          // Convert types appropriately
          if (processedValue === 'true') props[name] = true;
          else if (processedValue === 'false') props[name] = false;
          else if (!isNaN(processedValue) && processedValue.trim() !== '') {
            props[name] = Number(processedValue);
          } else {
            props[name] = processedValue;
          }
        } else {
          props[name] = value;
        }
      });
      
      return props;
    };
  
    const processComponent = (tag, props = '', content = null) => {
      const cleanTag = validateComponent(tag);
      const processedProps = processProps(props);
      
      const propsArray = Object.entries(processedProps).map(([key, value]) => `${key}=${value}`);
      const propsString = propsArray.length > 0 ? propsArray.join(options.delimiter) : '';
  
      let result = `${options.componentStart}${cleanTag}`;
      if (propsString) {
        result += `:${propsString}`;
      }
      
      if (content !== null) {
        const processedContent = processFunctionCalls(content);
        if (processedContent) {
          result += `||${processedContent}`;
        }
      }
      
      return result + options.componentEnd;
    };
  
    const processFunctionCalls = (content) => {
      if (!content || !content.includes('{{')) return content;
      
      return content.replace(/\{\{\s*(\w+)\s*\(([^)]*)\)\s*\}\}/g, (match, func, args) => {
        if (!args) return processFunctions(`#{${func}}`);
        const processedArgs = preProcessVariables(args.replace(/[`'"]/g, ''))
          .split(',')
          .map(arg => arg.trim())
          .filter(Boolean)
          .join(',');
        return processFunctions(`#{${func}:${processedArgs}}`);
      });
    };
  
    const processNestedContent = (content) => {
      if (!content) return '';
  
      // Process all function calls first
      let processed = processFunctionCalls(content);
  
      // Then handle nested components
      processed = processed.replace(/<(\w+)([^>]*?)>([\s\S]*?)<\/\1>|<(\w+)([^>]*?)\/?>/g, 
        (match, tag1, props1, content1, tag2, props2) => {
          const tag = tag1 || tag2;
          const props = props1 || props2 || '';
          const innerContent = content1 || null;
          return processComponent(tag, props, innerContent);
        }
      );
  
      return processed.trim();
    };
  
    const convertToJSON = (processedTemplate) => {
      const components = processedTemplate
        .split(options.componentEnd)
        .map(str => str.trim())
        .filter(str => str)
        .map(str => str.replace(new RegExp(`^${options.componentStart}`), ''))
        .map(componentStr => {
          if (!componentStr) return null;
          
          const [nameAndProps, bodyContent] = componentStr.split('||').map(s => s?.trim());
          if (!nameAndProps) return null;
  
          const [name, propsStr] = nameAndProps.split(':').map(s => s?.trim());
          const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  
          const props = {};
          if (propsStr) {
            propsStr.split(options.delimiter).forEach(prop => {
              const [key, value] = prop.split('=').map(s => s?.trim());
              if (key && value) {
                props[key] = value;
              }
            });
          }
  
          const componentObj = {
            id: generateUUID(),
            name: cleanName,
            props
          };
  
          if (bodyContent) {
            // Handle both variables and functions in body content
            let processedBody = bodyContent;
            if (processedBody.includes('#{')) {
              processedBody = processFunctions(processedBody);
            }
            if (processedBody.includes('${')) {
              processedBody = preProcessVariables(processedBody);
            }
  
            componentObj.children = {
              id: generateUUID(),
              name: 'Text',
              props: {},
              body: processedBody
            };
          }
  
          return componentObj;
        })
        .filter(comp => comp !== null);
  
      return components;
    };
  
    const processTemplate = (template) => {
      if (!template) return toJSON ? [] : '';
      
      // First process functions in the template
      let processed = template.replace(/\{\{\s*(\w+)\s*\(`([^`]+)`\)\s*\}\}/g, (match, func, args) => {
        const processedArgs = preProcessVariables(args);
        return `#{${func}:${processedArgs}}`;
      });
  
      // Then process the template as nested content
      processed = processNestedContent(processed.trim());
  
      // Convert to JSON if enabled
      if (toJSON) {
        return convertToJSON(processed);
      }
  
      return processed;
    };
  
    return {
      withVariables(scope) {
        variableScope = scope || {};
        return this;
      },
  
      withFunctions(scope) {
        functionScope = scope || {};
        return this;
      },
  
      withComponents(scope, outputJSON = true) {
        componentScope = scope || {};
        toJSON = outputJSON;
        return this;
      },
  
      convert(template) {
        return processTemplate(template);
      }
    };
  }
  
  module.exports = createSubstrate;
