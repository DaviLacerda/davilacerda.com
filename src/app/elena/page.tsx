import { Experience } from "@/components/elena/experience";
import { LockScreen } from "@/components/elena/lock-screen";
import { isUnlocked } from "@/lib/elena/server";

export default async function ElenaPage() {
  if (!(await isUnlocked())) return <LockScreen />;
  return <Experience />;
}
