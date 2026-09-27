import * as React from 'react'
import { cn } from '@/lib/utils'
// Minimal, native-button variant of shadcn/ui (MIT). No Slot/asChild is needed.
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) =>
    <button ref={ref} type={type} data-slot="button" data-variant={variant} data-size={size} className={cn('ui-button', className)} {...props} />,
)
Button.displayName = 'Button'
