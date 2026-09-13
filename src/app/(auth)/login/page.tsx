import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'

import { LoginForm } from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Iniciar sesión | JR Realty',
}

export default function LoginPage() {
  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="items-center pb-6 pt-8 text-center">
          <Image
            src="/images/logo.svg"
            alt="JR Realty"
            width={500}
            height={500}
            priority
            className="mb-2 size-16 rounded-xl object-cover ring-1 ring-foreground/10"
          />
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </CardTitle>
          <CardDescription>Panel de administración</CardDescription>
        </CardHeader>
        <CardContent>
          {/* useSearchParams requiere Suspense durante el prerenderizado estático */}
          <Suspense fallback={<div className="min-h-[220px]" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button
          variant="link"
          className="text-muted-foreground"
          render={<Link href="/" />}
        >
          Volver al inicio
        </Button>
      </div>
    </>
  )
}
