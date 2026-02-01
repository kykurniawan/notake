# Manual Integration Test: Complete Soft-Delete Workflow

**Task:** 16.1 Test complete soft-delete workflow  
**Requirements:** 1.3, 3.1, 4.4

## Test Objective
Verify that the complete soft-delete workflow works correctly:
1. Create note → soft delete → verify in trash → verify not in active notes

## Prerequisites
- Application running locally (`npm run dev`)
- Database connection available
- User account created and logged in

## Test Steps

### Step 1: Create a Test Note
1. Navigate to the application homepage
2. Click "New Note" or navigate to `/notes`
3. Create a new note with:
   - **Title:** "Test Note for Soft Delete Workflow"
   - **Content:** "This is a test note to verify the soft-delete functionality."
4. Wait for auto-save to complete (check for "Saved" indicator)
5. **Verify:** Note appears in the notes list
6. **Record:** Note ID from the URL (e.g., `/notes/[note-id]`)

### Step 2: Verify Note in Active Notes List
1. Navigate to `/notes` (All Notes page)
2. **Verify:** The test note appears in the list
3. **Verify:** Note shows correct title and content preview
4. Navigate to dashboard (`/`)
5. **Verify:** Note appears in recent notes (if applicable)

### Step 3: Soft Delete the Note
1. Navigate to the test note (`/notes/[note-id]`)
2. Click the three-dot menu button (⋮) in the top right
3. Click "Move to Trash"
4. **Verify:** Success message appears: "Note moved to trash"
5. **Verify:** Automatically redirected to `/notes`

### Step 4: Verify Note NOT in Active Notes
1. On the `/notes` page
2. **Verify:** The test note does NOT appear in the list
3. Navigate to dashboard (`/`)
4. **Verify:** The test note does NOT appear in recent notes
5. **Expected Result:** Note is completely removed from active views

### Step 5: Verify Note in Trash
1. Click "Trash" in the sidebar (should be red colored)
2. Navigate to `/trash`
3. **Verify:** The test note appears in the trash list
4. **Verify:** Note shows:
   - Correct title: "Test Note for Soft Delete Workflow"
   - Content preview
   - Deletion timestamp (e.g., "Deleted 2m ago")
5. **Verify:** Checkbox appears next to the note
6. **Verify:** "Restore" button appears for the note

### Step 6: Verify Database State (Optional - Developer Only)
If you have database access, verify the database state:

```sql
-- Check the note exists with deletedAt set
SELECT id, title, "deletedAt", "createdAt", "updatedAt"
FROM note
WHERE id = '[note-id]';

-- Expected: deletedAt should be a timestamp (not null)
-- Expected: title and content should be preserved
```

### Step 7: Verify Direct Access to Deleted Note
1. Navigate directly to the note URL: `/notes/[note-id]`
2. **Verify:** Special "Note in trash" message appears
3. **Verify:** Note title is displayed
4. **Verify:** "Restore Note" button is visible
5. **Verify:** Editor is NOT shown (note is not editable)

## Expected Results Summary

✅ **Requirement 1.3:** Note's `deletedAt` field is set to current timestamp when soft-deleted  
✅ **Requirement 3.1:** Trash view displays all notes where `deletedAt` is not null  
✅ **Requirement 4.4:** Soft-deleted note is removed from active notes list  

## Success Criteria

- [ ] Note created successfully with `deletedAt = null`
- [ ] Note appears in active notes list before deletion
- [ ] Soft delete operation completes successfully
- [ ] Note appears in trash view after deletion
- [ ] Note does NOT appear in active notes list after deletion
- [ ] Note data (title, content) is preserved after soft delete
- [ ] Direct access to deleted note shows "Note in trash" message

## Cleanup

After testing, you can:
1. Restore the note from trash (for restore workflow testing)
2. Or leave it in trash for bulk restore testing
3. Or manually delete from database if needed

## Notes

- This test validates the core soft-delete workflow
- All data should be preserved during soft delete
- The note should be completely hidden from active views
- The note should be accessible only through the trash view
