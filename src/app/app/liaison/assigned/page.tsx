import { LiaisonRegister } from "../register";

export const metadata = { title: "Assigned references" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonRegister view="assigned" searchParams={searchParams} />;
}
