import { PInputText } from '@porsche-design-system/components-react';
import { useId } from 'react';

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Inline error message; sets the PDS field state to `error`. */
  error?: string;
  hideLabel?: boolean;
}

/**
 * Thin wrapper over PDS `PInputText` that adapts the web-component event API
 * (`onInput` emitting a native `InputEvent` as `detail`) to a plain
 * `onChange(value)` callback. This isolates PDS interop in one place per the
 * design's "wrap awkward ones in thin React components" decision.
 */
export function TextField({
  label,
  value,
  onChange,
  name,
  placeholder,
  required,
  disabled,
  error,
  hideLabel,
}: TextFieldProps) {
  const generatedName = useId();
  return (
    <PInputText
      name={name ?? generatedName}
      label={label}
      hideLabel={hideLabel}
      value={value}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      state={error ? 'error' : 'none'}
      message={error ?? ''}
      onInput={(event) => {
        const target = event.detail.target as HTMLInputElement | null;
        onChange(target?.value ?? '');
      }}
    />
  );
}
