import { DirectiveList } from "../list";

export const metadata = { title: "Directives issued" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <DirectiveList box="issued" searchParams={searchParams} />;
}
