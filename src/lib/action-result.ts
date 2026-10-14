export type FieldErrors = Record<string, string[] | undefined>

export type ActionResult =
  { ok: true } | { ok: false; error?: string; fieldErrors?: FieldErrors }

export const OK: ActionResult = { ok: true }

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult {
  return { ok: false, error, fieldErrors }
}
