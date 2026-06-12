import { getGame } from "@/lib/game-store";
import {
  createPlaythroughRecordForStorage,
  loadPlaythroughFromStorage,
  replaceChoiceLogsForStorage,
  updatePlaythroughRecordForStorage,
} from "@/lib/storage";
import {
  getNodeByCode,
  type ChoiceLog,
  type PlaythroughState,
  type StoryChoice,
  type StoryNode,
} from "@/lib/story-engine";

function buildChoiceLog(node: StoryNode, choice: StoryChoice): ChoiceLog {
  return {
    nodeCode: node.code,
    choiceCode: choice.code,
    choiceLabel: choice.label,
    targetNodeCode: choice.targetNodeCode,
    chosenAt: new Date().toISOString(),
  };
}

async function getPlaythroughOrThrow(playthroughId: string) {
  const session = await loadPlaythroughFromStorage(playthroughId);

  if (!session) {
    throw new Error("Playthrough not found");
  }

  return session;
}

async function markCompletionIfNeeded(session: PlaythroughState, nodeCode: string) {
  const node = getNodeByCode(await getGame(), nodeCode);

  if (node.isEnding) {
    session.status = "completed";
    session.finishedAt = new Date().toISOString();
  }
}

export async function createPlaythrough() {
  const game = await getGame();

  if (!game.startNodeCode) {
    throw new Error("Project has no start node");
  }

  const id = crypto.randomUUID();
  const session: PlaythroughState = {
    id,
    gameSlug: game.slug,
    currentNodeCode: game.startNodeCode,
    status: "in_progress",
    history: [],
    startedAt: new Date().toISOString(),
  };

  await markCompletionIfNeeded(session, session.currentNodeCode);
  await createPlaythroughRecordForStorage(session);

  return {
    session,
    node: getNodeByCode(game, session.currentNodeCode),
  };
}

export async function getCurrentNode(playthroughId: string) {
  const game = await getGame();
  const session = await getPlaythroughOrThrow(playthroughId);
  const node = getNodeByCode(game, session.currentNodeCode);

  return {
    session,
    node,
  };
}

export async function chooseBranch(playthroughId: string, choiceCode: string) {
  const game = await getGame();
  const session = await getPlaythroughOrThrow(playthroughId);
  const currentNode = getNodeByCode(game, session.currentNodeCode);
  const choices = currentNode.choices ?? [];
  const selectedChoice = choices.find((choice) => choice.code === choiceCode);

  if (!selectedChoice) {
    throw new Error("Choice not found on current node");
  }

  session.history.push(buildChoiceLog(currentNode, selectedChoice));
  session.currentNodeCode = selectedChoice.targetNodeCode;
  await markCompletionIfNeeded(session, session.currentNodeCode);
  await updatePlaythroughRecordForStorage(session);
  await replaceChoiceLogsForStorage(session.id, session.history);

  return {
    session,
    node: getNodeByCode(game, session.currentNodeCode),
  };
}

export async function advancePlaythrough(playthroughId: string) {
  const game = await getGame();
  const session = await getPlaythroughOrThrow(playthroughId);
  const currentNode = getNodeByCode(game, session.currentNodeCode);

  if (!currentNode.autoNextNodeCode) {
    throw new Error("Current node has no automatic transition");
  }

  session.currentNodeCode = currentNode.autoNextNodeCode;
  await markCompletionIfNeeded(session, session.currentNodeCode);
  await updatePlaythroughRecordForStorage(session);

  return {
    session,
    node: getNodeByCode(game, session.currentNodeCode),
  };
}

export async function restartPlaythrough(playthroughId: string) {
  const game = await getGame();
  const session = await getPlaythroughOrThrow(playthroughId);

  if (!game.startNodeCode) {
    throw new Error("Project has no start node");
  }

  session.currentNodeCode = game.startNodeCode;
  session.status = "in_progress";
  session.history = [];
  session.startedAt = new Date().toISOString();
  session.finishedAt = undefined;
  await updatePlaythroughRecordForStorage(session);
  await replaceChoiceLogsForStorage(session.id, session.history);

  return {
    session,
    node: getNodeByCode(game, session.currentNodeCode),
  };
}
