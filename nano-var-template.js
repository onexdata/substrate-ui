const convertValue = (value, options) => {
  if (value === null || value === undefined) return String(value);
  
  // Handle Date objects specially
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString().split('T')[0];
  }
  
  // Convert all primitives to string
  if (typeof value !== 'object') {
    return String(value);
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(v => convertValue(v, options)).join(',');
  }
  
  // Handle objects with toString
  if (value.toString && typeof value.toString === 'function') {
    try {
      const str = value.toString();
      if (str !== '[object Object]' || value instanceof Error) {
        return str;
      }
    } catch (e) {
      // Fall through if toString fails
    }
  }

  // Handle circular references and other objects
  try {
    return '[object Object]';
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
            // Process arguments if they exist
            if (args !== undefined) {
              const trimmedArgs = args.trim();
              
              // Check for malformed arguments
              if (options.warn && (trimmedArgs === ':' || trimmedArgs.includes('::') || trimmedArgs.endsWith(':'))) {
                throw new Error('Malformed arguments');
              }

              // For empty or no args, call function without args
              if (trimmedArgs === '') {
                return data[funcName]();
              }
              
              // Split and process arguments
              const processedArgs = trimmedArgs.split(':')
                .map(arg => arg.trim())
                .filter(arg => arg !== '');
              
              // For single argument functions or single arg, pass as is
              if (data[funcName].length <= 1 || processedArgs.length === 1) {
                return data[funcName](trimmedArgs);
              }
              
              // For multi-argument functions, pass separately
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

            // Handle direct property access first
            if (data.hasOwnProperty(token)) {
              return convertValue(data[token], options);
            }
          
            // Then try path traversal
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
                const key = part.slice(1, -1);
                lookup = data[`{${key}}`];
                continue;
              }
              
              // Handle escaped curly braces
              part = part.replace(/\\([{}])/g, '$1');
              
              // Handle special path formats with braces
              if (part.startsWith('{') && part.endsWith('}')) {
                const key = part.slice(1, -1);
                lookup = lookup[key];
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
