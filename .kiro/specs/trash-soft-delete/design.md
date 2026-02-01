# Design Document: Trash/Soft-Delete Feature

## Overview

This design document outlines the implementation of a trash/soft-delete feature for the Notake notes application. The feature enables users to move notes to a trash folder instead of permanently deleting them, with the ability to restore notes individually or in bulk. The implementation follows a soft-delete pattern using a `deletedAt` timestamp field, ensuring data preservation while maintaining clean separation between active and deleted notes.

The design integrates seamlessly with the existing Next.js application architecture, extending the Drizzle ORM schema, API routes, and React components to support the new functionality.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Sidebar Component    │  Trash Page    │  Note Editor       │
│  - Trash Menu Item    │  - Note List   │  - Delete Menu     │
│  - Red Styling        │  - Checkboxes  │  - Soft Delete     │
│                       │  - Bulk Restore│                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
├─────────────────────────────────────────────────────────────┤
│  GET /api/notes?deleted=true  │  DELETE /api/notes/[id]     │
│  POST /api/notes/[id]/restore │  POST /api/notes/restore    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  note table                                                  │
│  - id, title, content, userId                               │
│  - createdAt, updatedAt                                     │
│  - deletedAt (NEW - nullable timestamp)                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Soft Delete Flow:**
   - User clicks "Move to Trash" in Note Editor
   - Frontend sends DELETE request to `/api/notes/[id]`
   - API sets `deletedAt` to current timestamp
   - User redirected to notes list
   - Note no longer appears in active notes

2. **Restore Flow (Single):**
   - User clicks "Restore" button in Trash view
   - Frontend sends POST request to `/api/notes/[id]/restore`
   - API sets `deletedAt` to null
   - Note removed from trash view
   - Note appears in active notes list

3. **Restore Flow (Bulk):**
   - User selects multiple notes via checkboxes
   - User clicks "Restore Selected" button
   - Frontend sends POST request to `/api/notes/restore` with array of note IDs
   - API sets `deletedAt` to null for all specified notes
   - All restored notes removed from trash view
   - Success message displays count of restored notes

## Components and Interfaces

### Database Schema Extension

**File:** `lib/db/schema.ts`

```typescript
export const note = pgTable("note", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  deletedAt: timestamp("deletedAt"), // NEW: nullable timestamp for soft delete
});
```

**Migration Strategy:**
- Add `deletedAt` column as nullable timestamp
- Default value: null (for all existing notes)
- Index on `deletedAt` for efficient filtering

### API Routes

#### 1. GET /api/notes (Modified)

**Purpose:** Fetch notes with optional deleted filter

**Query Parameters:**
- `deleted`: boolean (optional) - if "true", returns deleted notes; otherwise returns active notes
- `cursor`: string (optional) - pagination cursor
- `limit`: number (optional) - max results per page

**Response:**
```typescript
{
  notes: Array<{
    id: string;
    title: string;
    content: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }>;
  nextCursor: string | null;
}
```

**Logic:**
- If `deleted=true`: filter where `deletedAt IS NOT NULL`, order by `deletedAt DESC`
- Otherwise: filter where `deletedAt IS NULL`, order by `createdAt DESC`
- Apply user ownership filter
- Apply pagination

#### 2. DELETE /api/notes/[id] (New)

**Purpose:** Soft delete a note

**Request Body:** None

**Response:**
```typescript
{
  id: string;
  deletedAt: string;
}
```

**Logic:**
- Verify user owns the note
- Set `deletedAt` to current timestamp
- Set `updatedAt` to current timestamp
- Return updated note

**Error Cases:**
- 401: Unauthorized (no session)
- 403: Forbidden (user doesn't own note)
- 404: Note not found

#### 3. POST /api/notes/[id]/restore (New)

**Purpose:** Restore a single deleted note

**Request Body:** None

**Response:**
```typescript
{
  id: string;
  deletedAt: null;
}
```

**Logic:**
- Verify user owns the note
- Verify note is deleted (`deletedAt IS NOT NULL`)
- Set `deletedAt` to null
- Set `updatedAt` to current timestamp
- Return updated note

**Error Cases:**
- 401: Unauthorized (no session)
- 403: Forbidden (user doesn't own note)
- 404: Note not found or not deleted

#### 4. POST /api/notes/restore (New)

**Purpose:** Bulk restore multiple deleted notes

**Request Body:**
```typescript
{
  noteIds: string[];
}
```

**Response:**
```typescript
{
  restored: number;
  notes: Array<{
    id: string;
    deletedAt: null;
  }>;
}
```

**Logic:**
- Verify all notes belong to the user
- Filter to only notes where `deletedAt IS NOT NULL`
- Set `deletedAt` to null for all matching notes
- Set `updatedAt` to current timestamp for all
- Return count and updated notes

**Error Cases:**
- 401: Unauthorized (no session)
- 400: Invalid request (empty array, invalid IDs)
- 403: Forbidden (user doesn't own one or more notes)

### Frontend Components

#### 1. Sidebar Component (Modified)

**File:** `app/components/sidebar.tsx`

**Changes:**
- Add Trash menu item after Archive
- Style with red color (`text-red-600`)
- Add trash bin icon
- Link to `/trash` route
- Highlight when pathname is `/trash`

**Component Structure:**
```typescript
<li>
  <Link
    href="/trash"
    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
      pathname === '/trash'
        ? 'bg-white shadow-sm text-red-600 font-medium'
        : 'text-red-600 hover:bg-white hover:shadow-sm'
    }`}
  >
    <TrashIcon />
    Trash
  </Link>
</li>
```

#### 2. Trash Page (New)

**File:** `app/(dashboard)/trash/page.tsx`

**Purpose:** Display deleted notes with restore functionality

**State Management:**
```typescript
const [notes, setNotes] = useState<Note[]>([]);
const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
const [loading, setLoading] = useState(true);
const [restoring, setRestoring] = useState(false);
```

**Features:**
- Fetch deleted notes on mount
- Display notes in list format with checkboxes
- "Select All" checkbox in header
- Individual restore buttons per note
- "Restore Selected" button (visible when selections exist)
- Empty state when no deleted notes
- Success toast on restore
- Pagination support

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Trash                                              │
│  Deleted notes can be restored                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ ☐ Select All    [Restore Selected (3)]     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ ☑ Note Title                    [Restore]   │  │
│  │   Content preview...                        │  │
│  │   Deleted 2 days ago                        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ ☑ Another Note                  [Restore]   │  │
│  │   More content...                           │  │
│  │   Deleted 5 hours ago                       │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### 3. Note Editor (Modified)

**File:** `app/(dashboard)/notes/[id]/page.tsx`

**Changes:**
- Add three-dot menu button in header
- Menu contains "Move to Trash" option
- On delete: call DELETE endpoint, redirect to `/notes`
- Show success toast on delete

**Menu Structure:**
```typescript
<DropdownMenu>
  <DropdownMenuTrigger>
    <ThreeDotsIcon />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleMoveToTrash}>
      <TrashIcon />
      Move to Trash
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 4. Notes List Pages (Modified)

**Files:** 
- `app/(dashboard)/page.tsx` (Dashboard)
- `app/(dashboard)/notes/page.tsx` (All Notes)

**Changes:**
- Ensure GET /api/notes is called without `deleted` parameter
- This automatically filters to active notes only
- No visual changes needed

## Data Models

### Note Model (Extended)

```typescript
interface Note {
  id: string;
  title: string;
  content: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // NEW
}
```

### API Request/Response Types

```typescript
// Bulk restore request
interface BulkRestoreRequest {
  noteIds: string[];
}

// Bulk restore response
interface BulkRestoreResponse {
  restored: number;
  notes: Array<{
    id: string;
    deletedAt: null;
  }>;
}

// Notes list response (existing, no changes)
interface NotesListResponse {
  notes: Note[];
  nextCursor: string | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Note creation initializes deletedAt to null
*For any* newly created note, the deletedAt field should be null, indicating the note is active.
**Validates: Requirements 1.2**

### Property 2: Soft delete sets deletedAt timestamp
*For any* active note, when soft-deleted, the deletedAt field should be set to a non-null timestamp representing the deletion time.
**Validates: Requirements 1.3, 4.2**

### Property 3: Soft delete preserves note data
*For any* note, soft-deleting should not modify the title, content, or createdAt fields - only deletedAt and updatedAt should change.
**Validates: Requirements 4.5**

### Property 4: Restore operation round trip
*For any* deleted note, restoring it should set deletedAt back to null, returning the note to active status.
**Validates: Requirements 1.4, 5.2**

### Property 5: Restore preserves note data
*For any* deleted note, restoring should not modify the title, content, or createdAt fields - only deletedAt and updatedAt should change.
**Validates: Requirements 5.5**

### Property 6: Trash view displays only deleted notes
*For any* set of notes with mixed deletedAt values, the trash view should display only those notes where deletedAt is not null.
**Validates: Requirements 3.1**

### Property 7: Trash view sorts by deletion time
*For any* set of deleted notes, they should be displayed in descending order by deletedAt timestamp (most recently deleted first).
**Validates: Requirements 3.2**

### Property 8: Deleted note rendering includes required fields
*For any* deleted note displayed in the trash view, the rendered output should contain the note title, content preview, and deletion date.
**Validates: Requirements 3.3**

### Property 9: Active notes API excludes deleted notes
*For any* set of notes, calling GET /api/notes without parameters should return only notes where deletedAt is null.
**Validates: Requirements 7.4, 9.2**

### Property 10: Deleted notes API includes only deleted notes
*For any* set of notes, calling GET /api/notes with deleted=true should return only notes where deletedAt is not null.
**Validates: Requirements 7.5**

### Property 11: Soft delete removes note from active list
*For any* active note, after soft-deleting it, the note should not appear in subsequent queries for active notes.
**Validates: Requirements 4.4**

### Property 12: Restore adds note to active list
*For any* deleted note, after restoring it, the note should appear in subsequent queries for active notes.
**Validates: Requirements 5.4**

### Property 13: Restore removes note from trash list
*For any* deleted note, after restoring it, the note should not appear in subsequent queries for deleted notes.
**Validates: Requirements 5.3**

### Property 14: Bulk restore sets deletedAt to null for all selected notes
*For any* set of selected deleted notes, bulk restoring should set deletedAt to null for all of them.
**Validates: Requirements 6.6**

### Property 15: Bulk restore preserves note data
*For any* set of deleted notes, bulk restoring should not modify the title, content, or createdAt fields for any note - only deletedAt and updatedAt should change.
**Validates: Requirements 6.9**

### Property 16: Bulk restore removes all notes from trash
*For any* set of deleted notes, after bulk restoring them, none of them should appear in subsequent queries for deleted notes.
**Validates: Requirements 6.7**

### Property 17: Bulk restore success message shows count
*For any* bulk restore operation, the success message should display the number of notes that were restored.
**Validates: Requirements 6.8**

### Property 18: Unauthorized soft delete returns 403
*For any* note not owned by the requesting user, attempting to soft-delete it should return a 403 Forbidden error.
**Validates: Requirements 7.6, 7.7**

### Property 19: Unauthorized restore returns 403
*For any* note not owned by the requesting user, attempting to restore it should return a 403 Forbidden error.
**Validates: Requirements 7.6, 7.7**

### Property 20: Dashboard displays only active notes
*For any* set of notes, the dashboard recent notes section should display only notes where deletedAt is null.
**Validates: Requirements 9.1**

### Property 21: Search excludes deleted notes
*For any* search query, the results should only include notes where deletedAt is null.
**Validates: Requirements 9.3**

### Property 22: Note count excludes deleted notes
*For any* set of notes, the displayed count should only include notes where deletedAt is null.
**Validates: Requirements 9.5**

### Property 23: Trash view checkboxes track selections
*For any* set of deleted notes, checking individual checkboxes should correctly update the set of selected note IDs.
**Validates: Requirements 6.3**

### Property 24: Restore button visibility depends on selections
*For any* trash view state, the "Restore Selected" button should be visible if and only if at least one note is selected.
**Validates: Requirements 6.5**

### Property 25: Each deleted note has restore button
*For any* deleted note displayed in the trash view, it should have an associated restore button.
**Validates: Requirements 5.1, 8.3**

### Property 26: Each deleted note has checkbox
*For any* deleted note displayed in the trash view, it should have an associated checkbox for selection.
**Validates: Requirements 6.1**

### Property 27: Pagination returns next page of deleted notes
*For any* trash view with more deleted notes than the page limit, requesting the next page with a cursor should return the subsequent set of notes ordered by deletedAt.
**Validates: Requirements 3.5**

## Error Handling

### Soft Delete Errors

1. **Note Not Found (404)**
   - Occurs when: Note ID doesn't exist or user doesn't own it
   - Response: `{ error: "Note not found" }`
   - Frontend: Display error toast, stay on current page

2. **Unauthorized (401)**
   - Occurs when: No valid session
   - Response: `{ error: "Unauthorized" }`
   - Frontend: Redirect to login page

3. **Forbidden (403)**
   - Occurs when: User doesn't own the note
   - Response: `{ error: "Forbidden" }`
   - Frontend: Display error toast, redirect to notes list

4. **Already Deleted**
   - Occurs when: Note is already soft-deleted
   - Response: `{ error: "Note already deleted" }`
   - Frontend: Display info toast, redirect to notes list

### Restore Errors

1. **Note Not Found (404)**
   - Occurs when: Note ID doesn't exist, user doesn't own it, or note is not deleted
   - Response: `{ error: "Note not found or not deleted" }`
   - Frontend: Display error toast, refresh trash list

2. **Unauthorized (401)**
   - Occurs when: No valid session
   - Response: `{ error: "Unauthorized" }`
   - Frontend: Redirect to login page

3. **Forbidden (403)**
   - Occurs when: User doesn't own the note
   - Response: `{ error: "Forbidden" }`
   - Frontend: Display error toast, refresh trash list

### Bulk Restore Errors

1. **Invalid Request (400)**
   - Occurs when: Empty noteIds array or invalid format
   - Response: `{ error: "Invalid request: noteIds required" }`
   - Frontend: Display error toast

2. **Partial Success**
   - Occurs when: Some notes can't be restored (not found, not owned, not deleted)
   - Response: `{ restored: number, failed: number, errors: string[] }`
   - Frontend: Display partial success message with details

3. **Unauthorized (401)**
   - Occurs when: No valid session
   - Response: `{ error: "Unauthorized" }`
   - Frontend: Redirect to login page

### Network Errors

All API calls should handle network errors gracefully:
- Display user-friendly error message
- Provide retry option where appropriate
- Log errors for debugging
- Don't leave UI in inconsistent state

## Testing Strategy

### Dual Testing Approach

This feature will be tested using both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** will focus on:
- Specific examples of soft delete and restore operations
- Edge cases (empty trash, viewing deleted note directly, etc.)
- Error conditions (unauthorized access, invalid requests)
- UI component rendering (sidebar, trash page, delete menu)
- Integration between components

**Property-Based Tests** will focus on:
- Universal properties that hold for all inputs (see Correctness Properties section)
- Data integrity across operations
- Filtering and querying behavior
- Authorization rules
- Bulk operations

### Property-Based Testing Configuration

- **Library:** fast-check (TypeScript/JavaScript property-based testing library)
- **Iterations:** Minimum 100 runs per property test
- **Test Tagging:** Each property test must include a comment referencing the design property
- **Tag Format:** `// Feature: trash-soft-delete, Property N: [property description]`

### Test Organization

```
tests/
├── unit/
│   ├── api/
│   │   ├── soft-delete.test.ts
│   │   ├── restore.test.ts
│   │   └── bulk-restore.test.ts
│   ├── components/
│   │   ├── sidebar.test.tsx
│   │   ├── trash-page.test.tsx
│   │   └── note-editor-menu.test.tsx
│   └── integration/
│       └── trash-workflow.test.ts
└── property/
    ├── soft-delete-properties.test.ts
    ├── restore-properties.test.ts
    ├── filtering-properties.test.ts
    └── authorization-properties.test.ts
```

### Key Test Scenarios

**Unit Test Examples:**
1. Soft-deleting a note sets deletedAt to current timestamp
2. Restoring a note sets deletedAt to null
3. Trash page displays empty state when no deleted notes
4. Clicking "Move to Trash" redirects to notes list
5. Bulk restore with empty selection shows no button
6. Unauthorized user gets 403 when trying to delete others' notes

**Property Test Examples:**
1. For all notes, soft-delete then restore returns to original state (round trip)
2. For all sets of notes, active notes query never returns deleted notes
3. For all deleted notes, trash query returns them in deletedAt descending order
4. For all bulk restore operations, all selected notes become active
5. For all unauthorized operations, response is 403

### Testing Database Migrations

The `deletedAt` column addition should be tested:
1. Migration runs successfully on empty database
2. Migration runs successfully on database with existing notes
3. All existing notes have deletedAt = null after migration
4. Rollback migration removes deletedAt column cleanly

### End-to-End Testing Considerations

While this spec focuses on unit and property tests, E2E tests should cover:
1. Complete soft-delete workflow (create → delete → verify in trash)
2. Complete restore workflow (delete → restore → verify in active notes)
3. Bulk restore workflow (delete multiple → select → restore → verify)
4. Navigation between trash and notes pages
5. Persistence across page refreshes

## Implementation Notes

### Database Migration

Create a new migration file to add the `deletedAt` column:

```typescript
// migrations/XXXX_add_deleted_at_to_notes.ts
import { sql } from 'drizzle-orm';

export async function up(db) {
  await db.execute(sql`
    ALTER TABLE note 
    ADD COLUMN deleted_at TIMESTAMP;
  `);
  
  // Create index for efficient filtering
  await db.execute(sql`
    CREATE INDEX idx_note_deleted_at 
    ON note(deleted_at);
  `);
}

export async function down(db) {
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_note_deleted_at;
  `);
  
  await db.execute(sql`
    ALTER TABLE note 
    DROP COLUMN deleted_at;
  `);
}
```

### Performance Considerations

1. **Index on deletedAt:** Essential for efficient filtering between active and deleted notes
2. **Pagination:** Use cursor-based pagination for trash view to handle large numbers of deleted notes
3. **Bulk Operations:** Limit bulk restore to reasonable batch size (e.g., 100 notes at a time)
4. **Query Optimization:** Ensure WHERE clauses on deletedAt use the index

### Future Enhancements

Potential future improvements not included in this spec:
1. **Permanent Delete:** Add ability to permanently delete notes from trash
2. **Auto-Purge:** Automatically delete notes from trash after X days
3. **Trash Statistics:** Show count of deleted notes in sidebar
4. **Undo Delete:** Immediate undo option after soft-delete
5. **Bulk Delete:** Select and delete multiple active notes at once
6. **Restore with Notification:** Notify user when note is restored
7. **Trash Search:** Search within deleted notes

### Security Considerations

1. **Authorization:** All API endpoints must verify user ownership
2. **Input Validation:** Validate note IDs in bulk operations
3. **Rate Limiting:** Consider rate limiting for bulk operations
4. **Audit Logging:** Consider logging delete/restore operations for audit trail

### Accessibility

1. **Keyboard Navigation:** Ensure trash page and delete menu are keyboard accessible
2. **Screen Readers:** Add appropriate ARIA labels for checkboxes and buttons
3. **Focus Management:** Manage focus after delete/restore operations
4. **Color Contrast:** Ensure red trash menu item meets WCAG contrast requirements
