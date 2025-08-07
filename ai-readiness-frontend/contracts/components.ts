/**
 * COMPONENT CONTRACTS
 * All agents MUST use these exact interfaces
 * Any deviation will cause build failures
 */

import { ReactNode } from 'react';

// Progress component - ONLY these props exist
export interface ProgressProps {
  value: number;
  className?: string;
  // NO variant, animated, showValue - these are NOT valid
}

// Button component - ONLY these props exist  
export interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

// Card components - ONLY these props exist
export interface CardProps {
  className?: string;
  children: ReactNode;
}

export interface CardHeaderProps {
  className?: string;
  children: ReactNode;
}

export interface CardTitleProps {
  className?: string;
  children: ReactNode;
}

export interface CardDescriptionProps {
  className?: string;
  children: ReactNode;
}

export interface CardContentProps {
  className?: string;
  children: ReactNode;
}

export interface CardFooterProps {
  className?: string;
  children: ReactNode;
}

// Input component - ONLY these props exist
export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

// Badge component - ONLY these props exist
export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: ReactNode;
}

// Select components - ONLY these props exist
export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

// Dialog components - ONLY these props exist
export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

// Tabs components - ONLY these props exist
export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

/**
 * VALIDATION RULES
 * 
 * 1. Components CANNOT have props not defined here
 * 2. Components MUST import from '@/components/ui/*'
 * 3. Custom props MUST be added here FIRST
 * 4. All agents MUST read this file before writing components
 */

export const FORBIDDEN_PROPS = {
  Progress: ['variant', 'animated', 'showValue', 'label', 'size'],
  Button: ['loading', 'icon', 'color'],
  Card: ['variant', 'shimmer', 'animated', 'glass'],
  Input: ['error', 'success', 'label'],
};

/**
 * TYPE GUARD FUNCTIONS
 * Use these to validate props at runtime
 */

export function isValidProgressProps(props: any): props is ProgressProps {
  const validKeys = ['value', 'className'];
  return Object.keys(props).every(key => validKeys.includes(key));
}

export function isValidButtonProps(props: any): props is ButtonProps {
  const validKeys = ['onClick', 'disabled', 'children', 'variant', 'size', 'className', 'type'];
  return Object.keys(props).every(key => validKeys.includes(key));
}