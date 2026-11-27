import { ReportList } from "./list";

export const metadata = { title: "Reports received" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ReportList box="inbox" searchParams={searchParams} />;
}
