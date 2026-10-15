export type PostContainer = { groupId: string | null; pageId: string | null }

function field(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Which container (group, page, or neither) a composer submission targets. */
export function postContainer(
  formData: FormData,
): PostContainer | { error: string } {
  const groupId = field(formData, 'groupId')
  const pageId = field(formData, 'pageId')
  if (groupId && pageId)
    return { error: 'A post belongs to a group or a page, not both' }
  return { groupId, pageId }
}
