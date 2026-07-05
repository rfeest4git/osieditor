import { PTextarea } from '@porsche-design-system/components-react';
import { useId } from 'react';

export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
}

/** Thin wrapper over PDS `PTextarea`, normalizing to `onChange(value)`. */
export function TextArea({
  label,
  value,
  onChange,
  name,
  placeholder,
  required,
  disabled,
  error,
}: TextAreaProps) {
  const generatedName = useId();
  return (
    <PTextarea
      name={name ?? generatedName}
      label={label}
      value={value}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      state={error ? 'error' : 'none'}
      message={error ?? ''}
      onInput={(event) => {
        const target = event.detail.target as HTMLTextAreaElement | null;
        onChange(target?.value ?? '');
      }}
    />
  );
}
