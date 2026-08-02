import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn 系 registry の標準ヘルパ。取り込んだ部品がこれを import する。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
