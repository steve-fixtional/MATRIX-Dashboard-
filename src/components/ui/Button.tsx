import React from 'react';
import { cn } from '../../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          {
            "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200": variant === 'primary',
            "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-700": variant === 'secondary',
            "hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300": variant === 'ghost',
            "bg-red-500 text-white hover:bg-red-600 shadow-sm": variant === 'danger',
            "min-h-[44px] md:min-h-0 h-11 md:h-10 px-4 py-2": size === 'md',
            "h-8 px-3 text-xs": size === 'sm',
            "min-h-[48px] h-12 px-8 text-base": size === 'lg',
            "min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-10 w-10": size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
