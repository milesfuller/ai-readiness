/**
 * Fix for Supabase cookie type compatibility issue
 * The @supabase/auth-helpers-shared package expects CookieSerializeOptions
 * but the cookie package now exports SerializeOptions
 */

declare module 'cookie' {
  export interface SerializeOptions {
    domain?: string | undefined;
    encode?: ((val: string) => string) | undefined;
    expires?: Date | undefined;
    httpOnly?: boolean | undefined;
    maxAge?: number | undefined;
    path?: string | undefined;
    priority?: 'low' | 'medium' | 'high' | undefined;
    sameSite?: true | false | 'lax' | 'strict' | 'none' | undefined;
    secure?: boolean | undefined;
    signed?: boolean | undefined;
  }

  // Add the legacy export that Supabase expects
  export type CookieSerializeOptions = SerializeOptions;
  
  export function serialize(name: string, value: string, options?: SerializeOptions): string;
  export function parse(str: string): Record<string, string>;
}

export {}