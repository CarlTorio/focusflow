import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AlarmProvider } from "@/contexts/AlarmContext";
import { NudgeProvider } from "@/contexts/NudgeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AlarmNotificationBanner } from "@/components/alarms/AlarmNotificationBanner";
import { NudgeBanner } from "@/components/nudges/NudgeBanner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Hub from "./pages/Hub";
import Planner from "./pages/Planner";
import AddTask from "./pages/AddTask";
import Alarm from "./pages/Alarm";
import AddAlarm from "./pages/AddAlarm";
import Notes from "./pages/Notes";
import Breathing from "./pages/Breathing";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

import { initOfflineSync } from "@/lib/offlineStorage";

const queryClient = new QueryClient();

// Initialize offline sync - will auto-sync pending mutations when back online
initOfflineSync(() => {
  queryClient.invalidateQueries();
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <AlarmProvider>
              <NudgeProvider>
                <AlarmNotificationBanner />
                <NudgeBanner />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/hub" element={<Hub />} />
                    <Route path="/planner" element={<Planner />} />
                    <Route path="/add-task" element={<AddTask />} />
                    <Route path="/alarm" element={<Alarm />} />
                    <Route path="/alarm/add" element={<AddAlarm />} />
                    <Route path="/alarm/edit/:id" element={<AddAlarm />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/breathing" element={<Breathing />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                  <Route path="/" element={<Navigate to="/hub" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NudgeProvider>
            </AlarmProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
