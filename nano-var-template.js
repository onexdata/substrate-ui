const Tpl = options => {
    // You can pass options to override defaults...
    options = Object.assign(
      {
        start: options && options.functions ? "#{" : "${",
        end: "}",
        path: options && options.functions
          ? "[a-z0-9_$][: ,\\.a-z0-9_]*"  // Allow colons for functions
          : "[a-z0-9_$][\\.a-z0-9_]*",    // Only dots for variables
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
          const [funcName, ...argParts] = token.split(':');
          
          // If no function found, handle error case
          if (typeof data[funcName] !== "function") {
            if (options.warn) {
              throw new Error(`nano-var-template: Missing function ${funcName}`);
            }
            return 'undefined';
          }

          // Process arguments if they exist
          if (argParts.length) {
            const args = argParts.join(':').split(',').map(arg => arg.trim());
            return data[funcName](...args);
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
              lookup = lookup[path[i]];
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
