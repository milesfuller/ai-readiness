/**
 * Jest DOM type declarations
 * Provides comprehensive TypeScript support for @testing-library/jest-dom matchers
 * Ensures all Jest DOM matchers are properly typed across the entire project
 */

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      // Document and Visibility Matchers
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeEmptyDOMElement(): R;
      
      // Form Element Matchers
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBePartiallyChecked(): R;
      toBeChecked(): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      
      // Content and Style Matchers
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveTextContent(text: string | RegExp | null): R;
      toHaveValue(value: string | string[] | number | null): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      
      // Attribute and Class Matchers
      toHaveAttribute(attribute: string, value?: string | RegExp | number | boolean): R;
      toHaveClass(...classNames: string[]): R;
      
      // Accessibility Matchers
      toHaveAccessibleName(name?: string | RegExp): R;
      toHaveAccessibleDescription(description?: string | RegExp): R;
      toHaveErrorMessage(text?: string | RegExp): R;
      
      // Additional DOM Testing Matchers
      toHaveRole(role: string): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveProperty(property: string, value?: any): R;
    }
  }
}

// Also support @jest/globals namespace for modern Jest setups
declare module '@jest/expect' {
  interface Matchers<R> {
    // Document and Visibility Matchers
    toBeInTheDocument(): R;
    toBeVisible(): R;
    toBeEmptyDOMElement(): R;
    
    // Form Element Matchers
    toBeInvalid(): R;
    toBeRequired(): R;
    toBeValid(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toBePartiallyChecked(): R;
    toBeChecked(): R;
    toHaveFocus(): R;
    toHaveFormValues(expectedValues: Record<string, any>): R;
    
    // Content and Style Matchers
    toHaveStyle(css: string | Record<string, any>): R;
    toHaveTextContent(text: string | RegExp | null): R;
    toHaveValue(value: string | string[] | number | null): R;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    
    // Attribute and Class Matchers
    toHaveAttribute(attribute: string, value?: string | RegExp | number | boolean): R;
    toHaveClass(...classNames: string[]): R;
    
    // Accessibility Matchers
    toHaveAccessibleName(name?: string | RegExp): R;
    toHaveAccessibleDescription(description?: string | RegExp): R;
    toHaveErrorMessage(text?: string | RegExp): R;
    
    // Additional DOM Testing Matchers
    toHaveRole(role: string): R;
    toContainElement(element: HTMLElement | null): R;
    toContainHTML(htmlText: string): R;
    toHaveProperty(property: string, value?: any): R;
  }
}

export {};