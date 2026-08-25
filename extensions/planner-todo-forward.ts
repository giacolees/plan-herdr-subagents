// planner-todo-forward: ensure planner's todos land in the main session, not just the ephemeral planner session.
// Child (planner) side: after each todo mutation, dump the current TaskDetails to a sidecar file next to the child session.
// Parent (main) side: when a planner subagent finishes (subagent_result steer), read that sidecar and recreate the same todos
// in the parent session's live store + append a persisted toolResult entry so replay survives reload.
//
// This fixes: "/plan grill" spawns an interactive planner that creates todos in its own session which is deleted on close.
// Now todos are forwarded directly to the main session pane.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import net from "node:net";
import {
	existsSync,
	readFileSync,
	writeFileSync,
	appendFileSync,
} from "node:fs";

const HERDR_ENV = process.env.HERDR_ENV;
const SOCKET_PATH = process.env.HERDR_SOCKET_PATH;

// Track which child sessions we've already imported to avoid duplicates across agent_start replays.
const importedChildSessions = new Set<string>();

function socketEndpoint(): string | undefined {
	const p = SOCKET_PATH ?? process.env.HERDR_SOCKET_PATH;
	if (!p) return undefined;
	return process.platform === "win32" ? `\\\\.\\pipe\\${p}` : p;
}

function tryForwardViaSocket(payload: unknown): void {
	const endpoint = socketEndpoint();
	const parentPane = process.env.PI_PARENT_PANE_ID;
	if (!endpoint || !parentPane || !HERDR_ENV) return;
	// Best-effort fire-and-forget: send a custom pane event that the parent extension could listen for.
	// If the parent doesn't have a socket listener, the sidecar file is the reliable fallback.
	try {
		const sock = net.createConnection(endpoint);
		const req = JSON.stringify({
			id: `planner-todo-forward:${Date.now()}:${Math.random().toString(36).slice(2)}`,
			method: "pane.notify",
			params: {
				pane_id: parentPane,
				source: "planner-todo-forward",
				payload,
			},
		});
		sock.on("error", () => {
			try {
				sock.destroy();
			} catch (error) {
				void error;
			}
		});
		sock.on("connect", () => {
			try {
				sock.write(req + "\n");
			} catch (error) {
				void error;
			}
			setTimeout(() => {
				try {
					sock.destroy();
				} catch (error) {
					void error;
				}
			}, 200);
		});
	} catch (error) {
		// Socket forwarding is optional; the sidecar remains authoritative.
		void error;
	}
}

function randomId(): string {
	return (
		Math.random().toString(16).slice(2, 10) +
		Math.random().toString(16).slice(2, 10)
	);
}

async function tryImportTodosInParent(ctx: any): Promise<void> {
	// Only run in the main session — not inside a subagent itself.
	if (process.env.PI_SUBAGENT_SESSION) return;
	let branch: Iterable<any>;
	let sessionFile: string | null = null;
	try {
		branch = ctx.sessionManager.getBranch() as Iterable<any>;
		sessionFile = ctx.sessionManager.getSessionFile() as string | null;
	} catch {
		return;
	}
	if (!branch) return;

	// Find recent subagent_result entries for planner that we haven't imported yet.
	const candidates: Array<{ sessionFile: string; agent: string }> = [];
	for (const entry of branch) {
		const msg = (entry as any)?.message;
		if (!msg) continue;
		// pi-herdr-subagents delivers completion as a message with customType subagent_result
		if (msg.customType !== "subagent_result") continue;
		const details = (msg as any).details;
		if (!details?.sessionFile) continue;
		// Only planner todos matter; but also accept "💬 Planner" name
		const agent = String(details.agent ?? "");
		const name = String(details.name ?? "");
		const isPlanner =
			agent === "planner" || /planner/i.test(name) || /planner/i.test(agent);
		if (!isPlanner) continue;
		const childSession: string = details.sessionFile;
		if (importedChildSessions.has(childSession)) continue;
		candidates.push({ sessionFile: childSession, agent });
	}
	if (candidates.length === 0) return;

	for (const c of candidates) {
		const sidecar = `${c.sessionFile}.todos.json`;
		if (!existsSync(sidecar)) continue;
		let details: any;
		try {
			details = JSON.parse(readFileSync(sidecar, "utf8"));
		} catch {
			continue;
		}
		const tasks: any[] = Array.isArray(details?.tasks) ? details.tasks : [];
		if (tasks.length === 0) {
			importedChildSessions.add(c.sessionFile);
			continue;
		}
		// Filter out deleted tasks — they shouldn't be recreated.
		const toImport = tasks.filter((t) => t.status !== "deleted");
		if (toImport.length === 0) {
			importedChildSessions.add(c.sessionFile);
			continue;
		}

		// Try live-store import via rpiv-todo internals; fallback to session-file append.
		let liveImported = false;
		try {
			// Dynamic import so the extension stays loadable even if rpiv-todo is absent.
			let store: any = null;
			let reducer: any = null;
			try {
				store = await import("@juicesharp/rpiv-todo/state/store.js");
			} catch {
				try {
					// Absolute fallback for global installs
					const home = process.env.HOME ?? "";
					if (home) {
						store = await import(
							`${home}/.pi/agent/npm/node_modules/@juicesharp/rpiv-todo/state/store.js`
						);
					}
				} catch (error) {
					// Global fallback is optional when rpiv-todo is unavailable.
					void error;
				}
			}
			try {
				reducer = await import("@juicesharp/rpiv-todo/state/state-reducer.js");
			} catch {
				try {
					const home = process.env.HOME ?? "";
					if (home) {
						reducer = await import(
							`${home}/.pi/agent/npm/node_modules/@juicesharp/rpiv-todo/state/state-reducer.js`
						);
					}
				} catch (error) {
					// Global fallback is optional when rpiv-todo is unavailable.
					void error;
				}
			}
			if (
				store &&
				reducer &&
				typeof store.sid === "function" &&
				typeof store.getState === "function" &&
				typeof store.commitState === "function" &&
				typeof reducer.applyTaskMutation === "function"
			) {
				const sid: string = store.sid(ctx);
				let state = store.getState(sid);
				// Avoid duplicate import if parent already has tasks with same subjects (replay after reload)
				const existingSubjects = new Set(
					(state.tasks as any[]).map((t: any) => t.subject),
				);
				const idMap = new Map<number, number>(); // oldId -> newId
				// First pass: create tasks
				for (const t of toImport) {
					if (existingSubjects.has(t.subject)) continue;
					const result = reducer.applyTaskMutation(state, "create", {
						subject: t.subject,
						description: t.description,
						activeForm: t.activeForm,
						blockedBy: [], // deps handled in second pass
						owner: t.owner,
						metadata: t.metadata,
					});
					if ((result as any)?.op?.kind === "error") continue;
					const newId = (result as any).op.taskId as number;
					idMap.set(t.id as number, newId);
					state = (result as any).state;
					store.commitState(sid, state);
				}
				// Second pass: restore blockedBy edges where possible
				for (const t of toImport) {
					const newId = idMap.get(t.id as number);
					if (!newId) continue;
					const oldDeps: number[] = Array.isArray(t.blockedBy)
						? t.blockedBy
						: [];
					const newDeps = oldDeps
						.map((d) => idMap.get(d))
						.filter((v): v is number => typeof v === "number");
					if (newDeps.length === 0) continue;
					const result = reducer.applyTaskMutation(state, "update", {
						id: newId,
						addBlockedBy: newDeps,
					});
					if ((result as any)?.op?.kind === "error") continue;
					state = (result as any).state;
					store.commitState(sid, state);
				}
				// Also set status for non-pending tasks if planner had already marked some completed/in_progress
				for (const t of toImport) {
					const newId = idMap.get(t.id as number);
					if (!newId) continue;
					if (t.status && t.status !== "pending") {
						const result = reducer.applyTaskMutation(state, "update", {
							id: newId,
							status: t.status,
						});
						if ((result as any)?.op?.kind !== "error") {
							state = (result as any).state;
							store.commitState(sid, state);
						}
					}
				}
				liveImported = true;
				importedChildSessions.add(c.sessionFile);
				try {
					ctx.ui?.notify?.(
						`📋 Imported ${idMap.size} todo(s) from planner into main session`,
						"info",
					);
				} catch (error) {
					void error;
				}
			}
		} catch (e) {
			// fall through to file-append fallback
		}

		if (!liveImported) {
			// Fallback: append a synthetic toolResult entry to the parent's session file so replay will pick it up on next start.
			// This doesn't update the live overlay immediately, but guarantees persistence.
			if (sessionFile && existsSync(sessionFile)) {
				try {
					const branchArr = Array.from(branch as Iterable<any>);
					const last = branchArr[branchArr.length - 1] as any;
					const parentId = last?.id ?? last?.message?.id ?? randomId();
					const now = new Date().toISOString();
					// Build a TaskDetails that reflects the imported tasks for replay.
					// Use the current replay state + imported tasks to compute nextId.
					let nextId = 1;
					try {
						const replayMod = await import(
							"@juicesharp/rpiv-todo/state/replay.js"
						).catch(async () => {
							const home = process.env.HOME ?? "";
							if (home)
								return import(
									`${home}/.pi/agent/npm/node_modules/@juicesharp/rpiv-todo/state/replay.js`
								);
							throw new Error("no replay");
						});
						const replayState = replayMod.replayFromBranch({
							sessionManager: ctx.sessionManager,
						} as any);
						nextId = replayState.nextId ?? 1;
					} catch (error) {
						// The fallback can safely start IDs at one without replay support.
						void error;
					}
					const tasksForDetails = toImport.map((t, idx) => ({
						id: nextId + idx,
						subject: t.subject,
						description: t.description,
						activeForm: t.activeForm,
						status: t.status ?? "pending",
						blockedBy: t.blockedBy,
						owner: t.owner,
						metadata: t.metadata,
					}));
					const detailsToPersist = {
						action: "create" as const,
						params: { action: "create", _forwardedFrom: c.sessionFile },
						tasks: tasksForDetails,
						nextId: nextId + tasksForDetails.length,
					};
					const entry = {
						type: "message",
						id: randomId(),
						parentId,
						timestamp: now,
						message: {
							role: "toolResult",
							toolCallId: `forward_${randomId()}`,
							toolName: "todo",
							content: [
								{
									type: "text",
									text: `Forwarded ${tasksForDetails.length} todo(s) from planner`,
								},
							],
							details: detailsToPersist,
							isError: false,
							timestamp: Date.now(),
						},
					};
					appendFileSync(sessionFile, JSON.stringify(entry) + "\n");
					importedChildSessions.add(c.sessionFile);
					try {
						ctx.ui?.notify?.(
							`📋 Forwarded ${tasksForDetails.length} planner todo(s) to main session (file-append fallback)`,
							"info",
						);
					} catch (error) {
						void error;
					}
				} catch (error) {
					// File persistence is a best-effort fallback.
					void error;
				}
			}
		}
	}
}

export default function (pi: ExtensionAPI) {
	// --- Child (planner) side: persist todos after each mutation ---
	pi.on("tool_execution_end", async (event: any, _ctx: any) => {
		try {
			const toolName: string = event.toolName ?? event.name ?? "";
			if (toolName !== "todo") return;
			const agent = process.env.PI_SUBAGENT_AGENT ?? "";
			const name = process.env.PI_SUBAGENT_NAME ?? "";
			const isPlanner =
				agent === "planner" || /planner/i.test(name) || /planner/i.test(agent);
			if (!isPlanner) return;
			const sessionFile: string | undefined = process.env.PI_SUBAGENT_SESSION;
			if (!sessionFile) return;
			// pi core may put details on event.result.details or event.details or event.result
			const result: any =
				event.result ??
				(event as any).details ??
				(event as any).toolResult ??
				event;
			const details = result?.details ?? result ?? (event as any).details;
			if (!details || !Array.isArray(details.tasks)) return;
			// Write sidecar next to child session file
			try {
				writeFileSync(
					`${sessionFile}.todos.json`,
					JSON.stringify(details, null, 2),
				);
			} catch (error) {
				// Parent-side import has its own fallback path.
				void error;
			}
			// Also write to artifact dir for visibility (plan artifact)
			try {
				const parentSession = process.env.PI_PARENT_SESSION_FILE;
				if (parentSession) {
					// Derive plan name from task if possible — best-effort
					const task = process.env.PI_SUBAGENT_TASK_HINT ?? "";
					const m = task.match(/\.agent\/plans\/([^/\s]+)/);
					if (m) {
						const planName = m[1];
						// parentSession dir is like .../sessions/<cwd>/artifacts/<id>/ but we can just use cwd
						// Write to cwd's .agent/plans/<planName>/planner-todos.json as well
						const cwd = process.cwd();
						const planTodosPath = `${cwd}/.agent/plans/${planName}/planner-todos.json`;
						try {
							writeFileSync(planTodosPath, JSON.stringify(details, null, 2));
						} catch (error) {
							void error;
						}
					}
				}
			} catch (error) {
				// The session sidecar remains the reliable forwarding channel.
				void error;
			}
			// Best-effort socket notify to parent (sidecar is the reliable channel)
			tryForwardViaSocket({
				type: "planner_todos",
				sessionFile,
				count: details.tasks.length,
			});
		} catch (error) {
			// Todo forwarding must not break planner execution.
			void error;
		}
	});

	// Capture parent session/task hint at launch time for artifact path
	pi.on("session_start", async (_event: any, _ctx: any) => {
		// Reserved for session metadata supplied by patched pi-herdr-subagents.
		void _ctx;
	});

	// --- Parent (main) side: import on every agent start/turn start ---
	// Use both hooks to catch the steer-delivered subagent_result promptly.
	pi.on("agent_start", async (_e: any, ctx: any) => {
		try {
			await tryImportTodosInParent(ctx);
		} catch (error) {
			// Import is retried by later lifecycle hooks.
			void error;
		}
	});
	pi.on("before_agent_start", async (_e: any, ctx: any) => {
		try {
			await tryImportTodosInParent(ctx);
		} catch (error) {
			// Import is retried by later lifecycle hooks.
			void error;
		}
	});
	pi.on("session_start", async (_e: any, ctx: any) => {
		// On reload, re-import any unimported planner todos (covers persistence fallback)
		try {
			await tryImportTodosInParent(ctx);
		} catch (error) {
			// A later agent start retries the import.
			void error;
		}
	});
}
