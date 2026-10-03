// Minimal typing for the one function we use (avoids requiring @types/js-yaml).
declare module 'js-yaml' {
  export function load(input: string): unknown;
}
