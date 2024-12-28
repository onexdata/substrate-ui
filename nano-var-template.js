const convertValue = (value, options) => {
  if (value === null || value === undefined) return String(value);
  
  // Handle Date objects specially
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // Convert all primitives to string
  if (typeof value !== 'object') {
    return String(value);
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(v => convertValue(v, options)).join(',');
  }
  
  // Handle objects with custom toString
  if (value.toString && value.toString() !== '[object Object]') {
    return value.toString();
  }
  
  // Handle circular references and other objects
  try {
    return JSON.stringify(value);
  } catch (e) {
    return '[object Object]';
  }
};

const Tpl = options => {
    // You can pass options to override defaults...
    options = Object.assign({
      start: options && options.functions ? "#{" : "${",
      end: "}",
      path: options && options.functions
        ? "[a-z0-9_$][^}]*"  // Allow anything except closing brace for functions
        : "[@#]?[a-zA-Z0-9_$][\\.\\[\\]0-9a-zA-Z_$]*|\\{[^}]+\\}", // Support special prefixes and curly brace syntax
      warn: true,
      functions: false,
      convertTypes: true // New option for type conversion
    }, options);
    
    // Escape regex special characters in delimiters
    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(
      escapeRegex(options.start) + "\\s*(" + options.path + ")\\s*" + escapeRegex(options.end),
      "gi"
    );
    
    return (template, data) => {
      if (!data && options.warn) {
        throw new Error(`nano-var-template: Data object is ${data}`);
      }
      data = data || {};
      return template.replace(match, (tag, token) => {
        // Check if token matches path pattern
        if (!new RegExp(`^${options.path}$`).test(token)) {
          return tag;
        }
        if (options.functions) {
          // For functions, split on first : to separate function name from args
          const parts = token.split(':');
          const funcName = parts[0];
          const args = parts.slice(1).join(':');
          

          // If no function found, handle error case
          if (typeof data[funcName] !== "function") {
            if (options.warn) {
              throw new Error(`nano-var-template: Missing function ${funcName}`);
            }
            return 'undefined';
          }

          try {
            // Check for malformed arguments in the original token
            if (options.warn && (token.endsWith(':') || token.includes('::'))) {
              throw new Error('Malformed arguments');
            }
            
            // Process arguments if they exist
            if (args !== undefined) {
              
              // For no-arg function calls, just call the function
              if (args === '') {
                return data[funcName]();
              }
              
              // Split and process arguments
              const processedArgs = args.split(':')
                .map(arg => arg.trim())
                .filter(arg => arg !== '');
              
              // For single argument functions, pass the whole string
              if (data[funcName].length <= 1) {
                return data[funcName](args);
              }
              
              // For multi-argument functions, split and pass separately
              return data[funcName](...processedArgs);
            }
            
            // Call function with no args
            return data[funcName]();
          } catch (e) {
            if (options.warn) {
              const errMsg = typeof e === 'string' ? e : e.message;
              throw new Error(`Function error: ${errMsg}`);
            }
            return 'undefined';
          }
        } else {
          // For variables, traverse the full path
          const path = token.trim().split('.');
          if (path[0] === '') return tag;
          let lookup = data;
          
          // Validate path segments first
          if (path.some(segment => !segment) || token.includes('..')) {
            if (options.warn) {
              throw new Error(`nano-var-template: Empty path segment in '${token}'`);
            }
            return 'undefined';
          }

          try {

            // Handle undefined/null values in data object directly  
            if (token in data && (data[token] === undefined || data[token] === null)) {
              return String(data[token]);
            }
            
            for (let i = 0; i < path.length; i++) {
              if (lookup === undefined || lookup === null) {
                if (options.warn) {
                  throw new Error(`nano-var-template: '${path[i]}' missing in ${token}`);
                }
                return options.convertTypes ? undefined : 'undefined';
              }
              let part = path[i];
              
              // Handle special path formats
              if (i === 0 && (part.startsWith('@') || part.startsWith('#'))) {
                lookup = data[part];
                continue;
              }
              
              // Handle curly brace syntax
              if (i === 0 && part.startsWith('{') && part.endsWith('}')) {
                lookup = data[part];
                continue;
              }
              
              // Handle array access
              if (part.includes('[')) {
                lookup = lookup[part];
                continue;
              }
              
              // Regular property access
              if (lookup && typeof lookup === 'object') {
                lookup = lookup[part];
              } else {
                lookup = lookup[part];
              }
            }
            if (lookup === undefined) {
              if (options.warn) {
                throw new Error(`nano-var-template: '${path[path.length-1]}' missing in ${token}`);
              }
              return 'undefined';
            }
            return lookup === undefined ? 
              (options.warn ? 
                (() => { throw new Error(`nano-var-template: Undefined value for '${token}'`); })() : 
                'undefined') 
              : convertValue(lookup, options);
          } catch (e) {
            if (options.warn) {
              throw new Error(`nano-var-template: Empty path segment in '${token}'`);
            }
            return 'undefined';
          }
        }
      });
    };
};

module.exports = Tpl;
