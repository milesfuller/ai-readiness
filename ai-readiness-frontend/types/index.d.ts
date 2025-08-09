// Global type declarations to prevent build errors
declare module 'busboy';
declare module 'd3-*';
declare module '@types/busboy';
declare module '@types/d3-*';

// Extend global namespace to allow any module resolution
declare namespace NodeJS {
  interface Global {
    [key: string]: any;
  }
}

// Allow importing any module to prevent TypeScript errors
declare module '*' {
  const content: any;
  export = content;
}