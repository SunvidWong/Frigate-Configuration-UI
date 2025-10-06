import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-b border-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-gray-200 dark:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ children, className, as = 'h3', ...props }: CardTitleProps) {
  const Component = as;
  return (
    <Component
      className={cn(
        "text-lg font-semibold text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-600 dark:text-gray-400", className)} {...props}>
      {children}
    </p>
  );
}