'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ComponentProps } from 'react'

type SubmitButtonProps = ComponentProps<typeof Button> & {
  isPending: boolean
  pendingText?: string
}

export function SubmitButton({
  isPending,
  pendingText,
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled ?? isPending}
      aria-busy={isPending}
      aria-disabled={isPending}
      {...props}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
