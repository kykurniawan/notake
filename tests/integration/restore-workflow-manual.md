# Manual Testing Procedure: Restore Workflow

This document provides step-by-step instructions for manually testing the complete restore workflow.

**Task:** 16.2 Test complete restore workflow  
**Requirements:** 5.2, 5.3, 5.4, 5.5

---

## Prerequisites

1. Application is running locally (`npm run dev`)
2. Database is accessible and migrations are applied
3. You have a user account and are logged in
4. You have at least one note in your account

---

## Test Procedure

### Part 1: Single Note Restore

#### Step 1: Create a Test Note
1. Navigate to the dashboard
2. Click "New Note" or create a note
3. Enter title: "Test Note for Restore"
4. Enter some content: "This note will be deleted and restored"
5. Note the note ID from the URL (e.g., `/notes/abc-123`)

**Expected Result:** Note is created and visible in the notes list

#### Step 2: Soft Delete the Note
1. Open the note you just created
2. Click the three-dot menu button (⋮) in the note editor
3. Click "Move to Trash"

**Expected Result:**
- ✅ Success message: "Note moved to trash"
- ✅ Redirected to `/notes` (notes list)
- ✅ Note is NOT visible in the notes list

**Requirement Verified:** 4.4 (Soft delete removes note from active list)

#### Step 3: Verify Note in Trash
1. Click "Trash" in the sidebar (red text with trash icon)
2. Navigate to `/trash`

**Expected Result:**
- ✅ Note appears in the trash list
- ✅ Note shows title: "Test Note for Restore"
- ✅ Note shows content preview
- ✅ Note shows deletion time (e.g., "Deleted 2m ago")
- ✅ Note has a "Restore" button

**Requirement Verified:** 3.1 (Trash view displays deleted notes)

#### Step 4: Restore the Note
1. In the trash view, find your test note
2. Click the "Restore" button next to the note

**Expected Result:**
- ✅ Success message: "Note restored successfully"
- ✅ Note disappears from the trash list immediately
- ✅ No errors in the console

**Requirement Verified:** 5.2 (Restore sets deletedAt to null), 5.3 (Restore removes note from trash)

#### Step 5: Verify Note in Active List
1. Click "All Notes" in the sidebar
2. Navigate to `/notes`

**Expected Result:**
- ✅ Note appears in the active notes list
- ✅ Note shows correct title: "Test Note for Restore"
- ✅ Note shows correct content preview
- ✅ Note is clickable and opens correctly

**Requirement Verified:** 5.4 (Restore makes note appear in active list)

#### Step 6: Verify Note Data Integrity
1. Click on the restored note to open it
2. Check the note content

**Expected Result:**
- ✅ Title is unchanged: "Test Note for Restore"
- ✅ Content is unchanged: "This note will be deleted and restored"
- ✅ Note is fully editable
- ✅ No data loss occurred

**Requirement Verified:** 5.5 (Restore preserves all note data)

#### Step 7: Verify Note Not in Trash
1. Navigate back to `/trash`

**Expected Result:**
- ✅ The restored note is NOT in the trash list
- ✅ Trash may be empty or show other deleted notes

**Requirement Verified:** 5.3 (Restore removes note from trash view)

---

### Part 2: Bulk Restore

#### Step 1: Create Multiple Test Notes
1. Create 3 new notes with titles:
   - "Bulk Test Note 1"
   - "Bulk Test Note 2"
   - "Bulk Test Note 3"

**Expected Result:** All 3 notes are created and visible

#### Step 2: Soft Delete All Test Notes
1. Open each note and move it to trash using the three-dot menu
2. Repeat for all 3 notes

**Expected Result:**
- ✅ All 3 notes are moved to trash
- ✅ All 3 notes are NOT in the active notes list

#### Step 3: Navigate to Trash
1. Click "Trash" in the sidebar
2. Verify all 3 notes are visible

**Expected Result:**
- ✅ All 3 test notes appear in trash
- ✅ Each has a checkbox
- ✅ "Select All" checkbox is visible in the header

#### Step 4: Select Multiple Notes
1. Check the checkbox next to "Bulk Test Note 1"
2. Check the checkbox next to "Bulk Test Note 2"
3. Leave "Bulk Test Note 3" unchecked

**Expected Result:**
- ✅ Both checkboxes are checked
- ✅ "2 selected" text appears
- ✅ "Restore Selected (2)" button appears

#### Step 5: Bulk Restore Selected Notes
1. Click the "Restore Selected (2)" button

**Expected Result:**
- ✅ Success message: "2 notes restored successfully"
- ✅ Both selected notes disappear from trash immediately
- ✅ "Bulk Test Note 3" remains in trash (unchecked)
- ✅ Selection is cleared

**Requirement Verified:** 6.6, 6.7, 6.8 (Bulk restore functionality)

#### Step 6: Verify Restored Notes in Active List
1. Navigate to `/notes`

**Expected Result:**
- ✅ "Bulk Test Note 1" appears in active list
- ✅ "Bulk Test Note 2" appears in active list
- ✅ "Bulk Test Note 3" is NOT in active list (still in trash)

#### Step 7: Test Select All
1. Navigate back to `/trash`
2. Click the "Select All" checkbox

**Expected Result:**
- ✅ All visible notes are selected (including "Bulk Test Note 3")
- ✅ "Restore Selected" button shows correct count

#### Step 8: Restore Remaining Note
1. With "Select All" checked, click "Restore Selected"

**Expected Result:**
- ✅ Success message shows correct count
- ✅ All notes removed from trash
- ✅ Trash is now empty (or shows empty state)

#### Step 9: Verify All Notes Restored
1. Navigate to `/notes`

**Expected Result:**
- ✅ All 3 bulk test notes appear in active list
- ✅ All notes are accessible and editable

---

### Part 3: Edge Cases

#### Test 1: Restore Already Active Note (Should Not Be Possible)
1. Create a note and keep it active (don't delete it)
2. Try to manually call the restore endpoint (using browser dev tools or curl):
   ```bash
   curl -X POST http://localhost:3000/api/notes/[note-id]/restore \
     -H "Cookie: [your-session-cookie]"
   ```

**Expected Result:**
- ✅ Returns 404 error: "Note not found or not deleted"
- ✅ Note remains active and unchanged

#### Test 2: Restore Note Owned by Different User
1. Create a note with User A
2. Soft delete the note
3. Try to restore it as User B (different account)

**Expected Result:**
- ✅ Returns 404 error (note not found)
- ✅ Note remains in User A's trash
- ✅ User B cannot access or restore User A's notes

#### Test 3: Empty Trash State
1. Restore all notes from trash
2. Navigate to `/trash`

**Expected Result:**
- ✅ Empty state message: "Trash is empty"
- ✅ Helpful text: "Deleted notes will appear here and can be restored"
- ✅ Trash icon displayed
- ✅ No errors

#### Test 4: Restore with Network Error
1. Open browser dev tools
2. Go to Network tab and enable "Offline" mode
3. Try to restore a note from trash

**Expected Result:**
- ✅ Error message displayed
- ✅ Note remains in trash (not removed from UI)
- ✅ User can retry after going back online

---

## Database Verification (Optional)

If you have access to the database, you can verify the data directly:

### Before Restore
```sql
SELECT id, title, "deletedAt", "updatedAt" 
FROM note 
WHERE id = '[your-note-id]';
```

**Expected Result:**
- `deletedAt` is NOT NULL (has a timestamp)

### After Restore
```sql
SELECT id, title, "deletedAt", "updatedAt" 
FROM note 
WHERE id = '[your-note-id]';
```

**Expected Result:**
- `deletedAt` is NULL
- `updatedAt` has been updated to a recent timestamp
- `title`, `content`, `createdAt` are unchanged

---

## Checklist

Use this checklist to track your testing progress:

### Single Note Restore
- [ ] Note created successfully
- [ ] Note soft-deleted successfully
- [ ] Note appears in trash view
- [ ] Note has "Restore" button
- [ ] Restore button works
- [ ] Success message displayed
- [ ] Note removed from trash view
- [ ] Note appears in active notes list
- [ ] Note data is intact (title, content)
- [ ] Note is editable after restore

### Bulk Restore
- [ ] Multiple notes created
- [ ] All notes soft-deleted
- [ ] All notes appear in trash
- [ ] Checkboxes work correctly
- [ ] "Select All" works
- [ ] Selection count is accurate
- [ ] "Restore Selected" button appears
- [ ] Bulk restore works
- [ ] Success message shows correct count
- [ ] All selected notes removed from trash
- [ ] All selected notes appear in active list

### Edge Cases
- [ ] Cannot restore active note
- [ ] Cannot restore other user's notes
- [ ] Empty trash state displays correctly
- [ ] Network errors handled gracefully

---

## Troubleshooting

### Issue: Note doesn't appear in trash after delete
**Solution:** 
- Check browser console for errors
- Verify the DELETE endpoint is working
- Check database to see if `deletedAt` was set

### Issue: Restore button doesn't work
**Solution:**
- Check browser console for errors
- Verify the restore endpoint is accessible
- Check network tab for failed requests

### Issue: Note appears in both trash and active list
**Solution:**
- This should not happen - it's a bug
- Check the filtering logic in GET /api/notes
- Verify `deletedAt` value in database

### Issue: Note data is lost after restore
**Solution:**
- This should not happen - it's a critical bug
- Check the restore endpoint implementation
- Verify only `deletedAt` and `updatedAt` are modified

---

## Success Criteria

All tests pass if:
- ✅ Single note restore works correctly
- ✅ Bulk restore works correctly
- ✅ Notes appear in correct views (trash vs active)
- ✅ All note data is preserved
- ✅ Success messages are displayed
- ✅ Edge cases are handled properly
- ✅ No console errors
- ✅ No data loss

---

**Test Completed By:** _______________  
**Date:** _______________  
**Result:** ✅ Pass / ❌ Fail  
**Notes:** _______________
