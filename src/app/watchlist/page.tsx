import { redirect } from "next/navigation";

// Watchlist was folded into Queue (Watch + Read).
export default function WatchlistRedirect() {
  redirect("/queue");
}
