# Requirements Document

## Introduction

This document specifies the requirements for implementing a trash/soft-delete feature for the Notake notes application. The feature will allow users to move notes to a trash folder instead of permanently deleting them, with the ability to restore notes from trash. This provides a safety net for accidental deletions and aligns with common user expectations from note-taking applications.

## Glossary

- **Note**: A document created by a user containing a title and content, stored in the database
- **Trash**: A special view that displays all soft-deleted notes
- **Soft_Delete**: The action of marking a note as deleted without removing it from the database
- **Restore**: The action of unmarking a note as deleted, returning it to the active notes list
- **Active_Note**: A note that has not been soft-deleted and appears in the main notes list
- **Deleted_Note**: A note that has been soft-deleted and appears only in the Trash view
- **Sidebar**: The navigation component on the left side of the application
- **Note_Editor**: The page where users view and edit individual notes
- **Notes_API**: The backend API routes that handle CRUD operations for notes

## Requirements

### Requirement 1: Database Schema Extension

**User Story:** As a developer, I want to extend the database schema to support soft deletion, so that deleted notes can be tracked and restored.

#### Acceptance Criteria

1. THE Note_Schema SHALL include a nullable timestamp field named "deletedAt"
2. WHEN a note is created, THE System SHALL set the "deletedAt" field to null
3. WHEN a note is soft-deleted, THE System SHALL set the "deletedAt" field to the current timestamp
4. WHEN a note is restored, THE System SHALL set the "deletedAt" field back to null

### Requirement 2: Trash Sidebar Menu Item

**User Story:** As a user, I want to see a Trash menu item in the sidebar, so that I can access my deleted notes.

#### Acceptance Criteria

1. THE Sidebar SHALL display a "Trash" menu item below the existing menu items
2. THE Trash_Menu_Item SHALL be styled with red color (text-red-600)
3. WHEN the user is viewing the trash page, THE Trash_Menu_Item SHALL display active state styling
4. THE Trash_Menu_Item SHALL include a trash bin icon
5. WHEN the user clicks the Trash menu item, THE System SHALL navigate to the trash view

### Requirement 3: Trash View Display

**User Story:** As a user, I want to view all my deleted notes in the Trash, so that I can review what I've deleted.

#### Acceptance Criteria

1. THE Trash_View SHALL display all notes where "deletedAt" is not null
2. THE Trash_View SHALL show notes in descending order by "deletedAt" timestamp
3. WHEN displaying a deleted note, THE System SHALL show the note title, content preview, and deletion date
4. WHEN the trash is empty, THE System SHALL display an empty state message
5. THE Trash_View SHALL support pagination for large numbers of deleted notes

### Requirement 4: Soft Delete Operation

**User Story:** As a user, I want to move notes to trash instead of permanently deleting them, so that I can recover them if needed.

#### Acceptance Criteria

1. THE Note_Editor SHALL display a menu option to move the current note to trash
2. WHEN a user clicks the trash option, THE System SHALL set the note's "deletedAt" field to the current timestamp
3. WHEN a note is moved to trash, THE System SHALL redirect the user to the notes list
4. WHEN a note is moved to trash, THE System SHALL remove it from the active notes list
5. THE Soft_Delete_Operation SHALL preserve all note data including title and content

### Requirement 5: Restore Operation

**User Story:** As a user, I want to restore deleted notes from the trash, so that I can recover accidentally deleted notes.

#### Acceptance Criteria

1. THE Trash_View SHALL display a restore button for each deleted note
2. WHEN a user clicks the restore button, THE System SHALL set the note's "deletedAt" field to null
3. WHEN a note is restored, THE System SHALL remove it from the trash view
4. WHEN a note is restored, THE System SHALL make it appear in the active notes list
5. THE Restore_Operation SHALL preserve all note data including title, content, and original creation date

### Requirement 6: Bulk Restore Operation

**User Story:** As a user, I want to select multiple notes in the trash and restore them all at once, so that I can efficiently recover multiple notes.

#### Acceptance Criteria

1. THE Trash_View SHALL display a checkbox next to each deleted note
2. THE Trash_View SHALL display a "Select All" checkbox in the header
3. WHEN a user checks individual note checkboxes, THE System SHALL track the selected notes
4. WHEN a user clicks "Select All", THE System SHALL select all visible deleted notes
5. WHEN one or more notes are selected, THE System SHALL display a "Restore Selected" button
6. WHEN a user clicks "Restore Selected", THE System SHALL set the "deletedAt" field to null for all selected notes
7. WHEN bulk restore completes, THE System SHALL remove all restored notes from the trash view
8. WHEN bulk restore completes, THE System SHALL display a success message indicating the number of notes restored
9. THE Bulk_Restore_Operation SHALL preserve all note data for each restored note

### Requirement 7: API Route Extensions

**User Story:** As a developer, I want API routes to handle soft delete and restore operations, so that the frontend can perform these actions.

#### Acceptance Criteria

1. THE Notes_API SHALL provide a DELETE endpoint that performs soft deletion
2. THE Notes_API SHALL provide a POST endpoint for restoring notes
3. THE Notes_API SHALL provide a POST endpoint for bulk restoring multiple notes
4. WHEN the GET notes endpoint is called without parameters, THE System SHALL return only active notes (deletedAt is null)
5. WHEN the GET notes endpoint is called with a "deleted=true" parameter, THE System SHALL return only deleted notes
6. THE API_Endpoints SHALL verify user ownership before allowing soft delete or restore operations
7. IF a user attempts to soft delete or restore a note they don't own, THEN THE System SHALL return a 403 Forbidden error

### Requirement 8: User Interface Integration

**User Story:** As a user, I want intuitive controls for managing trash, so that I can easily delete and restore notes.

#### Acceptance Criteria

1. THE Note_Editor SHALL include a small menu button (three dots or similar) that reveals delete option
2. WHEN the delete menu is opened, THE System SHALL display "Move to Trash" option with a trash icon
3. THE Trash_View SHALL include a "Restore" button for each note with a restore icon
4. WHEN a restore operation succeeds, THE System SHALL show a brief success indication
5. WHEN a soft delete operation succeeds, THE System SHALL show a brief success indication

### Requirement 9: Data Filtering

**User Story:** As a user, I want deleted notes to be hidden from my main notes view, so that I only see active notes when browsing.

#### Acceptance Criteria

1. THE Dashboard_Recent_Notes SHALL display only notes where "deletedAt" is null
2. THE All_Notes_Page SHALL display only notes where "deletedAt" is null
3. THE Search_Functionality SHALL exclude deleted notes from search results
4. WHEN viewing a specific note by ID, IF the note is deleted, THEN THE System SHALL display a "Note in trash" message with restore option
5. THE Note_Count_Displays SHALL count only active notes, excluding deleted notes
