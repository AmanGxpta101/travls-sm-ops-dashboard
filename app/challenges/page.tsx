import { getActor } from "@/lib/actor";
import { listChallenges, type ChallengeRow } from "@/lib/ops-api";
import { ChallengesPanel } from "../challenges-panel";
import { Banners, ErrorBanner, OpsHeader, PageShell } from "../shell";

/** Create, schedule and archive the challenges every user sees. */
export default async function ChallengesPage() {
  const actor = await getActor();

  let challenges: ChallengeRow[] = [];
  let loadError: string | null = null;
  try {
    challenges = await listChallenges();
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <PageShell>
      <OpsHeader active="challenges" actor={actor} returnTo="/challenges" />
      <Banners />
      {loadError ? (
        <ErrorBanner>Can&apos;t reach the Social Mining Service: {loadError}</ErrorBanner>
      ) : (
        <ChallengesPanel challenges={challenges} />
      )}
    </PageShell>
  );
}
