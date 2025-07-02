import { cn } from "@/lib/utils";

interface MoodTagProps {
  children: string;
  className?: string;
  variant?: 'default' | 'selected';
}

export function MoodTag({ children, className, variant = 'default' }: MoodTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200",
        variant === 'default' && "bg-primary-600/20 text-primary-300 border border-primary-600/30",
        variant === 'selected' && "bg-primary-600 text-white border border-primary-500",
        className
      )}
    >
      {children}
    </span>
  );
}
