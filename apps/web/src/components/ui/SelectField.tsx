import { PSelect, PSelectOption } from '@porsche-design-system/components-react';
import { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hideLabel?: boolean;
}

/** Thin wrapper over PDS `PSelect`, normalizing to `onChange(value)`. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  name,
  required,
  disabled,
  error,
  hideLabel,
}: SelectFieldProps) {
  const generatedName = useId();
  return (
    <PSelect
      name={name ?? generatedName}
      label={label}
      hideLabel={hideLabel}
      value={value}
      required={required}
      disabled={disabled}
      state={error ? 'error' : 'none'}
      message={error ?? ''}
      onChange={(event) => onChange(String(event.detail.value ?? ''))}
    >
      {options.map((option) => (
        <PSelectOption key={option.value} value={option.value}>
          {option.label}
        </PSelectOption>
      ))}
    </PSelect>
  );
}
