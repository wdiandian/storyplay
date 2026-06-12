import { AdminStoryEditor } from "@/components/admin-story-editor";
import { getGame } from "@/lib/game-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return <AdminStoryEditor initialGame={await getGame()} />;
}
