import { notFound } from "next/navigation";

import { SceneHarness } from "@/components/elena/scene-harness";
import { isUnlocked } from "@/lib/elena/server";

/** Development only: one first-person scene on its own, for building and screenshots. */
export default async function DevScene({
  params,
}: {
  params: Promise<{ scene: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  if (!(await isUnlocked())) notFound();
  const { scene } = await params;
  return <SceneHarness id={scene} />;
}
