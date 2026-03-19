import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, FileText, Bell, Brain, Search, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface UserStat {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
  theme_mode: string | null;
  total_tasks: number;
  completed_tasks: number;
  total_notes: number;
  total_alarms: number;
  total_mood_entries: number;
  last_activity: string | null;
}

export default function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("admin_user_stats" as any)
        .select("*");

      if (!error && data) setUsers(data as unknown as UserStat[]);
      setLoading(false);
    };

    fetchUsers();
  }, [isAdmin]);

  if (adminLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/hub" replace />;

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      (u.email || "").toLowerCase().includes(term) ||
      (u.first_name || "").toLowerCase().includes(term) ||
      (u.last_name || "").toLowerCase().includes(term) ||
      (u.nickname || "").toLowerCase().includes(term)
    );
  });

  const totalTasks = users.reduce((s, u) => s + u.total_tasks, 0);
  const totalCompleted = users.reduce((s, u) => s + u.completed_tasks, 0);
  const totalNotes = users.reduce((s, u) => s + u.total_notes, 0);
  const activeUsers = users.filter((u) => u.last_activity).length;

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "Active Users", value: activeUsers, icon: TrendingUp, color: "text-success" },
    { label: "Total Tasks", value: totalTasks, icon: CheckCircle, color: "text-warning" },
    { label: "Total Notes", value: totalNotes, icon: FileText, color: "text-accent" },
  ];

  return (
    <div className="pb-20 md:pb-8">
      <MobileHeader title="Admin Dashboard" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground hidden md:block">
          Admin Dashboard
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-xl bg-secondary p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Registered Users ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">User</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium text-center">Tasks</th>
                      <th className="pb-3 pr-4 font-medium text-center">Notes</th>
                      <th className="pb-3 pr-4 font-medium text-center">Alarms</th>
                      <th className="pb-3 pr-4 font-medium text-center">Moods</th>
                      <th className="pb-3 pr-4 font-medium">Joined</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                              {((u.first_name || "")[0] || (u.email || "?")[0]).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {u.first_name || u.nickname || "—"} {u.last_name || ""}
                              </p>
                              {u.nickname && (
                                <p className="text-xs text-muted-foreground">@{u.nickname}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{u.email || "—"}</td>
                        <td className="py-3 pr-4 text-center">
                          <span className="font-medium text-foreground">{u.completed_tasks}</span>
                          <span className="text-muted-foreground">/{u.total_tasks}</span>
                        </td>
                        <td className="py-3 pr-4 text-center text-foreground">{u.total_notes}</td>
                        <td className="py-3 pr-4 text-center text-foreground">{u.total_alarms}</td>
                        <td className="py-3 pr-4 text-center text-foreground">{u.total_mood_entries}</td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="py-3">
                          {u.onboarding_completed ? (
                            <Badge variant="default" className="bg-success/10 text-success border-0 text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Onboarding
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
