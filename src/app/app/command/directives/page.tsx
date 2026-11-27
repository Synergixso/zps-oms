import { DirectiveList } from "./list";

export const metadata = { title: "Directives received" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <DirectiveList box="received" searchParams={searchParams} />;
}
