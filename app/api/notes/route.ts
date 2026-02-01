import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { headers } from "next/headers";
import { desc, eq, lt, and } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const conditions = [eq(note.userId, session.user.id)];

  if (cursor) {
    // Fetch the cursor note's createdAt to paginate from
    const [cursorNote] = await db
      .select({ createdAt: note.createdAt })
      .from(note)
      .where(eq(note.id, cursor))
      .limit(1);

    if (cursorNote) {
      conditions.push(lt(note.createdAt, cursorNote.createdAt));
    }
  }

  const notes = await db
    .select()
    .from(note)
    .where(and(...conditions))
    .orderBy(desc(note.createdAt))
    .limit(limit + 1);

  const hasMore = notes.length > limit;
  const results = hasMore ? notes.slice(0, limit) : notes;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return Response.json({ notes: results, nextCursor });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content } = body;

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date();

  const [created] = await db
    .insert(note)
    .values({
      id,
      title,
      content: content ?? null,
      userId: session.user.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
