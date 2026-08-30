import { listQuizzes, readQuiz } from "@/lib/quiz";
import { getQuizAttempts, getQuizStats } from "@/lib/queries";
import { QuizList, QuizRunner } from "@/components/quiz";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quiz" };

export default async function QuizPage(props: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const sp = await props.searchParams;
  const quiz = sp.slug ? readQuiz(sp.slug) : null;

  if (quiz) {
    return <QuizRunner quiz={quiz} attempts={getQuizAttempts(quiz.slug)} />;
  }

  return <QuizList quizzes={listQuizzes()} stats={getQuizStats()} />;
}
