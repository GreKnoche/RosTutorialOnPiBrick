import { NextResponse } from "next/server";
import { readCatalog } from "@/lib/catalog-file";
import { getLessonBySlug } from "@/lib/curriculum";
import { validateCreate, validateDraft } from "@/lib/lesson-draft";
import { createLesson, LessonStoreError, saveLesson } from "@/lib/lesson-store";
import { loadLessonCopy } from "@/lib/load-lesson-copy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const track = url.searchParams.get("track") ?? "";
  const slug = url.searchParams.get("slug") ?? "";
  if (track !== "autonom" && track !== "ros") {
    return NextResponse.json({ ok: false, message: "Unbekannte Lektion." }, { status: 400 });
  }
  const lesson = getLessonBySlug(track, slug, readCatalog());
  if (!lesson) {
    return NextResponse.json({ ok: false, message: "Lektion nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    lesson,
    copy: loadLessonCopy(lesson.track, lesson.id, lesson.slug),
  });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  const created = validateCreate(body);
  if (!created.ok) return NextResponse.json({ ok: false, message: created.message }, { status: 400 });
  try {
    const lesson = createLesson(created.value);
    return NextResponse.json({ ok: true, lesson });
  } catch (error) {
    if (error instanceof LessonStoreError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function PUT(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  const draft = validateDraft(body);
  if (!draft.ok) return NextResponse.json({ ok: false, message: draft.message }, { status: 400 });
  try {
    const saved = saveLesson(draft.value.meta, draft.value.copy);
    return NextResponse.json({ ok: true, lesson: saved.lesson, copy: saved.copy });
  } catch (error) {
    if (error instanceof LessonStoreError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }
    throw error;
  }
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}
