import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names; later Tailwind utilities win over earlier ones (shadcn / 8bitcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
