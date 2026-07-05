import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  secondary: 'border border-border bg-surface text-content hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:opacity-90',
};

/**
 * A local Tailwind button primitive used where reliable rendering matters (modal
 * actions), independent of whether the PDS web components have loaded.
 */
export function Button({
  variant = 'secondary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
      {...props}
    />
  );
}
