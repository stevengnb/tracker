import fs from "fs";
import path from "path";
import type { Quiz, QuizMeta, QuizQuestion } from "./types";

// Read-only browser over a folder of Markdown quiz files. Each file is a
// self-test for a learning note: numbered questions with `- [ ]` / `- [x]`
// task-list options and an optional `>` explanation. The app never writes here.
export function quizDir(): string {
  return process.env.QUIZ_DIR ?? "/srv/shared/etc/quizzes";
}

// A slug is a bare filename (no path separators, no traversal). Reject anything
// that could escape the quiz directory.
function safeSlug(slug: string): string | null {
  if (!slug || slug.includes("/") || slug.includes("\\") || slug.includes(".."))
    return null;
  return slug;
}

// title / topic from a leading YAML frontmatter block (only those two keys).
function parseFrontmatter(md: string): {
  title: string | null;
  topic: string | null;
  body: string;
} {
  if (!md.startsWith("---")) return { title: null, topic: null, body: md };
  const end = md.indexOf("\n---", 3);
  if (end === -1) return { title: null, topic: null, body: md };
  const block = md.slice(3, end);
  const nl = md.indexOf("\n", end + 1);
  const body = nl === -1 ? "" : md.slice(nl + 1);
  const grab = (key: string) => {
    const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  return { title: grab("title"), topic: grab("topic"), body };
}

// Line-based parse. A numbered line starts a question; `- [ ]`/`- [x]` lines are
// its options; `>` lines accumulate into its explanation. HTML comments and any
// other text between questions are ignored.
function parseQuestions(body: string): QuizQuestion[] {
  const lines = body.split("\n");
  const questions: QuizQuestion[] = [];
  let cur: QuizQuestion | null = null;
  let inComment = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (inComment) {
      if (line.includes("-->")) inComment = false;
      continue;
    }
    if (line.trimStart().startsWith("<!--")) {
      if (!line.includes("-->")) inComment = true;
      continue;
    }

    const q = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (q) {
      cur = { prompt: q[1].trim(), options: [], explanation: null, multi: false };
      questions.push(cur);
      continue;
    }
    if (!cur) continue;

    const opt = line.match(/^\s*[-*]\s*\[( |x|X)\]\s+(.*)$/);
    if (opt) {
      cur.options.push({ text: opt[2].trim(), correct: opt[1].toLowerCase() === "x" });
      continue;
    }

    const exp = line.match(/^\s*>\s?(.*)$/);
    if (exp) {
      const text = exp[1].trim();
      cur.explanation = cur.explanation ? `${cur.explanation} ${text}` : text;
      continue;
    }
  }

  // A question needs options to be answerable; drop malformed ones.
  return questions
    .filter((x) => x.options.length > 0)
    .map((x) => ({ ...x, multi: x.options.filter((o) => o.correct).length > 1 }));
}

function listFiles(): string[] {
  try {
    return fs
      .readdirSync(quizDir(), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md") && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function readQuiz(slug: string): Quiz | null {
  const safe = safeSlug(slug);
  if (!safe) return null;
  const target = path.normalize(path.join(quizDir(), `${safe}.md`));
  if (!target.startsWith(quizDir() + path.sep)) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(target, "utf-8");
  } catch {
    return null;
  }
  const { title, topic, body } = parseFrontmatter(raw);
  const questions = parseQuestions(body);
  return {
    slug: safe,
    path: `${safe}.md`,
    title: title ?? safe,
    topic,
    questions,
  };
}

export function listQuizzes(): QuizMeta[] {
  return listFiles()
    .map((name) => {
      const slug = name.replace(/\.md$/i, "");
      const quiz = readQuiz(slug);
      if (!quiz) return null;
      return {
        slug,
        title: quiz.title,
        topic: quiz.topic,
        count: quiz.questions.length,
      } satisfies QuizMeta;
    })
    .filter((x): x is QuizMeta => x != null && x.count > 0);
}
