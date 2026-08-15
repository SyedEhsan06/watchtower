"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiClientFetch, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceOption { id: string; name: string; role: "OWNER" | "ADMIN" | "MEMBER" }
interface WorkspaceResponse { workspaces: WorkspaceOption[]; activeWorkspaceId: string | null; isPlatformOwner: boolean }
interface Member { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; user: { id: string; email: string; isPlatformOwner: boolean } }

export function ProjectMembers() {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const current = await apiClientFetch<WorkspaceResponse>("/workspaces");
    setWorkspace(current);
    const activeId = current.activeWorkspaceId ?? current.workspaces[0]?.id;
    if (activeId) {
      const result = await apiClientFetch<{ members: Member[] }>(`/workspaces/${activeId}/members`);
      setMembers(result.members);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    const activeId = workspace?.activeWorkspaceId ?? workspace?.workspaces[0]?.id;
    if (!activeId || !email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiClientFetch(`/workspaces/${activeId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setEmail("");
      setMessage("Member added to this project.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Unable to add member");
    } finally {
      setBusy(false);
    }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiClientFetch("/workspaces/users", {
        method: "POST",
        body: JSON.stringify({ email: newUserEmail.trim(), password: newUserPassword }),
      });
      setNewUserEmail("");
      setNewUserPassword("");
      setMessage("User account created. Add it to this project below.");
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Unable to create user account");
    } finally {
      setBusy(false);
    }
  }

  const active = workspace?.activeWorkspaceId ?? workspace?.workspaces[0]?.id;
  const canManage = Boolean(workspace?.isPlatformOwner || workspace?.workspaces.find((item) => item.id === active && (item.role === "OWNER" || item.role === "ADMIN")));

  if (!workspace || !active) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Project members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{member.user.email}</span>
              <span className="text-xs text-muted-foreground">{member.user.isPlatformOwner ? "Platform owner" : member.role}</span>
            </div>
          ))}
        </div>
        {canManage && (
          <form onSubmit={addMember} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="member-email">Existing user email</Label>
              <Input id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Role</Label>
              <select id="member-role" value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "MEMBER")} className="h-10 rounded-md border bg-background px-3 text-sm">
                {workspace.isPlatformOwner && <option value="ADMIN">Admin</option>}
                <option value="MEMBER">Member</option>
              </select>
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add member"}</Button>
          </form>
        )}
        {workspace.isPlatformOwner && (
          <form onSubmit={createUser} className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-email">Create user account</Label>
              <Input id="new-user-email" type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="person@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-password">Temporary password</Label>
              <Input id="new-user-password" type="password" minLength={8} value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} required />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
          </form>
        )}
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <p className="text-xs text-muted-foreground">Project admins can add existing accounts. The platform owner can create accounts and then add them to projects.</p>
      </CardContent>
    </Card>
  );
}
