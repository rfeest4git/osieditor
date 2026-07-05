import type { Diagnostic } from '@osi-editor/osi-schema';

export type Path = Array<string | number>;

/** True when `path` begins with every element of `prefix`. */
export function pathStartsWith(path: Path, prefix: Path): boolean {
  if (path.length < prefix.length) return false;
  return prefix.every((seg, i) => path[i] === seg);
}

/** All diagnostics anchored at or beneath `prefix`. */
export function diagnosticsUnder(diagnostics: Diagnostic[], prefix: Path): Diagnostic[] {
  return diagnostics.filter((d) => pathStartsWith(d.path, prefix));
}

/**
 * Build a field-error lookup for a form whose entity lives at `prefix`.
 * `errorAt('name')` returns the first diagnostic message anchored exactly at
 * `[...prefix, 'name']`, or undefined.
 */
export function fieldErrors(diagnostics: Diagnostic[], prefix: Path) {
  return (key: string | number): string | undefined => {
    const target = [...prefix, key];
    const match = diagnostics.find(
      (d) => d.path.length === target.length && pathStartsWith(d.path, target),
    );
    return match?.message;
  };
}
