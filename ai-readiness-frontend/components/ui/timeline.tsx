'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface TimelineProps {
  children: React.ReactNode
  className?: string
}

interface TimelineItemProps {
  children: React.ReactNode
  className?: string
}

interface TimelineIconProps {
  children: React.ReactNode
  className?: string
}

interface TimelineContentProps {
  children: React.ReactNode
  className?: string
}

interface TimelineTimeProps {
  children: React.ReactNode
  className?: string
}

interface TimelineTitleProps {
  children: React.ReactNode
  className?: string
}

interface TimelineDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface TimelineConnectorProps {
  className?: string
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn('relative space-y-6', className)}>
      {children}
    </div>
  )
}

export function TimelineItem({ children, className }: TimelineItemProps) {
  return (
    <div className={cn('relative flex gap-4', className)}>
      {children}
    </div>
  )
}

export function TimelineIcon({ children, className }: TimelineIconProps) {
  return (
    <div className={cn(
      'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-white shadow-sm',
      className
    )}>
      {children}
    </div>
  )
}

export function TimelineContent({ children, className }: TimelineContentProps) {
  return (
    <div className={cn('flex-1 min-w-0 pb-8', className)}>
      {children}
    </div>
  )
}

export function TimelineTime({ children, className }: TimelineTimeProps) {
  return (
    <time className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </time>
  )
}

export function TimelineTitle({ children, className }: TimelineTitleProps) {
  return (
    <h3 className={cn('font-semibold leading-none tracking-tight mb-1', className)}>
      {children}
    </h3>
  )
}

export function TimelineDescription({ children, className }: TimelineDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}

export function TimelineConnector({ className }: TimelineConnectorProps) {
  return (
    <div className={cn(
      'absolute left-4 top-8 bottom-0 w-px bg-border',
      className
    )} />
  )
}