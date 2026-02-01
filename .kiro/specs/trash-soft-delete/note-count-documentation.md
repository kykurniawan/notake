# Note Count Display Documentation

## Task 14.1: Update note count displays (if exist)

**Date:** 2024
**Status:** No existing note count displays found

## Investigation Summary

A comprehensive search of the codebase was conducted to identify any existing note count displays that would need to be updated to filter out soft-deleted notes (WHERE deletedAt IS NULL).

### Areas Investigated

1. **Sidebar Component** (`app/components/sidebar.tsx`)
   - No count badges or statistics displayed
   - Menu items do not show note counts

2. **Dashboard** (`app/(dashboard)/page.tsx`)
   - Displays recent notes but no total count
   - No statistics or count displays

3. **All Notes Page** (`app/(dashboard)/notes/page.tsx`)
   - Lists notes with pagination
   - No total count or statistics displayed

4. **API Routes** (`app/api/notes/route.ts`)
   - No COUNT queries found
   - No endpoints returning note counts

5. **Database Queries**
   - No SQL COUNT operations found in the codebase

### Conclusion

**No note count displays currently exist in the application.**

## Future Implementation Requirements

When note count displays are added to the application in the future, they **MUST** follow these requirements to comply with Requirement 9.5:

### Requirement 9.5: Note Count Filtering

> THE Note_Count_Displays SHALL count only active notes, excluding deleted notes

### Implementation Guidelines

Any future note count implementation MUST:

1. **Filter deleted notes in queries:**
   ```typescript
   // Example: Correct implementation
   const count = await db
     .select({ count: sql<number>`count(*)` })
     .from(note)
     .where(and(
       eq(note.userId, userId),
       isNull(note.deletedAt)  // REQUIRED: Exclude deleted notes
     ));
   ```

2. **Apply to all count displays:**
   - Sidebar count badges (if added)
   - Dashboard statistics (if added)
   - Category/folder counts (if added)
   - Search result counts (if added)
   - Any other count displays

3. **Test coverage:**
   - Property test 22 must be implemented when counts are added
   - Unit tests should verify counts exclude deleted notes

### Potential Future Locations for Counts

If note counts are added, they might appear in:

- **Sidebar menu items** - Badge showing number of notes per category
- **Dashboard header** - Total active notes statistic
- **All Notes page header** - "Showing X of Y notes"
- **Trash page** - Count of deleted notes
- **Search results** - "Found X notes"

### Example Implementation

```typescript
// API endpoint for note count
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Count only active notes (deletedAt IS NULL)
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(note)
    .where(and(
      eq(note.userId, session.user.id),
      isNull(note.deletedAt)  // Critical: exclude deleted notes
    ));

  return Response.json({ count: result[0].count });
}
```

### Testing Requirements

When implementing note counts, ensure:

1. **Property Test 22** is implemented:
   - *For any* set of notes, the displayed count should only include notes where deletedAt is null
   - **Validates: Requirements 9.5**

2. **Unit tests** cover:
   - Count with all active notes
   - Count with all deleted notes (should be 0)
   - Count with mixed active and deleted notes
   - Count updates after soft delete
   - Count updates after restore

## Related Requirements

- **Requirement 9.5:** Note count displays SHALL count only active notes
- **Property 22:** Note count excludes deleted notes
- **Task 14.2:** Write property test for note counts (blocked until counts exist)

## Action Items

- [x] Document that no note count displays currently exist
- [x] Provide implementation guidelines for future development
- [ ] Implement note counts (future work)
- [ ] Implement Property Test 22 when counts are added
- [ ] Update this documentation when counts are implemented

## References

- Requirements Document: `.kiro/specs/trash-soft-delete/requirements.md`
- Design Document: `.kiro/specs/trash-soft-delete/design.md`
- Tasks: `.kiro/specs/trash-soft-delete/tasks.md`
