import { getGuideCategories, getGuides } from "@/lib/queries";
import { GuidesBrowser } from "@/components/guides";

export const dynamic = "force-dynamic";

export const metadata = { title: "Guides" };

export default async function GuidesPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await props.searchParams;
  const guides = getGuides();
  const categories = getGuideCategories();
  const openId = sp.id ? Number(sp.id) : null;
  return (
    <GuidesBrowser
      guides={guides}
      categories={categories}
      openId={Number.isNaN(openId) ? null : openId}
    />
  );
}
