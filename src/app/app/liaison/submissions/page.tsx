import { LiaisonRegister } from "../register";

export const metadata = { title: "Submission status" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonRegister view="submissions" searchParams={searchParams} />;
}
