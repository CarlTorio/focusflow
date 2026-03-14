export type NudgeType = 'task_start' | 'break' | 'overwhelm' | 'celebration' | 'end_of_day' | 'smart_suggestion';

export interface NudgeTemplate {
  type: NudgeType;
  title: string;
  message: string;
  emoji: string;
}

const taskStartTemplates = [
  { title: "Time to start!", message: "Uy, oras na para sa {taskName}. Ready ka na ba? 💪", emoji: "🚀" },
  { title: "Task waiting!", message: "Hey! {taskName} is waiting for you. Let's go! 🚀", emoji: "⏰" },
  { title: "Let's go!", message: "Time to start {taskName}! Kaya mo 'yan! ✨", emoji: "💪" },
  { title: "Ready?", message: "{taskName} is up next. Simulan na natin! 🎯", emoji: "🎯" },
  { title: "Focus time!", message: "It's go time for {taskName}. You got this! 🔥", emoji: "🔥" },
];

const breakTemplates = [
  { title: "Break time!", message: "{hours} hours ka na nagwo-work. Quick break muna? ☕", emoji: "☕" },
  { title: "Brain reset!", message: "Great focus! But your brain needs a reset. 5-minute break? 🧠", emoji: "🧠" },
  { title: "Stretch time!", message: "Solid work session! Time to stretch and breathe. 🌿", emoji: "🌿" },
  { title: "Pause muna!", message: "You've been going strong for {hours}h. Rest is productive too! 💆", emoji: "💆" },
  { title: "Quick rest!", message: "Amazing focus! A short break will recharge you. 🔋", emoji: "🔋" },
];

const overwhelmTemplates = [
  { title: "Let's simplify", message: "Mukhang heavy ang day mo. Gusto mo i-simplify? Pwede natin i-move ang iba sa bukas. 🤗", emoji: "🤗" },
  { title: "It's okay", message: "It's okay to adjust. Want me to help reschedule some tasks? 💙", emoji: "💙" },
  { title: "One at a time", message: "You have {count} overdue tasks. Let's tackle the most important one first? 🎯", emoji: "🎯" },
  { title: "No pressure", message: "Heavy day? Focus on just ONE thing. The rest can wait. 🌟", emoji: "🌟" },
];

const celebrationTemplates = [
  { title: "Nice work!", message: "Ang galing — {count} tasks done! Keep going! 🔥", emoji: "🔥" },
  { title: "On a roll!", message: "Another one done! You're on a roll! 🏆", emoji: "🏆" },
  { title: "Task complete!", message: "{taskName} ✓ — solid work! {remaining} tasks left for today.", emoji: "✅" },
  { title: "Milestone!", message: "{count} tasks completed! You're crushing it today! 💪", emoji: "💪" },
  { title: "PERFECT DAY!", message: "Lahat ng tasks tapos! Deserve mo magpahinga. 🎉🥳", emoji: "🎉" },
];

const endOfDayTemplates = [
  { title: "Day's recap", message: "Today: {completed}/{total} tasks done. {hours} hours worked. {mood}", emoji: "📊" },
  { title: "Well done!", message: "Another day in the books! {completed} tasks completed today. Rest well! 🌙", emoji: "🌙" },
];

const smartSuggestionTemplates = [
  { title: "Pattern spotted!", message: "Mas productive ka every {day} morning — try scheduling important tasks then? 📈", emoji: "📈" },
  { title: "Tip!", message: "You've been skipping some tasks. Try breaking them into smaller chunks? 🧩", emoji: "🧩" },
  { title: "Mood insight", message: "Your mood dips in the afternoon. Try scheduling a break at 2 PM? 🌤️", emoji: "🌤️" },
];

const templateMap: Record<NudgeType, typeof taskStartTemplates> = {
  task_start: taskStartTemplates,
  break: breakTemplates,
  overwhelm: overwhelmTemplates,
  celebration: celebrationTemplates,
  end_of_day: endOfDayTemplates,
  smart_suggestion: smartSuggestionTemplates,
};

export function getNudgeMessage(
  type: NudgeType,
  vars: Record<string, string | number> = {}
): NudgeTemplate & { type: NudgeType } {
  const templates = templateMap[type];
  const template = templates[Math.floor(Math.random() * templates.length)];
  let message = template.message;
  Object.entries(vars).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, String(value));
  });
  return { ...template, message, type };
}
