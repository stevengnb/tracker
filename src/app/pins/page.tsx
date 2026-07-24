import { getPinCategories, getPins } from "@/lib/queries";
import { PinsBoard } from "@/components/pins";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pins" };

export default function PinsPage() {
  return <PinsBoard pins={getPins()} categories={getPinCategories()} />;
}
