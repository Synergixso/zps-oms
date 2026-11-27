import { LiaisonRegister } from "../register";

export const metadata = { title: "Receiving and review queue" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonRegister view="incoming" searchParams={searchParams} />;
}
