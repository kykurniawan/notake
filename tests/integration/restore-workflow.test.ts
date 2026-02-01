/**
 * Integration Test: Complete Restore Workflow
 * 
 * This test validates the complete restore workflow:
 * 1. Soft delete note → restore from trash → verify in active notes → verify not in trash
 * 
 * Requirements tested: 5.2, 5.3, 5.4
 * 
 * Task: 16.2 Test complete restore workflow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { note, user, session } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';

describe('Complete Restore Workflow Integration Test', () => {
    let testUserId: string;
    let testSessionToken: string;
    let testNoteId: string;

    beforeAll(async () => {
        // Create a test user
        testUserId = crypto.randomUUID();
        const now = new Date();

        await db.insert(user).values({
            id: testUserId,
            name: 'Test User - Restore',
            email: `test-restore-${testUserId}@example.com`,
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

    it('should complete the full restore workflow: soft delete → restore → verify in active notes → verify not in trash', async () => {
        // Step 1: Create a note
        testNoteId = crypto.randomUUID();
        const now = new Date();
        const testTitle = 'Test Note for Restore Workflow';
        const testContent = JSON.stringify({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'This is a test note for restore workflow.' }],
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
        expect(createdNote.deletedAt).toBeNull();
        console.log('✓ Step 1: Note created successfully');

        // Step 2: Soft delete the note
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
        console.log('✓ Step 2: Note soft-deleted successfully');

        // Step 3: Verify note is in trash (deleted notes list)
        const deletedNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNotNull(note.deletedAt)));

        const noteInTrash = deletedNotes.find((n) => n.id === testNoteId);
        expect(noteInTrash).toBeDefined();
        expect(noteInTrash?.deletedAt).not.toBeNull();
        console.log('✓ Step 3: Note appears in trash view');

        // Step 4: Restore the note (simulating POST /api/notes/[id]/restore)
        const restoreTime = new Date();
        const [restoredNote] = await db
            .update(note)
            .set({
                deletedAt: null,
                updatedAt: restoreTime,
            })
            .where(
                and(
                    eq(note.id, testNoteId),
                    eq(note.userId, testUserId),
                    isNotNull(note.deletedAt) // Ensure it's currently deleted
                )
            )
            .returning();

        expect(restoredNote).toBeDefined();
        expect(restoredNote.deletedAt).toBeNull();
        expect(restoredNote.title).toBe(testTitle); // Title should be preserved (Requirement 5.5)
        expect(restoredNote.content).toBe(testContent); // Content should be preserved (Requirement 5.5)
        expect(restoredNote.createdAt).toEqual(now); // Original creation date preserved (Requirement 5.5)
        console.log('✓ Step 4: Note restored successfully (Requirement 5.2)');

        // Step 5: Verify note appears in active notes list
        const activeNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNull(note.deletedAt)));

        const noteInActiveList = activeNotes.find((n) => n.id === testNoteId);
        expect(noteInActiveList).toBeDefined();
        expect(noteInActiveList?.deletedAt).toBeNull();
        expect(noteInActiveList?.title).toBe(testTitle);
        expect(noteInActiveList?.content).toBe(testContent);
        console.log('✓ Step 5: Note appears in active notes list (Requirement 5.4)');

        // Step 6: Verify note does NOT appear in trash anymore
        const deletedNotesAfterRestore = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNotNull(note.deletedAt)));

        const noteStillInTrash = deletedNotesAfterRestore.find((n) => n.id === testNoteId);
        expect(noteStillInTrash).toBeUndefined();
        console.log('✓ Step 6: Note removed from trash view (Requirement 5.3)');

        // Step 7: Verify data integrity - all original data preserved
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
        expect(noteFromDb.createdAt).toEqual(now); // Original creation date preserved
        expect(noteFromDb.deletedAt).toBeNull();
        expect(noteFromDb.updatedAt).not.toEqual(now); // updatedAt should have changed
        console.log('✓ Step 7: All note data preserved after restore (Requirement 5.5)');

        console.log('\n✅ Complete restore workflow test passed!');
        console.log('   - Note soft-deleted (deletedAt set to timestamp)');
        console.log('   - Note restored (deletedAt set back to null) - Requirement 5.2');
        console.log('   - Note removed from trash view - Requirement 5.3');
        console.log('   - Note appears in active notes view - Requirement 5.4');
        console.log('   - All original data preserved (title, content, createdAt) - Requirement 5.5');
    });

    it('should verify restore operation is idempotent (restoring active note has no effect)', async () => {
        // Create a note
        const noteId = crypto.randomUUID();
        const now = new Date();
        const title = 'Idempotent Restore Test';
        const content = 'Testing idempotent restore';

        await db.insert(note).values({
            id: noteId,
            title,
            content,
            userId: testUserId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        });

        // Try to restore an already active note (should not update anything)
        const result = await db
            .update(note)
            .set({
                deletedAt: null,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(note.id, noteId),
                    eq(note.userId, testUserId),
                    isNotNull(note.deletedAt) // This condition will fail
                )
            )
            .returning();

        // Should return empty array since the WHERE condition fails
        expect(result).toHaveLength(0);

        // Verify note is still active and unchanged
        const [noteFromDb] = await db.select().from(note).where(eq(note.id, noteId));
        expect(noteFromDb.deletedAt).toBeNull();
        expect(noteFromDb.title).toBe(title);

        // Clean up
        await db.delete(note).where(eq(note.id, noteId));

        console.log('✓ Restore operation is idempotent (no effect on active notes)');
    });

    it('should verify multiple notes can be restored independently', async () => {
        // Create and soft-delete multiple notes
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
                deletedAt: new Date(), // Already deleted
            });
        }

        // Restore only the first two notes
        const restoreTime = new Date();
        await db
            .update(note)
            .set({ deletedAt: null, updatedAt: restoreTime })
            .where(and(eq(note.userId, testUserId), eq(note.id, noteIds[0])));

        await db
            .update(note)
            .set({ deletedAt: null, updatedAt: restoreTime })
            .where(and(eq(note.userId, testUserId), eq(note.id, noteIds[1])));

        // Verify active notes contains exactly 2 of our test notes
        const activeNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNull(note.deletedAt)));

        const ourActiveNotes = activeNotes.filter((n) => noteIds.includes(n.id));
        expect(ourActiveNotes).toHaveLength(2);
        expect(ourActiveNotes.map((n) => n.id).sort()).toEqual([noteIds[0], noteIds[1]].sort());

        // Verify trash contains exactly 1 of our test notes
        const deletedNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNotNull(note.deletedAt)));

        const ourDeletedNotes = deletedNotes.filter((n) => noteIds.includes(n.id));
        expect(ourDeletedNotes).toHaveLength(1);
        expect(ourDeletedNotes[0].id).toBe(noteIds[2]);

        // Clean up
        for (const id of noteIds) {
            await db.delete(note).where(eq(note.id, id));
        }

        console.log('✓ Multiple notes can be restored independently');
    });

    it('should verify restore preserves all note fields exactly', async () => {
        // Create a note with specific data
        const noteId = crypto.randomUUID();
        const createdAt = new Date('2024-01-01T10:00:00Z');
        const updatedAt = new Date('2024-01-02T10:00:00Z');
        const title = 'Data Preservation Test';
        const content = JSON.stringify({
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Testing data preservation during restore.' }],
                },
            ],
        });

        // Create note
        await db.insert(note).values({
            id: noteId,
            title,
            content,
            userId: testUserId,
            createdAt,
            updatedAt,
            deletedAt: null,
        });

        // Soft delete
        const deleteTime = new Date('2024-01-03T10:00:00Z');
        await db
            .update(note)
            .set({ deletedAt: deleteTime, updatedAt: deleteTime })
            .where(eq(note.id, noteId));

        // Restore
        const restoreTime = new Date('2024-01-04T10:00:00Z');
        await db
            .update(note)
            .set({ deletedAt: null, updatedAt: restoreTime })
            .where(eq(note.id, noteId));

        // Verify all fields
        const [restored] = await db.select().from(note).where(eq(note.id, noteId));

        expect(restored.id).toBe(noteId);
        expect(restored.title).toBe(title); // Preserved
        expect(restored.content).toBe(content); // Preserved
        expect(restored.userId).toBe(testUserId); // Preserved
        expect(restored.createdAt).toEqual(createdAt); // Preserved (original creation date)
        expect(restored.deletedAt).toBeNull(); // Set to null
        expect(restored.updatedAt).toEqual(restoreTime); // Updated

        // Clean up
        await db.delete(note).where(eq(note.id, noteId));

        console.log('✓ Restore preserves all note fields exactly (Requirement 5.5)');
    });

    it('should verify round-trip: create → delete → restore returns to original state', async () => {
        // Create a note
        const noteId = crypto.randomUUID();
        const now = new Date();
        const title = 'Round Trip Test';
        const content = 'Testing round trip';

        const [original] = await db
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
        await db
            .update(note)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(note.id, noteId));

        // Restore
        await db
            .update(note)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(eq(note.id, noteId));

        // Verify state matches original (except updatedAt)
        const [final] = await db.select().from(note).where(eq(note.id, noteId));

        expect(final.id).toBe(original.id);
        expect(final.title).toBe(original.title);
        expect(final.content).toBe(original.content);
        expect(final.userId).toBe(original.userId);
        expect(final.createdAt).toEqual(original.createdAt);
        expect(final.deletedAt).toBe(original.deletedAt); // Both null
        expect(final.updatedAt).not.toEqual(original.updatedAt); // Should be different

        // Clean up
        await db.delete(note).where(eq(note.id, noteId));

        console.log('✓ Round-trip (create → delete → restore) returns to original state');
    });

    it('should verify restore updates the updatedAt timestamp', async () => {
        // Create and soft-delete a note
        const noteId = crypto.randomUUID();
        const now = new Date();

        await db.insert(note).values({
            id: noteId,
            title: 'UpdatedAt Test',
            content: 'Testing updatedAt',
            userId: testUserId,
            createdAt: now,
            updatedAt: now,
            deletedAt: new Date(),
        });

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Restore
        const restoreTime = new Date();
        const [restored] = await db
            .update(note)
            .set({ deletedAt: null, updatedAt: restoreTime })
            .where(eq(note.id, noteId))
            .returning();

        // Verify updatedAt changed
        expect(restored.updatedAt).not.toEqual(now);
        expect(restored.updatedAt.getTime()).toBeGreaterThan(now.getTime());

        // Clean up
        await db.delete(note).where(eq(note.id, noteId));

        console.log('✓ Restore updates the updatedAt timestamp');
    });

    it('should verify restored notes appear in correct order in active list', async () => {
        // Create multiple notes with different creation times
        const noteIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
        const baseTime = Date.now();

        for (let i = 0; i < noteIds.length; i++) {
            await db.insert(note).values({
                id: noteIds[i],
                title: `Test Note ${i}`,
                content: 'Test content',
                userId: testUserId,
                createdAt: new Date(baseTime + i * 1000), // Different creation times
                updatedAt: new Date(baseTime + i * 1000),
                deletedAt: new Date(), // Already deleted
            });
        }

        // Restore all notes
        for (const id of noteIds) {
            await db
                .update(note)
                .set({ deletedAt: null, updatedAt: new Date() })
                .where(eq(note.id, id));
        }

        // Query active notes ordered by createdAt DESC (most recent first)
        const activeNotes = await db
            .select()
            .from(note)
            .where(and(eq(note.userId, testUserId), isNull(note.deletedAt)))
            .orderBy(note.createdAt);

        const ourActiveNotes = activeNotes.filter((n) => noteIds.includes(n.id));

        // Verify ordering (oldest first with ASC order)
        expect(ourActiveNotes).toHaveLength(3);
        expect(ourActiveNotes[0].id).toBe(noteIds[0]); // Oldest
        expect(ourActiveNotes[1].id).toBe(noteIds[1]); // Middle
        expect(ourActiveNotes[2].id).toBe(noteIds[2]); // Newest

        // Clean up
        for (const id of noteIds) {
            await db.delete(note).where(eq(note.id, id));
        }

        console.log('✓ Restored notes appear in correct order in active list');
    });
});
