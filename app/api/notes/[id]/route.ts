import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { note } from "@/lib/db/schema";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export async function GET(
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

  const [found] = await db
    .select()
    .from(note)
    .where(and(eq(note.id, id), eq(note.userId, session.user.id)))
    .limit(1);

  if (!found) {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }

  return Response.json(found);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, content } = body;

  const [updated] = await db
    .update(note)
    .set({
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      updatedAt: new Date(),
    })
    .where(and(eq(note.id, id), eq(note.userId, session.user.id)))
    .returning();

  if (!updated) {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }

  return Response.json(updated);
}

export async function DELETE(
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
  const now = new Date();

  const [updated] = await db
    .update(note)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(note.id, id), eq(note.userId, session.user.id)))
    .returning();

  if (!updated) {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }

  return Response.json(updated);
}
