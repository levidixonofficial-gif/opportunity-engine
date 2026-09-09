import * as React from "react";
import { cn } from "@/lib/utils";
import { Input, Label, Textarea } from "@/components/ui/misc";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  name,
  hint,
  error,
  ...props
}: { label: string; name: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error}>
      <Input id={name} name={name} {...props} />
    </Field>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  error,
  ...props
}: { label: string; name: string; hint?: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error}>
      <Textarea id={name} name={name} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  name,
  options,
  hint,
  error,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
  defaultValue?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
