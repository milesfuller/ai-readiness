// External library type declarations to fix TypeScript build errors

declare module 'busboy' {
  export interface BusboyConfig {
    headers: any;
    fileHwm?: number;
    defCharset?: string;
    preservePath?: boolean;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
  }
  
  export interface Busboy {
    on(event: string, listener: (...args: any[]) => void): this;
    write(chunk: any): void;
    end(): void;
  }
  
  export default function busboy(config: BusboyConfig): Busboy;
}

// D3 type stubs - basic declarations to prevent TypeScript errors
declare module 'd3-*' {
  export * from 'd3';
}

declare module 'd3-axis' {
  export * from 'd3';
}

declare module 'd3-brush' {
  export * from 'd3';
}

declare module 'd3-chord' {
  export * from 'd3';
}

declare module 'd3-contour' {
  export * from 'd3';
}

declare module 'd3-delaunay' {
  export * from 'd3';
}

declare module 'd3-dispatch' {
  export * from 'd3';
}

declare module 'd3-drag' {
  export * from 'd3';
}

declare module 'd3-dsv' {
  export * from 'd3';
}

declare module 'd3-fetch' {
  export * from 'd3';
}

declare module 'd3-force' {
  export * from 'd3';
}

declare module 'd3-format' {
  export * from 'd3';
}

declare module 'd3-geo' {
  export * from 'd3';
}

declare module 'd3-hierarchy' {
  export * from 'd3';
}

declare module 'd3-polygon' {
  export * from 'd3';
}

declare module 'd3-quadtree' {
  export * from 'd3';
}

declare module 'd3-random' {
  export * from 'd3';
}

declare module 'd3-scale-chromatic' {
  export * from 'd3';
}

declare module 'd3-selection' {
  export * from 'd3';
}

declare module 'd3-time-format' {
  export * from 'd3';
}

declare module 'd3-transition' {
  export * from 'd3';
}

declare module 'd3-zoom' {
  export * from 'd3';
}