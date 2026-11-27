import { ReportList } from "../list";

export const metadata = { title: "Reports submitted" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ReportList box="submitted" searchParams={searchParams} />;
}
