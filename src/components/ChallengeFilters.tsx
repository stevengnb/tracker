"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIER_LABELS } from "@/lib/types";
import { Select } from "./Select";

export function ChallengeFilters({
  categories,
  category,
  difficulty,
}: {
  categories: string[];
  category?: string;
  difficulty?: string;
}) {
  const router = useRouter();

  const navigate = (next: { category?: string; difficulty?: string }) => {
    const cat = "category" in next ? next.category : category;
    const diff = "difficulty" in next ? next.difficulty : difficulty;
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (diff) params.set("difficulty", diff);
    const qs = params.toString();
    router.push(qs ? `/challenges?${qs}` : "/challenges");
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select
        value={category ?? ""}
        onChange={(v) => navigate({ category: v })}
        className="w-48"
        options={[
          { value: "", label: "All categories" },
          ...categories.map((c) => ({ value: c, label: c })),
        ]}
      />
      <Select
        value={difficulty ?? ""}
        onChange={(v) => navigate({ difficulty: v })}
        className="w-44"
        options={[
          { value: "", label: "All tiers" },
          ...[1, 2, 3].map((t) => ({ value: String(t), label: TIER_LABELS[t] })),
        ]}
      />
      {(category || difficulty) && (
        <Link
          href="/challenges"
          className="self-center text-[12px] text-faint hover:text-accent"
        >
          clear
        </Link>
      )}
    </div>
  );
}
