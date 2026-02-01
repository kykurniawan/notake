# Search Functionality Requirement for Soft Delete Feature

## Status
**NOT YET IMPLEMENTED** - This document serves as a requirement specification for future implementation.

## Overview
As of the current implementation, the Notake application does not have search functionality. The "Search Notes" feature visible on the dashboard (app/(dashboard)/page.tsx) is a placeholder quick action card with no actual search implementation.

## Requirement Reference
**Requirement 9.3** from the trash-soft-delete specification states:
> THE Search_Functionality SHALL exclude deleted notes from search results

## Implementation Requirements

When search functionality is implemented in the future, it MUST adhere to the following requirements:

### 1. Database Query Filtering
Any search query that retrieves notes MUST include a filter condition:
```sql
WHERE deletedAt IS NULL
```

This ensures that soft-deleted notes are excluded from all search results.

### 2. API Endpoint Considerations

If a search API endpoint is created (e.g., `GET /api/notes/search`), it should:

- Accept a `query` or `q` parameter for the search term
- Accept optional `limit` and `cursor` parameters for pagination
- **ALWAYS** filter results to exclude deleted notes by default
- Return only notes where `deletedAt IS NULL`
- Verify user ownership (only return notes belonging to the authenticated user)

Example endpoint structure:
```typescript
// GET /api/notes/search?q=keyword&limit=20&cursor=abc123

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || searchParams.get("query");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!query) {
    return Response.json({ error: "Search query required" }, { status: 400 });
  }

  const conditions = [
    eq(note.userId, session.user.id),
    isNull(note.deletedAt), // CRITICAL: Exclude deleted notes
    // Add search conditions here (e.g., title LIKE, content LIKE)
  ];

  // ... rest of implementation
}
```

### 3. Frontend Search Component

When implementing a search UI component, ensure:

- Search input field is accessible and user-friendly
- Search results display only active (non-deleted) notes
- Search results clearly indicate when no matches are found
- Loading states are shown during search operations
- Error states are handled gracefully

### 4. Search Implementation Options

Future implementers may choose from several search approaches:

#### Option A: Simple SQL LIKE Query
- Use PostgreSQL `LIKE` or `ILIKE` operators
- Search in `title` and `content` fields
- Pros: Simple, no additional dependencies
- Cons: Limited performance on large datasets, no ranking

```typescript
import { or, like, ilike } from "drizzle-orm";

const searchConditions = or(
  ilike(note.title, `%${query}%`),
  ilike(note.content, `%${query}%`)
);
```

#### Option B: PostgreSQL Full-Text Search
- Use PostgreSQL's built-in full-text search capabilities
- Create tsvector columns for better performance
- Pros: Better performance, ranking support, built-in
- Cons: Requires schema changes and indexes

#### Option C: External Search Service
- Integrate with services like Algolia, Elasticsearch, or Meilisearch
- Pros: Advanced features, excellent performance, typo tolerance
- Cons: Additional infrastructure, cost, complexity

### 5. Testing Requirements

When search is implemented, the following tests MUST be created:

#### Unit Tests
- Test search returns only active notes
- Test search excludes deleted notes
- Test search with empty query
- Test search with no results
- Test search pagination
- Test unauthorized search attempts

#### Property-Based Tests
- **Property 21: Search excludes deleted notes**
  - For any search query and any set of notes (mix of active and deleted), search results should only include notes where deletedAt is null
  - Validates: Requirements 9.3

Example property test structure:
```typescript
import fc from 'fast-check';

describe('Property 21: Search excludes deleted notes', () => {
  it('should never return deleted notes in search results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(noteArbitrary()), // Generate array of notes
        fc.string({ minLength: 1 }), // Generate search query
        async (notes, searchQuery) => {
          // Setup: Insert notes into test database
          // Some notes have deletedAt set, some don't
          
          // Execute: Perform search
          const results = await searchNotes(searchQuery);
          
          // Assert: All results must have deletedAt === null
          expect(results.every(note => note.deletedAt === null)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 6. Migration Path

When implementing search:

1. **Phase 1: Basic Search**
   - Implement simple LIKE-based search
   - Ensure deletedAt filtering is in place
   - Add basic UI component

2. **Phase 2: Enhanced Search**
   - Add full-text search capabilities
   - Implement search result ranking
   - Add search filters (date range, etc.)

3. **Phase 3: Advanced Features**
   - Add search suggestions/autocomplete
   - Implement search history
   - Add advanced query syntax

## Current Codebase State

### Files That Reference Search (Placeholders Only)

1. **app/(dashboard)/page.tsx** (Line 118-129)
   - Contains a "Search Notes" quick action card
   - Currently non-functional - just a UI placeholder
   - No click handler or navigation implemented

### Files That Will Need Updates

When search is implemented, these files will need modifications:

1. **app/api/notes/route.ts** or **app/api/notes/search/route.ts** (new)
   - Add search endpoint with proper filtering

2. **app/(dashboard)/page.tsx**
   - Make "Search Notes" quick action functional
   - Add navigation to search page or open search modal

3. **app/(dashboard)/search/page.tsx** (new)
   - Create search results page
   - Display search results with proper filtering

4. **app/components/** (new search components)
   - SearchBar component
   - SearchResults component
   - SearchFilters component (optional)

## Validation Checklist

When implementing search, verify:

- [ ] Search API endpoint filters WHERE deletedAt IS NULL
- [ ] Search results never include deleted notes
- [ ] Search respects user ownership (only searches user's notes)
- [ ] Search handles empty queries gracefully
- [ ] Search handles no results gracefully
- [ ] Search supports pagination
- [ ] Property test 21 is implemented and passing
- [ ] Unit tests cover edge cases
- [ ] UI is accessible and user-friendly
- [ ] Performance is acceptable for expected data volumes

## Related Requirements

- **Requirement 9.1**: Dashboard recent notes filter (✅ Implemented)
- **Requirement 9.2**: All notes page filter (✅ Implemented)
- **Requirement 9.3**: Search functionality filter (❌ Not yet implemented - this document)
- **Requirement 9.4**: Viewing deleted note by ID (✅ Implemented)
- **Requirement 9.5**: Note count filtering (✅ Implemented)

## Conclusion

This document serves as a comprehensive guide for future implementation of search functionality. The key requirement is simple but critical: **all search queries MUST exclude soft-deleted notes by filtering WHERE deletedAt IS NULL**.

When search is implemented, this requirement must be validated through both unit tests and property-based tests to ensure correctness across all scenarios.

---

**Document Created**: As part of task 13.1 of the trash-soft-delete implementation plan
**Last Updated**: Current date
**Status**: Awaiting search feature implementation
