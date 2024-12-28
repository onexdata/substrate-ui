const convertValue = (value, options) => {
  if (!options.convertTypes) return String(value);

  if (value === null || value === undefined) return 'undefined';
  
  // Preserve primitive types
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  
  // Handle objects and arrays
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(v => convertValue(v, options)).join(',');
    }
    // Try to get meaningful string representation
    if (value.toString && value.toString() !== '[object Object]') {
      return value.toString();
    }
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  
  return String(value);
};

const Tpl = options => {
    // You can pass options to override defaults...
    options = Object.assign({
      start: options && options.functions ? "#{" : "${",
      end: "}",
      path: options && options.functions
        ? "[a-z0-9_$][^}]*"  // Allow anything except closing brace for functions
        : "[a-zA-Z0-9_$][\\.\\[\\]0-9a-zA-Z_$\\{\\}@#]*", // Support array access and special chars
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

          // Process arguments if they exist
          if (args) {
            // Handle special cases with colons in arguments
            const processedArgs = args.split(/(?<!\\):/)
              .map(arg => arg.trim().replace(/\\:/g, ':'))
              .filter(arg => arg.length > 0);
            
            try {
              // For single argument functions, pass the whole string
              if (data[funcName].length <= 1) {
                return data[funcName](args);
              }
              
              // For multi-argument functions, split and pass separately
              return data[funcName](...processedArgs);
            } catch (e) {
              if (options.warn) {
                throw new Error(`nano-var-template: Function error in '${funcName}': ${e.message}`);
              }
              return 'undefined';
            }
          }
          
          // Call function with no args if none provided
          try {
            const result = data[funcName]();
            return convertValue(result, options);
          } catch (e) {
            if (options.warn) {
              throw new Error(`Function error: ${e.message}`);
            }
            return 'undefined';
          }
        } else {
          // For variables, traverse the full path
          const path = token.trim().split('.');
          if (path[0] === '') return tag;
          let lookup = data;
          
          try {
            for (let i = 0; i < path.length; i++) {
              if (lookup === undefined || lookup === null) {
                if (options.warn) {
                  throw new Error(`nano-var-template: '${path[i]}' missing in ${token}`);
                }
                return 'undefined';
              }
              let part = path[i];
              
              // Handle array access with [] notation
              if (part.includes('[')) {
                const matches = part.match(/^([^\[]+)\[(\d+)\](.*)$/);
                if (matches) {
                  const [, arrayName, index, remainder] = matches;
                  if (!lookup[arrayName]) {
                    throw new Error(`Invalid array access: ${arrayName} is undefined`);
                  }
                  if (!Array.isArray(lookup[arrayName])) {
                    // Try direct access if not array
                    lookup = lookup[part];
                    continue;
                  }
                  const idx = parseInt(index);
                  lookup = lookup[arrayName][idx];
                  if (remainder) {
                    const remainingPath = remainder.startsWith('.') ? remainder.slice(1) : remainder;
                    if (remainingPath) {
                      part = remainingPath;
                      i--; // Process remainder as next part
                      continue;
                    }
                  }
                  continue;
                }
              }
              
              // Handle special characters in property names
              if (part.startsWith('@') || part.startsWith('#') || part.startsWith('{')) {
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
            return convertValue(lookup, options);
          } catch (e) {
            if (options.warn) {
              throw new Error(`nano-var-template: Invalid path '${token}'`);
            }
            return 'undefined';
          }
        }
      });
    };
};

module.exports = Tpl;
