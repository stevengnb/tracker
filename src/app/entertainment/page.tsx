import { QueueView } from "@/components/QueueView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Entertainment" };

export default async function EntertainmentPage(props: {
  searchParams: Promise<{
    kind?: string;
    category?: string;
    status?: string;
    item?: string;
  }>;
}) {
  const sp = await props.searchParams;
  return (
    <QueueView
      bucket="entertainment"
      basePath="/entertainment"
      title="Entertainment"
      subtitle="Anime, movies, series and books to watch and read."
      sp={sp}
    />
  );
}
