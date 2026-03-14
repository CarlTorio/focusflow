import { useTheme, THEME_COLORS } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSection() {
  const { mode, setMode, themeColor, setThemeColor, intensity, setIntensity } = useTheme();

  const modes = [
    { value: "system" as const, label: "System", icon: Monitor },
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-5 w-5 text-primary" /> Theme & Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode selection */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mode</p>
          <div className="flex gap-2">
            {modes.map(m => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors",
                  mode === m.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                )}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color palette */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Theme Color</p>
          <div className="grid grid-cols-5 gap-2">
            {THEME_COLORS.map((color) => {
              const isSelected = themeColor === color.hsl;
              return (
                <button
                  key={color.hsl}
                  onClick={() => setThemeColor(color.hsl)}
                  className="group relative flex items-center justify-center rounded-xl p-0.5"
                  title={color.label}
                >
                  <div
                    className={cn(
                      "h-11 w-full rounded-lg transition-transform group-hover:scale-105",
                      isSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                    )}
                    style={{ backgroundColor: `hsl(${color.hsl})` }}
                  >
                    {isSelected && (
                      <div className="flex h-full items-center justify-center">
                        <Check className="h-4 w-4 text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Intensity slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Intensity</p>
            <span className="text-xs text-muted-foreground">{intensity}%</span>
          </div>
          <Slider
            value={[intensity]}
            onValueChange={([v]) => setIntensity(v)}
            min={20}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Pastel</span>
            <span>Vivid</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
