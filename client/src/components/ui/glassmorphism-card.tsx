import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassmorphismCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function GlassmorphismCard({ 
  children, 
  className, 
  onClick, 
  hover = true 
}: GlassmorphismCardProps) {
  return (
    <div
      className={cn(
        "backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl",
        hover && "hover:scale-105 transition-all duration-300 cursor-pointer group",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
