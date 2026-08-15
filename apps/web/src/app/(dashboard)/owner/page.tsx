"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FolderKanban,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "OWNER" | "ADMIN" | "MEMBER";
type View = "projects" | "people";

interface Member {
  id: string;
  role: Role;
  user: { id: string; email: string; isPlatformOwner: boolean };
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
  memberships: Member[];
  _count: { servers: number; services: number; incidents: number };
}

interface DirectoryUser {
  id: string;
  email: string;
  isPlatformOwner: boolean;
  memberships: { role: Role; workspace: { id: string; name: string } }[];
}

interface OwnerData {
  workspaces: Project[];
  users: DirectoryUser[];
}

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

function roleLabel(role: Role) {
  if (role === "OWNER") return "Owner";
  if (role === "ADMIN") return "Admin";
  return "Member";
}

export default function OwnerPage() {
  const router = useRouter();
  const [data, setData] = useState<OwnerData | null>(null);
  const [view, setView] = useState<View>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [assignmentProjectId, setAssignmentProjectId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [projectName, setProjectName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountProjectId, setAccountProjectId] = useState("");
  const [accountRole, setAccountRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    try {
      setLoadError(null);
      const result = await apiClientFetch<OwnerData>("/workspaces/admin");
      setData(result);
      setSelectedProjectId((current) =>
        current && result.workspaces.some((project) => project.id === current)
          ? current
          : result.workspaces[0]?.id ?? null,
      );
      setSelectedUserId((current) =>
        current && result.users.some((user) => user.id === current) ? current : result.users[0]?.id ?? null,
      );
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error.message : "Unable to load the owner console");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedProject = data?.workspaces.find((project) => project.id === selectedProjectId) ?? null;
  const selectedUser = data?.users.find((user) => user.id === selectedUserId) ?? null;
  const membershipCount = useMemo(
    () => data?.workspaces.reduce((total, project) => total + project.memberships.length, 0) ?? 0,
    [data],
  );
  const projectsForNewUser = data?.workspaces ?? [];
  const availableProjectAssignments = projectsForNewUser.filter(
    (project) => !selectedUser?.memberships.some((membership) => membership.workspace.id === project.id),
  );

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Unable to complete that action");
    } finally {
      setBusy(false);
    }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim()) return;
    await run(async () => {
      const result = await apiClientFetch<{ workspace: Project }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: projectName.trim() }),
      });
      setProjectName("");
      setSelectedProjectId(result.workspace.id);
      setView("projects");
      setCreateProjectOpen(false);
    }, "Project created");
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const result = await apiClientFetch<{ user: DirectoryUser }>("/workspaces/users", {
        method: "POST",
        body: JSON.stringify({
          email: accountEmail.trim(),
          password: accountPassword,
          ...(accountProjectId ? { workspaceId: accountProjectId, role: accountRole } : {}),
        }),
      });
      setAccountEmail("");
      setAccountPassword("");
      setAccountProjectId("");
      setAccountRole("MEMBER");
      setShowAccountPassword(false);
      setCreateUserOpen(false);
      setSelectedUserId(result.user.id);
      setView("people");
    }, accountProjectId ? "Account created and access granted" : "Account created without project access");
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !memberUserId) return;
    const user = data?.users.find((item) => item.id === memberUserId);
    if (!user) return;
    await run(async () => {
      await apiClientFetch(`/workspaces/${selectedProjectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: user.email, role: memberRole }),
      });
      setMemberUserId("");
    }, "Project access granted");
  }

  async function assignUser(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser || !assignmentProjectId) return;
    await run(async () => {
      await apiClientFetch(`/workspaces/${assignmentProjectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: selectedUser.email, role: assignmentRole }),
      });
      setAssignmentProjectId("");
    }, "Project access granted");
  }

  async function changeRole(projectId: string, userId: string, role: "ADMIN" | "MEMBER") {
    await run(async () => {
      await apiClientFetch(`/workspaces/${projectId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    }, "Role updated");
  }

  async function removeMember(projectId: string, userId: string, email: string) {
    if (!window.confirm(`Remove ${email} from this project?`)) return;
    await run(async () => {
      await apiClientFetch(`/workspaces/${projectId}/members/${userId}`, { method: "DELETE" });
    }, "Project access removed");
  }

  async function renameProject(event: FormEvent) {
    event.preventDefault();
    if (!editingProjectId || !renameValue.trim()) return;
    await run(async () => {
      await apiClientFetch(`/workspaces/${editingProjectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setEditingProjectId(null);
      setRenameValue("");
    }, "Project renamed");
  }

  async function openProject(projectId: string) {
    await run(async () => {
      await apiClientFetch(`/workspaces/${projectId}/select`, { method: "POST" });
      router.push("/dashboard");
    }, "Project selected");
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl p-6 md:p-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-semibold">Owner console unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button className="mt-5" onClick={() => void load()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading owner console…</div>;
  }

  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-8">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" /> Platform control
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Owner console</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create projects, provision people, and decide exactly where each account can work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreateProjectOpen(true)}><Plus className="size-4" /> New project</Button>
            <Button onClick={() => setCreateUserOpen(true)}><UserPlus className="size-4" /> Add user</Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Platform overview">
          {[
            { label: "Projects", value: data.workspaces.length, icon: FolderKanban },
            { label: "People", value: data.users.length, icon: Users },
            { label: "Access grants", value: membershipCount, icon: KeyRound },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border bg-background p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" aria-hidden="true" /></div>
                  <div><div className="text-2xl font-semibold tabular-nums">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></div>
                </div>
              </div>
            );
          })}
        </section>

        <nav className="flex items-center gap-1 rounded-2xl border bg-background p-1.5 shadow-xs" aria-label="Owner console sections">
          {([
            { id: "projects" as const, label: "Projects", count: data.workspaces.length, icon: FolderKanban },
            { id: "people" as const, label: "People & access", count: data.users.length, icon: Users },
          ]).map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden="true" /> {item.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-primary-foreground/15" : "bg-muted"}`}>{item.count}</span>
              </button>
            );
          })}
        </nav>

        {view === "projects" ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="rounded-2xl border bg-background shadow-xs">
              <div className="border-b px-5 py-5">
                <h2 className="font-heading text-lg font-semibold">Projects</h2>
                <p className="mt-1 text-sm text-muted-foreground">Each project is an isolated monitoring workspace.</p>
              </div>
              <div className="divide-y">
                {data.workspaces.map((project) => {
                  const active = project.id === selectedProjectId;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`flex min-h-24 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40 ${active ? "bg-primary/5" : "hover:bg-muted/50"}`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2"><FolderKanban className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="truncate font-medium">{project.name}</span></span>
                        <span className="mt-2 block text-xs text-muted-foreground">{project.memberships.length} people · {project._count.servers} servers · {project._count.services} services</span>
                      </span>
                      <ChevronRight className={`size-4 shrink-0 transition-transform ${active ? "translate-x-0.5 text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                    </button>
                  );
                })}
                {!data.workspaces.length && <div className="p-6 text-sm text-muted-foreground">No projects yet. Create the first project to start assigning access.</div>}
              </div>
            </div>

            {selectedProject ? (
              <div className="rounded-2xl border bg-background shadow-xs">
                <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-primary"><FolderKanban className="size-4" aria-hidden="true" /> Selected project</div>
                    <h2 className="mt-2 text-xl font-semibold">{selectedProject.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Manage who can enter this project and what they can do.</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => void openProject(selectedProject.id)} disabled={busy}><ArrowUpRight className="size-3.5" /> Open</Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Rename ${selectedProject.name}`} onClick={() => { setEditingProjectId(selectedProject.id); setRenameValue(selectedProject.name); }}><Pencil className="size-4" /></Button>
                  </div>
                </div>

                {editingProjectId === selectedProject.id && (
                  <form onSubmit={renameProject} className="flex flex-col gap-2 border-b bg-muted/30 p-5 sm:flex-row">
                    <Label className="sr-only" htmlFor="rename-project">Project name</Label>
                    <Input id="rename-project" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={100} className="h-11" />
                    <Button type="submit" disabled={busy}>Save name</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingProjectId(null)}>Cancel</Button>
                  </form>
                )}

                <div className="space-y-5 p-5">
                  <div>
                    <h3 className="font-medium">Grant project access</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Choose an existing account. New accounts can be created with access from “Add user”.</p>
                  </div>
                  <form onSubmit={addMember} className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end">
                    <div className="space-y-2"><Label htmlFor="project-account">Account</Label><select id="project-account" value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)} className={selectClass} required><option value="">Select a person</option>{data.users.filter((user) => !selectedProject.memberships.some((member) => member.user.id === user.id)).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></div>
                    <div className="space-y-2"><Label htmlFor="project-role">Role</Label><select id="project-role" value={memberRole} onChange={(event) => setMemberRole(event.target.value as "ADMIN" | "MEMBER")} className={selectClass}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></div>
                    <Button type="submit" disabled={busy || !memberUserId} className="h-11">Grant access</Button>
                  </form>

                  <div className="overflow-hidden rounded-2xl border">
                    <div className="border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">People with access</div>
                    <div className="divide-y">
                      {selectedProject.memberships.map((membership) => (
                        <div key={membership.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0"><div className="truncate text-sm font-medium">{membership.user.email}</div><div className="mt-1 text-xs text-muted-foreground">{membership.role === "OWNER" ? "Platform owner · cannot be changed" : "Project account"}</div></div>
                          <div className="flex items-center gap-2">
                            {membership.role === "OWNER" ? <Badge>Owner</Badge> : <><select aria-label={`Role for ${membership.user.email}`} value={membership.role} disabled={busy} onChange={(event) => void changeRole(selectedProject.id, membership.user.id, event.target.value as "ADMIN" | "MEMBER")} className="h-10 rounded-xl border border-input bg-background px-3 text-sm"><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select><Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Remove ${membership.user.email}`} onClick={() => void removeMember(selectedProject.id, membership.user.id, membership.user.email)}><Trash2 className="size-4" /></Button></>}
                          </div>
                        </div>
                      ))}
                      {!selectedProject.memberships.length && <div className="p-5 text-sm text-muted-foreground">No one has access yet.</div>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">Select a project to manage its access.</div>
            )}
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
            <div className="rounded-2xl border bg-background shadow-xs">
              <div className="border-b px-5 py-5"><h2 className="font-heading text-lg font-semibold">People & access</h2><p className="mt-1 text-sm text-muted-foreground">Every account on the platform, including people waiting for a project assignment.</p></div>
              <div className="divide-y">
                {data.users.map((user) => {
                  const active = user.id === selectedUserId;
                  return (
                    <button key={user.id} type="button" onClick={() => setSelectedUserId(user.id)} className={`flex min-h-24 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40 ${active ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                      <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-medium">{user.email}</span>{user.isPlatformOwner && <Badge variant="secondary">Platform owner</Badge>}</span><span className="mt-2 block text-xs text-muted-foreground">{user.memberships.length ? `${user.memberships.length} project ${user.memberships.length === 1 ? "access grant" : "access grants"}` : "No project access"}</span></span>
                      <ChevronRight className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                    </button>
                  );
                })}
                {!data.users.length && <div className="p-6 text-sm text-muted-foreground">No user accounts yet.</div>}
              </div>
            </div>

            {selectedUser ? (
              <div className="rounded-2xl border bg-background shadow-xs">
                <div className="border-b px-5 py-5"><div className="flex items-center gap-2 text-xs font-medium text-primary"><Users className="size-4" aria-hidden="true" /> Account details</div><h2 className="mt-2 break-all text-lg font-semibold">{selectedUser.email}</h2><p className="mt-1 text-sm text-muted-foreground">Review this account’s project access and role.</p></div>
                <div className="space-y-5 p-5">
                  {selectedUser.isPlatformOwner && <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p><span className="font-medium">Platform owner</span><span className="mt-1 block text-muted-foreground">This account can manage every project and user.</span></p></div>}
                  <div><h3 className="font-medium">Project access</h3><div className="mt-3 space-y-2">{selectedUser.memberships.map((membership) => <div key={membership.workspace.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{membership.workspace.name}</div><div className="text-xs text-muted-foreground">{roleLabel(membership.role)}</div></div><Badge variant={membership.role === "OWNER" ? "default" : "outline"}>{roleLabel(membership.role)}</Badge></div>)}{!selectedUser.memberships.length && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No project access yet. Assign one below.</div>}</div></div>
                  {!selectedUser.isPlatformOwner && <form onSubmit={assignUser} className="space-y-3 border-t pt-5"><div><h3 className="font-medium">Assign a project</h3><p className="mt-1 text-sm text-muted-foreground">Give this account access without leaving the People view.</p></div><div className="space-y-2"><Label htmlFor="assignment-project">Project</Label><select id="assignment-project" value={assignmentProjectId} onChange={(event) => setAssignmentProjectId(event.target.value)} className={selectClass} required><option value="">Select a project</option>{availableProjectAssignments.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="assignment-role">Role</Label><select id="assignment-role" value={assignmentRole} onChange={(event) => setAssignmentRole(event.target.value as "ADMIN" | "MEMBER")} className={selectClass}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></div><Button type="submit" className="h-11 w-full" disabled={busy || !assignmentProjectId}><Check className="size-4" /> Grant project access</Button></form>}
                </div>
              </div>
            ) : <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">Select a person to review access.</div>}
          </section>
        )}

        {message && <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground shadow-xs" role="status"><Check className="size-4 text-primary" aria-hidden="true" /> {message}</div>}
      </div>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-5"><DialogTitle>Add a user</DialogTitle><DialogDescription>Create the login and, if you choose, grant the first project role in the same step.</DialogDescription></DialogHeader>
          <form onSubmit={createAccount}>
            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl bg-muted/40 p-4"><div className="flex gap-3"><UserPlus className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-sm font-medium">One guided setup</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The account is ready to sign in immediately. Project access is optional and can be changed later.</p></div></div></div>
              <div className="space-y-2"><Label htmlFor="new-user-email">Email address</Label><Input id="new-user-email" type="email" autoComplete="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="person@company.com" className="h-11" required /></div>
              <div className="space-y-2"><Label htmlFor="new-user-password">Temporary password</Label><div className="relative"><Input id="new-user-password" type={showAccountPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} placeholder="At least 8 characters" className="h-11 pr-11" required /><button type="button" aria-label={showAccountPassword ? "Hide temporary password" : "Show temporary password"} title={showAccountPassword ? "Hide temporary password" : "Show temporary password"} onClick={() => setShowAccountPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">{showAccountPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><p className="text-xs text-muted-foreground">Share this securely and ask the user to change it after signing in.</p></div>
              <div className="space-y-2"><Label htmlFor="new-user-project">Initial project <span className="font-normal text-muted-foreground">(optional)</span></Label><select id="new-user-project" value={accountProjectId} onChange={(event) => setAccountProjectId(event.target.value)} className={selectClass}><option value="">Create account only</option>{projectsForNewUser.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
              {accountProjectId && <div className="space-y-2"><Label htmlFor="new-user-role">Project role</Label><select id="new-user-role" value={accountRole} onChange={(event) => setAccountRole(event.target.value as "ADMIN" | "MEMBER")} className={selectClass}><option value="MEMBER">Member — can view and operate project resources</option><option value="ADMIN">Admin — can manage this project’s resources</option></select></div>}
            </div>
            <DialogFooter className="px-6"><DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose><Button type="submit" disabled={busy}>{busy ? "Creating…" : accountProjectId ? "Create & grant access" : "Create account"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b px-6 py-5"><DialogTitle>Create a project</DialogTitle><DialogDescription>Projects keep servers, services, incidents, and access separated from one another.</DialogDescription></DialogHeader>
          <form onSubmit={createProject}>
            <div className="px-6 py-5"><Label htmlFor="new-project-name">Project name</Label><Input id="new-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Acme monitoring" className="mt-2 h-11" maxLength={100} required /></div>
            <DialogFooter className="px-6"><DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create project"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
