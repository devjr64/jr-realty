import { cloneElement, isValidElement, type ReactNode } from 'react'

import { Label } from '@/components/ui/label'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  /** Single form control — e.g. the shadcn `Input` or `Select`. */
  children: ReactNode
}

type ControlProps = {
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Wraps a form control with a label and a per-field error message.
 *
 * When `error` is set, the message gets `id={htmlFor}-error` and the control
 * receives `aria-invalid` + `aria-describedby` pointing at it. The attributes
 * are injected via `cloneElement`, so `children` must be a single element that
 * accepts them (all shadcn inputs do).
 */
export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`

  const control =
    error && isValidElement<ControlProps>(children)
      ? cloneElement(children, {
          'aria-invalid': true,
          'aria-describedby': errorId,
        })
      : children

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-primary" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {control}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
