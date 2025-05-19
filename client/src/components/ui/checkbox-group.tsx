import React, { createContext, useContext, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CheckboxGroupContext = createContext<{
  name?: string;
}>({});

export function CheckboxGroup({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <CheckboxGroupContext.Provider value={{}}>
      <div className={cn("space-y-1.5", className)} {...props}>
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}

interface CheckboxItemProps {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function CheckboxItem({
  children,
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
}: CheckboxItemProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Checkbox 
        id={id} 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label 
        htmlFor={id}
        className={cn(
          "text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          disabled && "opacity-70 cursor-not-allowed"
        )}
      >
        {children}
      </Label>
    </div>
  );
}