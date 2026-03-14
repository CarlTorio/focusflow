import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function AboutSection() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground text-heading">FocusFlow</h3>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-3.5 w-3.5 fill-destructive text-destructive" /> for ADHD brains
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <a href="#" className="rounded-xl p-2.5 text-center text-sm text-muted-foreground hover:text-foreground">Support</a>
          <a href="#" className="rounded-xl p-2.5 text-center text-sm text-muted-foreground hover:text-foreground">Documentation</a>
          <a href="#" className="rounded-xl p-2.5 text-center text-sm text-muted-foreground hover:text-foreground">Leave a Review</a>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20"
        >
          <LogOut className="h-5 w-5" /> Logout
        </Button>
      </CardContent>
    </Card>
  );
}
