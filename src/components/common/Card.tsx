import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      header,
      footer,
      padding = 'md',
      hoverEffect = false,
      ...props
    },
    ref
  ) => {
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-slate-200/90 rounded-xl shadow-card transition-all duration-200',
          hoverEffect && 'hover:shadow-card-hover hover:border-slate-300',
          className
        )}
        {...props}
      >
        {header && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            {header}
          </div>
        )}
        <div className={paddingStyles[padding]}>{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';
