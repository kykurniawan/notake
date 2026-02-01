import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { headers } from "next/headers";
import { eq, and, isNotNull, inArray } from "drizzle-orm";

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { noteIds } = body;

    // Validate request body
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
        return Response.json(
            { error: "Invalid request: noteIds required" },
            { status: 400 }
        );
    }

    // Validate that all noteIds are strings
    if (!noteIds.every((id) => typeof id === "string")) {
        return Response.json(
            { error: "Invalid request: all noteIds must be strings" },
            { status: 400 }
        );
    }

    const now = new Date();

    // Restore notes that:
    // 1. Are in the provided noteIds array
    // 2. Belong to the current user
    // 3. Are currently deleted (deletedAt IS NOT NULL)
    // This handles partial success gracefully - only matching notes are restored
    const updated = await db
        .update(note)
        .set({
            deletedAt: null,
            updatedAt: now,
        })
        .where(
            and(
                inArray(note.id, noteIds),
                eq(note.userId, session.user.id),
                isNotNull(note.deletedAt)
            )
        )
        .returning();

    return Response.json(
        {
            restored: updated.length,
            notes: updated.map((n) => ({
                id: n.id,
                deletedAt: n.deletedAt,
            })),
        },
        { status: 200 }
    );
}
