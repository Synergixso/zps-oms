import { LiaisonHistory } from "../history-view";

export const metadata = { title: "Liaison history" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonHistory routingOnly={false} searchParams={searchParams} />;
}
