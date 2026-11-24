import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText || 'Error de navegación'}`
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Ocurrió un error inesperado al renderizar este módulo.'
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const message = getErrorMessage(error)

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/40">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5 shrink-0" />
            <CardTitle className="text-base">No se pudo renderizar el módulo</CardTitle>
          </div>
          <CardDescription>
            El panel capturó un error de ejecución para evitar la pérdida de tu sesión operativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground break-words">
            {message}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="size-3.5" />
              Recargar vista
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/" />}>
              <Home className="size-3.5" />
              Centro de Control
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
