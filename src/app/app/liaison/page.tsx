import { LiaisonRegister } from "./register";

export const metadata = { title: "Liaison register" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonRegister view="all" searchParams={searchParams} />;
}
