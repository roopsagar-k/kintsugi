import type {
  Plan,
  Run,
  Ticket,
  TicketDetail,
  FailureDetail,
  Artifact,
  Report,
  CreatePlanArgs,
  CreateRunArgs,
  PatchRunArgs,
  PostResultArgs,
  PatchTicketArgs,
  UploadArtifactArgs,
  Severity,
  TicketStatus,
} from "./types.js";

/**
 * IKintsugiStore — the interface that both ApiClient and LocalStore implement.
 * All tools call this interface; the concrete implementation is selected by getStore().
 */
export interface IKintsugiStore {
  verifyKey(): Promise<{ projectId: string; projectName: string; plan: string }>;
  createPlan(args: CreatePlanArgs): Promise<Plan>;
  createRun(args: CreateRunArgs): Promise<Run>;
  patchRun(runId: string, args: PatchRunArgs): Promise<Run>;
  getRun(runId: string): Promise<Run>;
  postResult(args: PostResultArgs): Promise<{ resultId: string; ticketId?: string }>;
  getFailures(runId: string, severity?: Severity): Promise<FailureDetail[]>;
  listTickets(projectId: string, status?: TicketStatus): Promise<Ticket[]>;
  getTicket(ticketId: string): Promise<TicketDetail>;
  patchTicket(ticketId: string, args: PatchTicketArgs): Promise<Ticket>;
  uploadArtifact(args: UploadArtifactArgs): Promise<Artifact>;
  createReport(runId: string): Promise<Report>;
}

/**
 * Returns the appropriate store implementation based on KINTSUGI_MODE env var.
 * Import is dynamic to avoid circular deps and allow lazy loading.
 */
export async function getStore(projectRoot: string): Promise<IKintsugiStore> {
  const mode = process.env["KINTSUGI_MODE"] ?? "cloud";
  if (mode === "local") {
    const { LocalStore } = await import("./local-store.js");
    return new LocalStore(projectRoot);
  }
  const { ApiClient } = await import("./client.js");
  const apiUrl = process.env["KINTSUGI_API_URL"] ?? "";
  const apiKey = process.env["KINTSUGI_API_KEY"] ?? "";
  return new ApiClient(apiUrl, apiKey);
}
