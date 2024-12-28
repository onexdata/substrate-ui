const Tpl = options => {
    // You can pass options to override defaults...
    options = Object.assign(
      {
        start: options && options.functions ? "#{" : "${",
        end: "}",
        path: options && options.functions
          ? "[a-z0-9_$][^}]*"  // Allow anything except closing brace for functions
          : "[a-zA-Z0-9_$@#\\[\\]\\(\\)\\{\\}][\\.a-zA-Z0-9_$@#\\[\\]\\(\\)\\{\\}]*",  // Extended variable path support
        warn: true,
        functions: false
      },
      options
    );
    
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
            
            // For single argument functions, pass the whole string
            if (data[funcName].length <= 1) {
              return data[funcName](args);
            }
            
            // For multi-argument functions, split and pass separately
            return data[funcName](...processedArgs);
          }
          
          // Call function with no args if none provided
          return data[funcName]();
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
              // Handle array access notation
              const arrayMatch = path[i].match(/^(\w+)\[(\d+)\]$/);
              if (arrayMatch) {
                lookup = lookup[arrayMatch[1]][parseInt(arrayMatch[2])];
              } else {
                lookup = lookup[path[i]];
              }
            }
            if (lookup === undefined) {
              if (options.warn) {
                throw new Error(`nano-var-template: '${path[path.length-1]}' missing in ${token}`);
              }
              return 'undefined';
            }
            return lookup;
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
