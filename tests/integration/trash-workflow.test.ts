/**
 * Integration Test: Complete Soft-Delete Workflow
 * 
 * This test validates the complete soft-delete workflow:
 * 1. Create note → soft delete → verify in trash → verify not in active notes
 * 
 * Requirements tested: 1.3, 3.1, 4.4
 * 
 * Task: 16.1 Test complete soft-delete workflow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { note, user, session } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

describe('Complete Soft-Delete Workflow Integration Test', () => {
    let testUserId: string;
    let testSessionToken: string;
    let testNoteId: string;

    beforeAll(async () => {
        // Create a test user
        testUserId = crypto.randomUUID();
        const now = new Date();

        await db.insert(user).values({
            id: testUserId,
            name: 'Test User',
            email: `test-${testUserId}@example.com`,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
        });

        // Create a test session
        testSessionToken = crypto.randomUUID();
        await db.insert(session).values({
            id: crypto.randomUUID(),
            token: testSessionToken,
            userId: testUserId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            createdAt: now,
            updatedAt: now,
        });
    });

    afterAll(async () => {
        // Clean up test data
        if (testNoteId) {
            await db.delete(note).where(eq(note.id, testNoteId));
        }
        await db.delete(session).where(eq(session.userId, testUserId));
        await db.delete(user).where(eq(user.id, testUserId));
    });

    it('should complete the full soft-delete workflow: create → delete → verify in trash → verify not in active notes', async () => {
        // Step 1: Create a note
        testNoteId = crypto.randomUUID();
        const now = new Date();
        const testTitle = 'Test Note for Soft Delete';
        const testContent = JSON.stringify({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'This is a test note for soft delete workflow.' }],
                },
            ],
        });

        const [createdNote] = await db
            .insert(note)
            .values({
                id: testNoteId,
                title: testTitle,
                content: testContent,
                userId: testUserId,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
            })
            .returning();

        expect(createdNote).toBeDefined();
        expect(createdNote.id).toBe(testNoteId);
        expect(createdNote.title).toBe(testTitle);
        expect(createdNote.deletedAt).toBeNull();
        console.log('✓ Step 1: Note created successfully');

        // Step 2: Verify note appears in active notes list
        const activeNotesBeforeDelete = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNull(note.deletedAt)));

        const noteInActiveList = activeNotesBeforeDelete.find((n) => n.id === testNoteId);
        expect(noteInActiveList).toBeDefined();
        expect(noteInActiveList?.deletedAt).toBeNull();
        console.log('✓ Step 2: Note appears in active notes list');

        // Step 3: Soft delete the note (simulating DELETE /api/notes/[id])
        const deleteTime = new Date();
        const [deletedNote] = await db
            .update(note)
            .set({
                deletedAt: deleteTime,
                updatedAt: deleteTime,
            })
            .where(and(eq(note.id, testNoteId), eq(note.userId, testUserId)))
            .returning();

        expect(deletedNote).toBeDefined();
        expect(deletedNote.deletedAt).not.toBeNull();
        expect(deletedNote.deletedAt).toBeInstanceOf(Date);
        expect(deletedNote.title).toBe(testTitle); // Title should be preserved
        expect(deletedNote.content).toBe(testContent); // Content should be preserved
        console.log('✓ Step 3: Note soft-deleted successfully (Requirement 1.3, 4.4)');

        // Step 4: Verify note appears in trash (deleted notes list)
        const deletedNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNotNull(note.deletedAt)))
            .orderBy(note.deletedAt);

        const noteInTrash = deletedNotes.find((n) => n.id === testNoteId);
        expect(noteInTrash).toBeDefined();
        expect(noteInTrash?.deletedAt).not.toBeNull();
        expect(noteInTrash?.title).toBe(testTitle);
        expect(noteInTrash?.content).toBe(testContent);
        console.log('✓ Step 4: Note appears in trash view (Requirement 3.1)');

        // Step 5: Verify note does NOT appear in active notes list
        const activeNotesAfterDelete = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNull(note.deletedAt)));

        const noteStillInActiveList = activeNotesAfterDelete.find((n) => n.id === testNoteId);
        expect(noteStillInActiveList).toBeUndefined();
        console.log('✓ Step 5: Note removed from active notes list (Requirement 4.4)');

        // Step 6: Verify data integrity - all original data preserved
        const [noteFromDb] = await db
            .select()
            .from(note)
            .where(eq(note.id, testNoteId))
            .limit(1);

        expect(noteFromDb).toBeDefined();
        expect(noteFromDb.id).toBe(testNoteId);
        expect(noteFromDb.title).toBe(testTitle);
        expect(noteFromDb.content).toBe(testContent);
        expect(noteFromDb.userId).toBe(testUserId);
        expect(noteFromDb.createdAt).toEqual(now);
        expect(noteFromDb.deletedAt).not.toBeNull();
        console.log('✓ Step 6: All note data preserved after soft delete');

        console.log('\n✅ Complete soft-delete workflow test passed!');
        console.log('   - Note created with deletedAt = null');
        console.log('   - Note soft-deleted (deletedAt set to timestamp)');
        console.log('   - Note appears in trash view (deleted notes query)');
        console.log('   - Note removed from active notes view');
        console.log('   - All original data preserved (title, content, createdAt)');
    });

    it('should verify soft-delete preserves all note data fields', async () => {
        // Create another test note with specific data
        const noteId = crypto.randomUUID();
        const now = new Date();
        const title = 'Data Preservation Test';
        const content = JSON.stringify({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Testing data preservation during soft delete.' }],
                },
            ],
        });

        // Create note
        const [created] = await db
            .insert(note)
            .values({
                id: noteId,
                title,
                content,
                userId: testUserId,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
            })
            .returning();

        // Soft delete
        const deleteTime = new Date();
        await db
            .update(note)
            .set({
                deletedAt: deleteTime,
                updatedAt: deleteTime,
            })
            .where(eq(note.id, noteId));

        // Verify all fields preserved
        const [deleted] = await db.select().from(note).where(eq(note.id, noteId));

        expect(deleted.id).toBe(noteId);
        expect(deleted.title).toBe(title);
        expect(deleted.content).toBe(content);
        expect(deleted.userId).toBe(testUserId);
        expect(deleted.createdAt).toEqual(now);
        expect(deleted.deletedAt).not.toBeNull();
        expect(deleted.updatedAt).not.toEqual(now); // updatedAt should change

        // Clean up
        await db.delete(note).where(eq(note.id, noteId));

        console.log('✓ Soft delete preserves all note data fields');
    });

    it('should verify multiple notes can be soft-deleted independently', async () => {
        // Create multiple notes
        const noteIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
        const now = new Date();

        for (const id of noteIds) {
            await db.insert(note).values({
                id,
                title: `Test Note ${id}`,
                content: 'Test content',
                userId: testUserId,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
            });
        }

        // Soft delete only the first two notes
        const deleteTime = new Date();
        await db
            .update(note)
            .set({ deletedAt: deleteTime, updatedAt: deleteTime })
            .where(and(eq(note.userId, testUserId), eq(note.id, noteIds[0])));

        await db
            .update(note)
            .set({ deletedAt: deleteTime, updatedAt: deleteTime })
            .where(and(eq(note.userId, testUserId), eq(note.id, noteIds[1])));

        // Verify trash contains exactly 2 of our test notes
        const deletedNotes = await db
            .select()
            .from(note)
            .where(
                and(
                    eq(note.userId, testUserId),
                    isNotNull(note.deletedAt)
                )
            );

        const ourDeletedNotes = deletedNotes.filter((n) => noteIds.includes(n.id));
        expect(ourDeletedNotes).toHaveLength(2);

        // Verify active notes contains exactly 1 of our test notes
        const activeNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNull(note.deletedAt)));

        const ourActiveNotes = activeNotes.filter((n) => noteIds.includes(n.id));
        expect(ourActiveNotes).toHaveLength(1);
        expect(ourActiveNotes[0].id).toBe(noteIds[2]);

        // Clean up
        for (const id of noteIds) {
            await db.delete(note).where(eq(note.id, id));
        }

        console.log('✓ Multiple notes can be soft-deleted independently');
    });

    it('should verify soft-deleted notes are ordered by deletedAt timestamp', async () => {
        // Create and soft-delete multiple notes with different timestamps
        const noteIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
        const now = new Date();

        // Create all notes
        for (const id of noteIds) {
            await db.insert(note).values({
                id,
                title: `Test Note ${id}`,
                content: 'Test content',
                userId: testUserId,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
            });
        }

        // Soft delete with different timestamps (with delays)
        const deleteTime1 = new Date(Date.now() - 3000); // 3 seconds ago
        await db
            .update(note)
            .set({ deletedAt: deleteTime1, updatedAt: deleteTime1 })
            .where(eq(note.id, noteIds[0]));

        const deleteTime2 = new Date(Date.now() - 2000); // 2 seconds ago
        await db
            .update(note)
            .set({ deletedAt: deleteTime2, updatedAt: deleteTime2 })
            .where(eq(note.id, noteIds[1]));

        const deleteTime3 = new Date(Date.now() - 1000); // 1 second ago
        await db
            .update(note)
            .set({ deletedAt: deleteTime3, updatedAt: deleteTime3 })
            .where(eq(note.id, noteIds[2]));

        // Query deleted notes ordered by deletedAt DESC (most recent first)
        const deletedNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNotNull(note.deletedAt)))
            .orderBy(note.deletedAt);

        const ourDeletedNotes = deletedNotes.filter((n) => noteIds.includes(n.id));

        // Verify ordering (most recently deleted first when using DESC)
        expect(ourDeletedNotes).toHaveLength(3);

        // Since we're ordering by deletedAt ascending in the query, 
        // the oldest deleted note should be first
        expect(ourDeletedNotes[0].id).toBe(noteIds[0]); // Oldest
        expect(ourDeletedNotes[1].id).toBe(noteIds[1]); // Middle
        expect(ourDeletedNotes[2].id).toBe(noteIds[2]); // Newest

        // Clean up
        for (const id of noteIds) {
            await db.delete(note).where(eq(note.id, id));
        }

        console.log('✓ Soft-deleted notes are properly ordered by deletedAt timestamp');
    });
});
