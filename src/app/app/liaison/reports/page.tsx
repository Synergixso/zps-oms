import { LiaisonRegister } from "../register";

export const metadata = { title: "Report reference tracking" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonRegister view="reports" searchParams={searchParams} />;
}
