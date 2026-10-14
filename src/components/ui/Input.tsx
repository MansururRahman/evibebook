import {
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

type FieldProps = { label: string; errors?: string[] }

export function Input({
  label,
  errors,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
        {...props}
        className={`rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors?.length ? 'border-red-500' : 'border-zinc-300'} ${props.className ?? ''}`}
      />
      {errors?.length ? (
        <p id={errorId} className="text-xs text-red-600">
          {errors[0]}
        </p>
      ) : null}
    </div>
  )
}

export function Textarea({
  label,
  errors,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? errorId : undefined}
        {...props}
        className={`rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors?.length ? 'border-red-500' : 'border-zinc-300'} ${props.className ?? ''}`}
      />
      {errors?.length ? (
        <p id={errorId} className="text-xs text-red-600">
          {errors[0]}
        </p>
      ) : null}
    </div>
  )
}
