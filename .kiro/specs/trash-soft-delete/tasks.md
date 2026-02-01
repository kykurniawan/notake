# Implementation Plan: Trash/Soft-Delete Feature

## Overview

This implementation plan breaks down the trash/soft-delete feature into discrete, incremental tasks. The approach follows a bottom-up strategy: database schema first, then API layer, and finally UI components. Each task builds on previous work, ensuring the system remains functional at each step.

## Tasks

- [x] 1. Database schema extension and migration
  - Add `deletedAt` nullable timestamp field to the note table schema
  - Create database migration file to add the column and index
  - Run migration to update the database
  - Verify existing notes have `deletedAt` set to null
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property test for note creation with deletedAt
  - **Property 1: Note creation initializes deletedAt to null**
  - **Validates: Requirements 1.2**

- [ ] 2. Implement soft delete API endpoint
  - [x] 2.1 Create DELETE /api/notes/[id] route handler
    - Verify user session and note ownership
    - Set `deletedAt` to current timestamp
    - Set `updatedAt` to current timestamp
    - Return updated note with 200 status
    - Handle error cases (401, 403, 404)
    - _Requirements: 4.2, 7.1, 7.6, 7.7_

  - [ ]* 2.2 Write property tests for soft delete
    - **Property 2: Soft delete sets deletedAt timestamp**
    - **Property 3: Soft delete preserves note data**
    - **Property 18: Unauthorized soft delete returns 403**
    - **Validates: Requirements 1.3, 4.2, 4.5, 7.6, 7.7**

  - [ ]* 2.3 Write unit tests for soft delete edge cases
    - Test soft-deleting already deleted note
    - Test soft-deleting non-existent note
    - Test soft-deleting note owned by different user
    - _Requirements: 7.6, 7.7_

- [ ] 3. Implement single note restore API endpoint
  - [x] 3.1 Create POST /api/notes/[id]/restore route handler
    - Verify user session and note ownership
    - Verify note is deleted (deletedAt IS NOT NULL)
    - Set `deletedAt` to null
    - Set `updatedAt` to current timestamp
    - Return updated note with 200 status
    - Handle error cases (401, 403, 404)
    - _Requirements: 5.2, 7.2, 7.6, 7.7_

  - [ ]* 3.2 Write property tests for restore
    - **Property 4: Restore operation round trip**
    - **Property 5: Restore preserves note data**
    - **Property 19: Unauthorized restore returns 403**
    - **Validates: Requirements 1.4, 5.2, 5.5, 7.6, 7.7**

  - [ ]* 3.3 Write unit tests for restore edge cases
    - Test restoring active (non-deleted) note
    - Test restoring non-existent note
    - Test restoring note owned by different user
    - _Requirements: 7.6, 7.7_

- [ ] 4. Implement bulk restore API endpoint
  - [x] 4.1 Create POST /api/notes/restore route handler
    - Accept array of note IDs in request body
    - Verify user session
    - Filter to notes owned by user and currently deleted
    - Set `deletedAt` to null for all matching notes
    - Set `updatedAt` to current timestamp for all
    - Return count of restored notes and updated notes array
    - Handle error cases (401, 400, partial success)
    - _Requirements: 6.6, 7.3, 7.6_

  - [ ]* 4.2 Write property tests for bulk restore
    - **Property 14: Bulk restore sets deletedAt to null for all selected notes**
    - **Property 15: Bulk restore preserves note data**
    - **Property 16: Bulk restore removes all notes from trash**
    - **Validates: Requirements 6.6, 6.7, 6.9**

  - [ ]* 4.3 Write unit tests for bulk restore edge cases
    - Test bulk restore with empty array
    - Test bulk restore with invalid note IDs
    - Test bulk restore with mix of owned and unowned notes
    - Test bulk restore with mix of deleted and active notes
    - _Requirements: 7.3, 7.6_

- [x] 5. Checkpoint - Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Modify GET /api/notes to support deleted filter
  - [x] 6.1 Update GET /api/notes route handler
    - Add `deleted` query parameter support
    - If `deleted=true`: filter WHERE deletedAt IS NOT NULL, order by deletedAt DESC
    - If `deleted` not provided: filter WHERE deletedAt IS NULL, order by createdAt DESC
    - Maintain existing pagination logic with cursor
    - _Requirements: 7.4, 7.5, 9.2_

  - [ ]* 6.2 Write property tests for notes filtering
    - **Property 9: Active notes API excludes deleted notes**
    - **Property 10: Deleted notes API includes only deleted notes**
    - **Property 11: Soft delete removes note from active list**
    - **Property 12: Restore adds note to active list**
    - **Property 13: Restore removes note from trash list**
    - **Validates: Requirements 4.4, 5.3, 5.4, 7.4, 7.5, 9.2**

  - [ ]* 6.3 Write unit tests for filtering edge cases
    - Test with all active notes
    - Test with all deleted notes
    - Test with mixed active and deleted notes
    - Test pagination with deleted filter
    - _Requirements: 7.4, 7.5_

- [ ] 7. Add Trash menu item to Sidebar component
  - [x] 7.1 Update Sidebar component
    - Add Trash menu item after Archive in the menu list
    - Use red color styling (text-red-600)
    - Add trash bin SVG icon
    - Link to `/trash` route
    - Highlight when pathname is `/trash`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 7.2 Write unit tests for Sidebar Trash menu
    - Test Trash menu item renders with correct text
    - Test Trash menu item has red color class
    - Test Trash menu item has trash icon
    - Test Trash menu item links to /trash
    - Test Trash menu item shows active state when on /trash
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 8. Create Trash page component
  - [x] 8.1 Create app/(dashboard)/trash/page.tsx
    - Fetch deleted notes on mount using GET /api/notes?deleted=true
    - Display notes in list format with title, content preview, and deletion date
    - Show empty state when no deleted notes exist
    - Implement pagination with infinite scroll
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Add checkbox functionality to Trash page
    - Add checkbox next to each deleted note
    - Add "Select All" checkbox in header
    - Track selected note IDs in component state
    - Update selections when individual checkboxes are clicked
    - Update all selections when "Select All" is clicked
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.3 Add restore functionality to Trash page
    - Add "Restore" button for each note
    - Show "Restore Selected" button when notes are selected
    - Implement single note restore (call POST /api/notes/[id]/restore)
    - Implement bulk restore (call POST /api/notes/restore)
    - Remove restored notes from the list
    - Show success toast with count of restored notes
    - Handle errors gracefully
    - _Requirements: 5.1, 5.2, 5.3, 6.5, 6.6, 6.7, 6.8, 8.3, 8.4_

  - [ ]* 8.4 Write property tests for Trash page
    - **Property 6: Trash view displays only deleted notes**
    - **Property 7: Trash view sorts by deletion time**
    - **Property 8: Deleted note rendering includes required fields**
    - **Property 23: Trash view checkboxes track selections**
    - **Property 24: Restore button visibility depends on selections**
    - **Property 25: Each deleted note has restore button**
    - **Property 26: Each deleted note has checkbox**
    - **Property 27: Pagination returns next page of deleted notes**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 5.1, 6.1, 6.3, 6.5, 8.3**

  - [ ]* 8.5 Write unit tests for Trash page
    - Test empty state renders when no deleted notes
    - Test notes render with correct information
    - Test "Select All" checkbox selects all notes
    - Test individual checkbox selection
    - Test "Restore Selected" button appears when selections exist
    - Test single note restore removes note from list
    - Test bulk restore removes all selected notes from list
    - Test success message shows correct count
    - _Requirements: 3.4, 5.1, 6.2, 6.4, 6.8, 8.4_

- [x] 9. Checkpoint - Ensure all UI tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Add delete menu to Note Editor
  - [x] 10.1 Update Note Editor component
    - Add three-dot menu button in the header
    - Create dropdown menu with "Move to Trash" option
    - Add trash icon to the menu option
    - Implement soft delete handler (call DELETE /api/notes/[id])
    - Redirect to /notes after successful delete
    - Show success toast after delete
    - Handle errors gracefully
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 8.2, 8.5_

  - [ ]* 10.2 Write unit tests for Note Editor delete menu
    - Test menu button renders
    - Test menu opens when button clicked
    - Test "Move to Trash" option renders with icon
    - Test clicking delete calls API and redirects
    - Test success toast appears after delete
    - Test error handling for failed delete
    - _Requirements: 4.1, 8.1, 8.2, 8.5_

- [ ] 11. Update Dashboard to filter deleted notes
  - [x] 11.1 Verify Dashboard uses default GET /api/notes
    - Confirm Dashboard fetches notes without `deleted` parameter
    - This automatically filters to active notes only
    - No code changes needed if already using default endpoint
    - _Requirements: 9.1_

  - [ ]* 11.2 Write property test for Dashboard filtering
    - **Property 20: Dashboard displays only active notes**
    - **Validates: Requirements 9.1**

- [ ] 12. Update All Notes page to filter deleted notes
  - [x] 12.1 Verify All Notes page uses default GET /api/notes
    - Confirm All Notes page fetches notes without `deleted` parameter
    - This automatically filters to active notes only
    - No code changes needed if already using default endpoint
    - _Requirements: 9.2_

- [ ] 13. Add search filtering for deleted notes
  - [x] 13.1 Update search functionality (if exists)
    - Ensure search queries filter WHERE deletedAt IS NULL
    - If no search exists yet, document requirement for future implementation
    - _Requirements: 9.3_

  - [ ]* 13.2 Write property test for search filtering
    - **Property 21: Search excludes deleted notes**
    - **Validates: Requirements 9.3**

- [ ] 14. Add note count filtering
  - [x] 14.1 Update note count displays (if exist)
    - Ensure counts filter WHERE deletedAt IS NULL
    - If no counts exist yet, document requirement for future implementation
    - _Requirements: 9.5_

  - [ ]* 14.2 Write property test for note counts
    - **Property 22: Note count excludes deleted notes**
    - **Validates: Requirements 9.5**

- [ ] 15. Handle viewing deleted notes directly
  - [x] 15.1 Update Note Editor to detect deleted notes
    - When fetching note by ID, check if deletedAt is not null
    - If deleted, show "Note in trash" message instead of editor
    - Provide "Restore" button to restore the note
    - After restore, reload the note in editor
    - _Requirements: 9.4_

  - [ ]* 15.2 Write unit tests for deleted note view
    - Test deleted note shows special message
    - Test restore button appears for deleted note
    - Test clicking restore reloads note in editor
    - _Requirements: 9.4_

- [ ] 16. Final checkpoint - Integration testing
  - [x] 16.1 Test complete soft-delete workflow
    - Create note → soft delete → verify in trash → verify not in active notes
    - _Requirements: 1.3, 3.1, 4.4_

  - [x] 16.2 Test complete restore workflow
    - Soft delete note → restore from trash → verify in active notes → verify not in trash
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 16.3 Test complete bulk restore workflow
    - Soft delete multiple notes → select in trash → bulk restore → verify all in active notes
    - _Requirements: 6.6, 6.7_

  - [x] 16.4 Test navigation and UI integration
    - Navigate between Dashboard, All Notes, Trash, and Note Editor
    - Verify counts and lists update correctly after operations
    - Verify styling and icons render correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database → API → UI
- All API endpoints must verify user ownership before operations
- All UI components should handle loading and error states gracefully
