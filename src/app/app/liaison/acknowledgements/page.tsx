import { LiaisonRegister } from "../register";

export const metadata = { title: "Acknowledgements" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LiaisonRegister view="acknowledgements" searchParams={searchParams} />;
}
