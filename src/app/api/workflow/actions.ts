"use server";
import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function selectExecuteAbilityWorkflowsAction() {
  const session = await getSession();
  if (!session) {
    return [];
  }
  
  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    return [];
  }
  
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
    spaceId,
  );
  return workflows;
}
