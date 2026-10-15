'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { createPost } from '../actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormError } from '@/components/ui/FormError'
import { PhotoIcon } from '@/components/icons'
import { Avatar } from '@/features/profile/components/Avatar'
import type { ActionResult } from '@/lib/action-result'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/image-rules'
import { useImageField } from '@/components/ui/useImageField'

const initial: ActionResult = { ok: true }

export type ComposerViewer = { name: string; avatarUrl: string | null }

export function PostComposer({
  viewer,
  groupId,
  pageId,
}: {
  viewer: ComposerViewer
  groupId?: string
  pageId?: string
}) {
  const [state, action, pending] = useActionState(createPost, initial)
  const formRef = useRef<HTMLFormElement>(null)
  const image = useImageField()
  const [fileName, setFileName] = useState<string | null>(null)
  const bodyId = useId()
  const fileId = useId()
  const fileErrorId = `${fileId}-error`

  // Clear the form after a successful post: the action returns a new ok object.
  // Skip the initial object, or text typed before hydration would be wiped on mount.
  useEffect(() => {
    if (state.ok && state !== initial) {
      formRef.current?.reset()
      image.reset()
      setFileName(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the action result changes
  }, [state])

  const firstName = viewer.name.trim().split(/\s+/)[0] || viewer.name

  return (
    <Card>
      <form
        ref={formRef}
        action={action}
        onSubmit={image.onSubmit}
        className="flex flex-col gap-3"
      >
        <FormError message={!state.ok ? state.error : undefined} />
        {groupId ? (
          <input type="hidden" name="groupId" value={groupId} />
        ) : null}
        {pageId ? <input type="hidden" name="pageId" value={pageId} /> : null}
        <div className="flex items-start gap-3">
          <Avatar name={viewer.name} avatarUrl={viewer.avatarUrl} size="md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={bodyId} className="sr-only">
              What&apos;s on your mind?
            </label>
            <textarea
              id={bodyId}
              name="body"
              rows={2}
              maxLength={2000}
              placeholder={`What's on your mind, ${firstName}?`}
              className="w-full resize-y rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm outline-none placeholder:text-zinc-500 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <label
              htmlFor={fileId}
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <PhotoIcon className="h-6 w-6 text-green-600" />
              Photo
            </label>
            <input
              id={fileId}
              name="image"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              aria-label="Image"
              aria-invalid={image.error ? true : undefined}
              aria-describedby={image.error ? fileErrorId : undefined}
              onChange={(event) => {
                image.onChange(event)
                setFileName(event.target.files?.[0]?.name ?? null)
              }}
              className="sr-only"
            />
            {image.error ? (
              <p id={fileErrorId} className="truncate text-xs text-red-600">
                {image.error}
              </p>
            ) : fileName ? (
              <p className="truncate text-xs text-zinc-500">{fileName}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={pending || Boolean(image.error)}>
            {pending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
