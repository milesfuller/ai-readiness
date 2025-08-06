/**
 * ESLint rule: no-invalid-server-client-boundary
 * Detects Next.js server/client component boundary issues
 * 
 * Catches:
 * 1. React hooks used in files without 'use client' directive
 * 2. Server components passing function props to client components
 * 3. Components with event handlers but no 'use client' directive
 */

const REACT_HOOKS = new Set([
  'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 
  'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 
  'useDebugValue', 'useDeferredValue', 'useId', 'useInsertionEffect',
  'useSyncExternalStore', 'useTransition', 'use'
]);

const EVENT_HANDLER_PROPS = new Set([
  'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur', 'onMouseOver',
  'onMouseOut', 'onMouseEnter', 'onMouseLeave', 'onKeyDown', 'onKeyUp',
  'onKeyPress', 'onInput', 'onSelect', 'onScroll', 'onLoad', 'onError',
  'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onDrag', 'onDrop'
]);

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect invalid Next.js server/client component boundaries',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingUseClient: "Component uses '{{ feature }}' but is missing 'use client' directive",
      serverComponentWithFunction: "Server component '{{ componentName }}' cannot pass function prop '{{ propName }}' to client component",
      eventHandlerWithoutClient: "Component has event handler '{{ handlerName }}' but is missing 'use client' directive",
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const filename = context.getFilename();
    
    // Skip non-React files (but allow test files or unknown extensions in testing)
    if (filename && filename !== '<text>' && !filename.match(/\.(tsx?|jsx?)$/)) {
      return {};
    }

    let hasUseClient = false;
    let reactHookUsages = [];
    let eventHandlerUsages = [];
    let functionPropPasses = [];

    /**
     * Check if file has 'use client' directive
     */
    function checkForUseClientDirective(node) {
      if (node.type === 'ExpressionStatement' && 
          node.expression.type === 'Literal' &&
          node.expression.value === 'use client') {
        hasUseClient = true;
      }
    }

    /**
     * Check if identifier is a React hook
     */
    function isReactHook(name) {
      return REACT_HOOKS.has(name) || name.startsWith('use');
    }

    /**
     * Check if prop is an event handler
     */
    function isEventHandler(propName) {
      return EVENT_HANDLER_PROPS.has(propName) || propName.startsWith('on');
    }

    /**
     * Check if node is likely a function (arrow function, function expression, or identifier)
     */
    function isFunction(node) {
      return node.type === 'ArrowFunctionExpression' ||
             node.type === 'FunctionExpression' ||
             node.type === 'FunctionDeclaration' ||
             (node.type === 'Identifier' && node.name.includes('handle')) ||
             (node.type === 'Identifier' && node.name.startsWith('on'));
    }

    /**
     * Check if component is likely a client component (has 'use client' or imported from client)
     */
    function isLikelyClientComponent(elementName) {
      // Simple heuristic: lowercase names are likely HTML elements (client-side)
      // Uppercase names could be server or client components
      return elementName && elementName[0] === elementName[0].toLowerCase();
    }

    return {
      Program(node) {
        // Check for 'use client' directive at the top of the file
        if (node.body.length > 0) {
          const firstStatement = node.body[0];
          checkForUseClientDirective(firstStatement);
        }
      },

      CallExpression(node) {
        // Check for React hook usage
        if (node.callee.type === 'Identifier' && isReactHook(node.callee.name)) {
          reactHookUsages.push({
            node,
            hookName: node.callee.name,
          });
        }
      },

      JSXAttribute(node) {
        if (node.name && node.name.type === 'JSXIdentifier') {
          const propName = node.name.name;
          const jsxOpeningElement = node.parent;
          let isCustomComponent = false;
          let componentName = '';

          // Determine if this is a custom component
          if (jsxOpeningElement.type === 'JSXOpeningElement' && 
              jsxOpeningElement.name.type === 'JSXIdentifier') {
            componentName = jsxOpeningElement.name.name;
            isCustomComponent = componentName[0] === componentName[0].toUpperCase();
          }

          // Check for function props being passed to custom components (higher priority)
          if (node.value && 
              node.value.type === 'JSXExpressionContainer' && 
              isFunction(node.value.expression) &&
              isCustomComponent) {
            
            functionPropPasses.push({
              node,
              componentName,
              propName,
            });
          }
          // Check for event handlers (only if not already caught as function prop to custom component)
          else if (isEventHandler(propName)) {
            eventHandlerUsages.push({
              node,
              handlerName: propName,
            });
          }
        }
      },

      'Program:exit'() {
        // Report React hook usage without 'use client'
        if (!hasUseClient && reactHookUsages.length > 0) {
          reactHookUsages.forEach(({ node, hookName }) => {
            context.report({
              node,
              messageId: 'missingUseClient',
              data: { feature: `React hook '${hookName}'` },
              fix(fixer) {
                // Add 'use client' at the top of the file
                const program = sourceCode.ast;
                const firstToken = sourceCode.getFirstToken(program);
                return fixer.insertTextBefore(firstToken, "'use client';\n\n");
              },
            });
          });
        }

        // Report event handlers without 'use client'
        if (!hasUseClient && eventHandlerUsages.length > 0) {
          eventHandlerUsages.forEach(({ node, handlerName }) => {
            context.report({
              node,
              messageId: 'eventHandlerWithoutClient',
              data: { handlerName },
              fix(fixer) {
                // Add 'use client' at the top of the file
                const program = sourceCode.ast;
                const firstToken = sourceCode.getFirstToken(program);
                return fixer.insertTextBefore(firstToken, "'use client';\n\n");
              },
            });
          });
        }

        // Report function props in server components (when no 'use client')
        if (!hasUseClient && functionPropPasses.length > 0) {
          functionPropPasses.forEach(({ node, componentName, propName }) => {
            // Only warn if the component might be a client component
            if (!isLikelyClientComponent(componentName)) {
              context.report({
                node,
                messageId: 'serverComponentWithFunction',
                data: { componentName, propName },
              });
            }
          });
        }
      },
    };
  },
};