import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { headers } from "next/headers";
import { eq, and, isNotNull } from "drizzle-orm";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // First, verify the note exists, belongs to the user, and is deleted
    const [found] = await db
        .select()
        .from(note)
        .where(
            and(
                eq(note.id, id),
                eq(note.userId, session.user.id),
                isNotNull(note.deletedAt)
            )
        )
        .limit(1);

    if (!found) {
        return Response.json(
            { error: "Note not found or not deleted" },
            { status: 404 }
        );
    }

    // Restore the note by setting deletedAt to null
    const [updated] = await db
        .update(note)
        .set({
            deletedAt: null,
            updatedAt: new Date(),
        })
        .where(and(eq(note.id, id), eq(note.userId, session.user.id)))
        .returning();

    return Response.json(updated, { status: 200 });
}
