import { LiaisonHistory } from "../history-view";

export const metadata = { title: "Organisational routing" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonHistory routingOnly={true} searchParams={searchParams} />;
}
