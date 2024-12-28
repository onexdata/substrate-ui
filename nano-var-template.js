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
      return template.replace(match, (tag, token) => {
        if (options.functions) {
          // For functions, split on first : to separate function name from args
          const [funcName, ...args] = token.split(':');
          if (typeof data[funcName] !== "function" && options.warn) {
            throw `nano-var-template: Missing function ${funcName}`;
          }
          return data[funcName](args.join(':'));  // Rejoin args in case they contain colons
        } else {
          // For variables, traverse the full path
          const path = token.split('.');
          let lookup = data;
          
          for (let i = 0; i < path.length; i++) {
            lookup = lookup[path[i]];
            if (lookup === undefined && options.warn) {
              throw `nano-var-template: '${path[i]}' missing in ${tag}`;
            }
            if (i === path.length - 1) return lookup;
          }
          return lookup;
        }
      });
    };
};

module.exports = Tpl;