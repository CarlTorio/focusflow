import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, BorderStyle, WidthType, AlignmentType } from "docx";
import { saveAs } from "file-saver";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function makeHeaderCell(text: string, width: number) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "E8E8E8", type: "clear" as any },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial" })] })],
  });
}

function makeCell(text: string, width: number) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: text || "—", size: 20, font: "Arial" })] })],
  });
}

function buildTasksTable(tasks: any[]) {
  const colWidths = [2800, 1400, 1400, 1400, 1400];
  return new Table({
    width: { size: 8400, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ["Title", "Priority", "Status", "Due Date", "Completed"].map((h, i) => makeHeaderCell(h, colWidths[i])) }),
      ...tasks.map(t => new TableRow({
        children: [
          makeCell(t.title, colWidths[0]),
          makeCell(t.priority, colWidths[1]),
          makeCell(t.status, colWidths[2]),
          makeCell(t.due_date, colWidths[3]),
          makeCell(t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "No", colWidths[4]),
        ],
      })),
    ],
  });
}

function buildNotesTable(notes: any[]) {
  const colWidths = [2500, 1500, 2200, 2200];
  return new Table({
    width: { size: 8400, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ["Title", "Folder", "Created", "Updated"].map((h, i) => makeHeaderCell(h, colWidths[i])) }),
      ...notes.map(n => new TableRow({
        children: [
          makeCell(n.title, colWidths[0]),
          makeCell(n.folder, colWidths[1]),
          makeCell(n.created_at ? new Date(n.created_at).toLocaleDateString() : "", colWidths[2]),
          makeCell(n.updated_at ? new Date(n.updated_at).toLocaleDateString() : "", colWidths[3]),
        ],
      })),
    ],
  });
}

function buildAlarmsTable(alarms: any[]) {
  const colWidths = [3000, 2700, 2700];
  return new Table({
    width: { size: 8400, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ["Title", "Alarm Time", "Active"].map((h, i) => makeHeaderCell(h, colWidths[i])) }),
      ...alarms.map(a => new TableRow({
        children: [
          makeCell(a.title, colWidths[0]),
          makeCell(a.alarm_time ? new Date(a.alarm_time).toLocaleString() : "", colWidths[1]),
          makeCell(a.is_active ? "Yes" : "No", colWidths[2]),
        ],
      })),
    ],
  });
}

function buildSchedulesTable(schedules: any[]) {
  const colWidths = [2800, 1800, 1400, 2400];
  return new Table({
    width: { size: 8400, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: ["Title", "Date", "Hours", "Status"].map((h, i) => makeHeaderCell(h, colWidths[i])) }),
      ...schedules.map(s => new TableRow({
        children: [
          makeCell(s.display_title || "Untitled", colWidths[0]),
          makeCell(s.scheduled_date, colWidths[1]),
          makeCell(String(s.allocated_hours || 0), colWidths[2]),
          makeCell(s.status, colWidths[3]),
        ],
      })),
    ],
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })],
  });
}

function emptyNote(text: string) {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text, italics: true, size: 20, font: "Arial", color: "888888" })],
  });
}

export function DataPrivacySection() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    toast.info("Exporting your data...");

    try {
      const [tasks, notes, schedules, alarms] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("notes").select("*").eq("user_id", user.id),
        supabase.from("task_schedules").select("*").eq("user_id", user.id),
        supabase.from("alarms").select("*").eq("user_id", user.id),
      ]);

      const children: any[] = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "FocusFlow Data Export", bold: true, size: 36, font: "Arial" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: `Exported on ${new Date().toLocaleDateString()}`, size: 20, font: "Arial", color: "666666" })],
        }),
      ];

      // Tasks
      children.push(sectionHeading(`Tasks (${tasks.data?.length || 0})`));
      if (tasks.data?.length) children.push(buildTasksTable(tasks.data));
      else children.push(emptyNote("No tasks found."));

      // Notes
      children.push(sectionHeading(`Notes (${notes.data?.length || 0})`));
      if (notes.data?.length) children.push(buildNotesTable(notes.data));
      else children.push(emptyNote("No notes found."));

      // Schedules
      children.push(sectionHeading(`Schedules (${schedules.data?.length || 0})`));
      if (schedules.data?.length) children.push(buildSchedulesTable(schedules.data));
      else children.push(emptyNote("No schedules found."));

      // Alarms
      children.push(sectionHeading(`Alarms (${alarms.data?.length || 0})`));
      if (alarms.data?.length) children.push(buildAlarmsTable(alarms.data));
      else children.push(emptyNote("No alarms found."));

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children,
        }],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `focusflow-export-${new Date().toISOString().split("T")[0]}.docx`);
      toast.success("Data exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" /> Data & Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleExport} disabled={exporting} variant="outline" className="w-full justify-start gap-3 rounded-xl">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Exporting..." : "Export My Data (.docx)"}
        </Button>
      </CardContent>
    </Card>
  );
}
