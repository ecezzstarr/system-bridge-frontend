'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// FieldSurface - The base container that breathes with the ecosystem
interface FieldSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'sunken'
  breathing?: boolean
  children: ReactNode
}

export const FieldSurface = forwardRef<HTMLDivElement, FieldSurfaceProps>(
  ({ className, variant = 'default', breathing = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'field-surface',
          variant === 'elevated' && 'shadow-lg shadow-primary/10',
          variant === 'sunken' && 'bg-background/50',
          !breathing && 'animation-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FieldSurface.displayName = 'FieldSurface'

// FieldList - Vertical list of items with field spacing
interface FieldListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const FieldList = forwardRef<HTMLDivElement, FieldListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('field-list', className)} {...props}>
        {children}
      </div>
    )
  }
)
FieldList.displayName = 'FieldList'

// FieldItem - Individual list item with hover states
interface FieldItemProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean
  children: ReactNode
}

export const FieldItem = forwardRef<HTMLDivElement, FieldItemProps>(
  ({ className, active, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('field-item', active && 'active', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FieldItem.displayName = 'FieldItem'

// FieldAction - Button styled for the field ecosystem
interface FieldActionProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export const FieldAction = forwardRef<HTMLButtonElement, FieldActionProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'field-action',
          variant === 'secondary' && 'bg-secondary text-secondary-foreground',
          variant === 'ghost' && 'bg-transparent border border-field-border text-foreground',
          size === 'sm' && 'text-sm py-1 px-3',
          size === 'lg' && 'text-lg py-3 px-6',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
FieldAction.displayName = 'FieldAction'

// FieldSignal - Status indicator that pulses with presence
interface FieldSignalProps extends HTMLAttributes<HTMLSpanElement> {
  status?: 'online' | 'offline' | 'warning' | 'active'
  size?: 'sm' | 'md' | 'lg'
}

export const FieldSignal = forwardRef<HTMLSpanElement, FieldSignalProps>(
  ({ className, status = 'online', size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'field-signal',
          status === 'offline' && 'offline',
          status === 'warning' && 'warning',
          status === 'active' && 'bg-primary',
          size === 'sm' && 'w-1.5 h-1.5',
          size === 'lg' && 'w-3 h-3',
          className
        )}
        {...props}
      />
    )
  }
)
FieldSignal.displayName = 'FieldSignal'

// FieldPresence - Shows user presence state
interface FieldPresenceProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  status?: 'online' | 'offline' | 'away'
  avatar?: string
}

export const FieldPresence = forwardRef<HTMLDivElement, FieldPresenceProps>(
  ({ className, name, status = 'online', avatar, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        <div className="relative">
          {avatar ? (
            <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <FieldSignal 
            status={status === 'away' ? 'warning' : status} 
            size="sm"
            className="absolute -bottom-0.5 -right-0.5"
          />
        </div>
        <span className="text-sm text-foreground">{name}</span>
      </div>
    )
  }
)
FieldPresence.displayName = 'FieldPresence'

// FieldValue - Displays a value with label
interface FieldValueProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  unit?: string
}

export const FieldValue = forwardRef<HTMLDivElement, FieldValueProps>(
  ({ className, label, value, unit, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col', className)} {...props}>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold text-foreground">
          {value}
          {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </span>
      </div>
    )
  }
)
FieldValue.displayName = 'FieldValue'

// FieldDivider - Simple divider for field layouts
export const FieldDivider = ({ className }: { className?: string }) => (
  <div className={cn('h-px bg-field-border my-4', className)} />
)

// FieldHeader - Section header for field areas
interface FieldHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: ReactNode
}

export const FieldHeader = forwardRef<HTMLDivElement, FieldHeaderProps>(
  ({ className, title, subtitle, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between mb-4', className)}
        {...props}
      >
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    )
  }
)
FieldHeader.displayName = 'FieldHeader'
