import clsx, { type ClassValue } from 'clsx';

/** Tiny class-name joiner. Kept separate so components import one symbol. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
