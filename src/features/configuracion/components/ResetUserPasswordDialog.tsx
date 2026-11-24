import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USUARIO_CLAVE_MIN, resetClaveFormSchema, type ResetClaveFormValues } from '../schemas'
import type { UsuarioAdmin } from '../types'
import { useResetUsuarioPasswordMutation } from '../useConfiguracionQueries'

interface ResetUserPasswordDialogProps {
  user: UsuarioAdmin | null
  onClose: () => void
}

function generateSecurePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols
  const chars: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]
  while (chars.length < length) {
    chars.push(all[Math.floor(Math.random() * all.length)])
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function ResetUserPasswordDialog({
  user,
  onClose,
}: ResetUserPasswordDialogProps) {
  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        {user !== null && (
          <ResetUserPasswordContent
            key={user.nombre_usuario}
            user={user}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResetUserPasswordContent({
  user,
  onClose,
}: {
  user: UsuarioAdmin
  onClose: () => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmedPassword, setConfirmedPassword] = useState<string | null>(null)
  const resetMutation = useResetUsuarioPasswordMutation()

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetClaveFormValues>({
    resolver: zodResolver(resetClaveFormSchema),
    defaultValues: {
      nueva_clave: '',
      confirmar_clave: '',
    },
  })

  const currentPassword = useWatch({ control, name: 'nueva_clave' })

  const handleGenerate = () => {
    const generated = generateSecurePassword(12)
    setValue('nueva_clave', generated, { shouldValidate: true })
    setValue('confirmar_clave', generated, { shouldValidate: true })
    setShowPassword(true)
    setCopied(false)
  }

  const handleCopy = async (text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard no disponible en entorno sin permisos
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await resetMutation.mutateAsync({
        nombreUsuario: user.nombre_usuario,
        payload: { nueva_clave: values.nueva_clave },
      })
      setConfirmedPassword(res.clave_temporal || values.nueva_clave)
    } catch {
      // Manejado por notifyStage2MutationError
    }
  })

  if (confirmedPassword !== null) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-emerald-600 dark:text-emerald-400" />
            Contraseña restablecida
          </DialogTitle>
          <DialogDescription className="text-xs">
            La nueva clave para{' '}
            <span className="font-mono font-semibold text-foreground">
              {user.nombre_usuario}
            </span>{' '}
            quedó registrada. Cópiala y compártela por un canal seguro.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
          <span className="truncate font-mono text-sm font-semibold text-foreground select-all">
            {confirmedPassword}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void handleCopy(confirmedPassword)}
            aria-label="Copiar contraseña restablecida"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                Copiada
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copiar
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" size="sm" onClick={onClose}>
            Listo
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" />
          Restablecer contraseña
        </DialogTitle>
        <DialogDescription className="text-xs">
          Asigna una nueva contraseña temporal o definitiva para{' '}
          <span className="font-mono font-semibold text-foreground">
            {user.nombre_usuario}
          </span>{' '}
          (mínimo {USUARIO_CLAVE_MIN} caracteres).
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleGenerate}
            disabled={resetMutation.isPending}
          >
            <Sparkles className="size-3" />
            Generar clave segura
          </Button>

          {currentPassword && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void handleCopy(currentPassword)}
              aria-label="Copiar contraseña generada"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  Copiada
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copiar
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-nueva-clave" className="text-xs">
            Nueva contraseña
          </Label>
          <div className="relative">
            <Input
              id="reset-nueva-clave"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-9 font-mono text-xs"
              disabled={resetMutation.isPending}
              {...register('nueva_clave')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </button>
          </div>
          {errors.nueva_clave && (
            <p className="text-[11px] text-destructive">
              {errors.nueva_clave.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-confirmar-clave" className="text-xs">
            Confirmar contraseña
          </Label>
          <Input
            id="reset-confirmar-clave"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="font-mono text-xs"
            disabled={resetMutation.isPending}
            {...register('confirmar_clave')}
          />
          {errors.confirmar_clave && (
            <p className="text-[11px] text-destructive">
              {errors.confirmar_clave.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={resetMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            Restablecer clave
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
