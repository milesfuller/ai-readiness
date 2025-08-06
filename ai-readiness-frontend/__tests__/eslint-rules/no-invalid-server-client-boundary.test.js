/**
 * Tests for the no-invalid-server-client-boundary ESLint rule
 */

const { RuleTester } = require('eslint');
const rule = require('../../eslint-rules/no-invalid-server-client-boundary');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    node: true,
  },
});

describe('no-invalid-server-client-boundary', () => {
  ruleTester.run('no-invalid-server-client-boundary', rule, {
    valid: [
      // Valid: Client component with React hooks
      {
        code: `
          'use client';
          import { useState } from 'react';
          
          export default function ClientComponent() {
            const [state, setState] = useState(0);
            return <div>{state}</div>;
          }
        `,
        filename: 'component.tsx',
      },

      // Valid: Client component with event handlers
      {
        code: `
          'use client';
          
          export default function ClientComponent() {
            const handleClick = () => {};
            return <button onClick={handleClick}>Click me</button>;
          }
        `,
      },

      // Valid: Server component without hooks or event handlers
      {
        code: `
          export default function ServerComponent({ data }) {
            return <div>{data.title}</div>;
          }
        `,
      },

      // Valid: Server component with non-function props
      {
        code: `
          export default function ServerComponent() {
            return <ClientComponent title="Hello" count={42} />;
          }
        `,
      },

      // Valid: HTML elements with event handlers in client component
      {
        code: `
          'use client';
          
          export default function ClientComponent() {
            return <input onChange={() => {}} />;
          }
        `,
      },

      // Valid: Custom hook usage in client component
      {
        code: `
          'use client';
          import { useCustomHook } from './hooks';
          
          export default function ClientComponent() {
            useCustomHook();
            return <div>Hello</div>;
          }
        `,
      },
    ],

    invalid: [
      // Invalid: React hook without 'use client'
      {
        code: `
          import { useState } from 'react';
          
          export default function Component() {
            const [state, setState] = useState(0);
            return <div>{state}</div>;
          }
        `,
        filename: 'component.tsx',
        errors: [
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useState'" },
          },
        ],
        output: `
          'use client';

import { useState } from 'react';
          
          export default function Component() {
            const [state, setState] = useState(0);
            return <div>{state}</div>;
          }
        `,
      },

      // Invalid: Multiple React hooks without 'use client'
      {
        code: `
          import { useState, useEffect } from 'react';
          
          export default function Component() {
            const [state, setState] = useState(0);
            useEffect(() => {}, []);
            return <div>{state}</div>;
          }
        `,
        filename: 'component.jsx',
        errors: [
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useState'" },
          },
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useEffect'" },
          },
        ],
        output: `
          'use client';

import { useState, useEffect } from 'react';
          
          export default function Component() {
            const [state, setState] = useState(0);
            useEffect(() => {}, []);
            return <div>{state}</div>;
          }
        `,
      },

      // Invalid: Event handler without 'use client'
      {
        code: `
          export default function Component() {
            const handleClick = () => {};
            return <button onClick={handleClick}>Click</button>;
          }
        `,
        filename: 'component.jsx',
        errors: [
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onClick' },
          },
        ],
        output: `
          'use client';

export default function Component() {
            const handleClick = () => {};
            return <button onClick={handleClick}>Click</button>;
          }
        `,
      },

      // Invalid: Multiple event handlers without 'use client'
      {
        code: `
          export default function Component() {
            return (
              <form onSubmit={() => {}} onChange={() => {}}>
                <input onFocus={() => {}} onBlur={() => {}} />
              </form>
            );
          }
        `,
        filename: 'form.tsx',
        errors: [
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onSubmit' },
          },
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onChange' },
          },
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onFocus' },
          },
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onBlur' },
          },
        ],
        output: `
          'use client';

export default function Component() {
            return (
              <form onSubmit={() => {}} onChange={() => {}}>
                <input onFocus={() => {}} onBlur={() => {}} />
              </form>
            );
          }
        `,
      },

      // Invalid: Custom hook without 'use client'
      {
        code: `
          import { useCustomHook } from './hooks';
          
          export default function Component() {
            useCustomHook();
            return <div>Hello</div>;
          }
        `,
        filename: 'hook-user.tsx',
        errors: [
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useCustomHook'" },
          },
        ],
        output: `
          'use client';

import { useCustomHook } from './hooks';
          
          export default function Component() {
            useCustomHook();
            return <div>Hello</div>;
          }
        `,
      },

      // Invalid: Function prop passed to custom component in server component
      {
        code: `
          export default function ServerComponent() {
            const handleClick = () => {};
            return <CustomButton onClick={handleClick}>Click me</CustomButton>;
          }
        `,
        filename: 'server.tsx',
        errors: [
          {
            messageId: 'serverComponentWithFunction',
            data: { componentName: 'CustomButton', propName: 'onClick' },
          },
        ],
      },

      // Invalid: Arrow function prop passed to custom component
      {
        code: `
          export default function ServerComponent() {
            return <Modal onClose={() => {}} />;
          }
        `,
        filename: 'modal-user.jsx',
        errors: [
          {
            messageId: 'serverComponentWithFunction',
            data: { componentName: 'Modal', propName: 'onClose' },
          },
        ],
      },

      // Invalid: Modern React hooks without 'use client'
      {
        code: `
          import { useDeferredValue, useTransition } from 'react';
          
          export default function Component() {
            const [isPending, startTransition] = useTransition();
            const deferredValue = useDeferredValue(value);
            return <div>{deferredValue}</div>;
          }
        `,
        filename: 'modern-hooks.tsx',
        errors: [
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useTransition'" },
          },
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useDeferredValue'" },
          },
        ],
        output: `
          'use client';

import { useDeferredValue, useTransition } from 'react';
          
          export default function Component() {
            const [isPending, startTransition] = useTransition();
            const deferredValue = useDeferredValue(value);
            return <div>{deferredValue}</div>;
          }
        `,
      },

      // Invalid: Complex event handlers without 'use client'
      {
        code: `
          export default function Component() {
            return (
              <div 
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                onTouchStart={() => {}}
              >
                Content
              </div>
            );
          }
        `,
        filename: 'interactive.jsx',
        errors: [
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onMouseEnter' },
          },
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onMouseLeave' },
          },
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onTouchStart' },
          },
        ],
        output: `
          'use client';

export default function Component() {
            return (
              <div 
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                onTouchStart={() => {}}
              >
                Content
              </div>
            );
          }
        `,
      },

      // Invalid: Mixed violations - hooks and event handlers
      {
        code: `
          import { useState } from 'react';
          
          export default function Component() {
            const [count, setCount] = useState(0);
            
            return (
              <button onClick={() => setCount(count + 1)}>
                Count: {count}
              </button>
            );
          }
        `,
        filename: 'counter.tsx',
        errors: [
          {
            messageId: 'missingUseClient',
            data: { feature: "React hook 'useState'" },
          },
          {
            messageId: 'eventHandlerWithoutClient',
            data: { handlerName: 'onClick' },
          },
        ],
        output: `
          'use client';

import { useState } from 'react';
          
          export default function Component() {
            const [count, setCount] = useState(0);
            
            return (
              <button onClick={() => setCount(count + 1)}>
                Count: {count}
              </button>
            );
          }
        `,
      },
    ],
  });
});