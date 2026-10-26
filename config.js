/*
  ============================================================
  ROUTINE PIE PLANNER - SETTINGS FILE
  This is the file to change when you want new colours,
  new doodles, or different starter blocks.
  After editing: save, upload to GitHub, refresh the app.
  ============================================================
*/

window.CONFIG = {

  /* ---------- COLOURS ----------
     Each colour has a name (any word, no spaces) and a hex code.
     To add one: copy a line, give it a new name and a new hex.
     Pick hex codes at https://htmlcolorcodes.com
     Keep "sky", "sun" and "pink" - the title doodles use them. */
  colors: [
    { name: "sky",    hex: "#a6d8f5" },
    { name: "sun",    hex: "#ffe37d" },
    { name: "orange", hex: "#ffc27f" },
    { name: "peach",  hex: "#ffb5a5" },
    { name: "pink",   hex: "#f7aacb" },
    { name: "lilac",  hex: "#d2c1f2" },
    { name: "violet", hex: "#ad9ff0" },
    { name: "mint",   hex: "#aee8c6" },
    { name: "leaf",   hex: "#cbe78f" },
    { name: "teal",   hex: "#94dbd3" },
    { name: "red",    hex: "#ff9898" },
    { name: "sand",   hex: "#ecd7ad" }
  ],

  /* ---------- DOODLES ----------
     Any emoji works. To add one, paste it inside quotes
     and put a comma after it. (Windows: press Win + . to open the emoji picker) */
  doodles: [
    "😴","🪥","🍳","☕","💻","📐","📚","✏️","⌨️","🧩","📝","🍛",
    "🍽️","🚶","🏃","🧘","🏸","💃","🎧","🎵","📖","🛒","🧹","🙏",
    "👨‍👩‍👧","📞","🚌","🎯","🌟","🎉","☀️","🌙","🥚","🍌","🥗","💧"
  ],

  /* ---------- STARTER PLAN ----------
     Shown only the very first time the app opens on a device
     (until you use "Load backup"). Your real plan lives
     inside your browser, not in this file. */
  starter: {
    v: 2, updatedAt: 0, name: "My", habitsSeeded: true,
    day: {
      notes: [{ id: "n1", t: "Tap + Add note for reminders" }],
      done: {}, hdone: {},
      slices: [
        { id: "d1", label: "Sleep", start: "23:00", end: "06:00", color: "sky", emoji: "😴", note: "", habits: [] },
        { id: "d2", label: "Wake up", start: "06:00", end: "07:00", color: "sun", emoji: "🪥", note: "", habits: [{ id: "h1", t: "Drink water" }] },
        { id: "d3", label: "Study", start: "07:00", end: "09:00", color: "violet", emoji: "📚", note: "", habits: [] },
        { id: "d4", label: "Work", start: "09:00", end: "13:00", color: "peach", emoji: "💻", note: "", habits: [] },
        { id: "d5", label: "Lunch", start: "13:00", end: "14:00", color: "leaf", emoji: "🍛", note: "", habits: [] },
        { id: "d6", label: "Work", start: "14:00", end: "18:00", color: "orange", emoji: "💻", note: "", habits: [] },
        { id: "d7", label: "Walk", start: "18:00", end: "19:00", color: "teal", emoji: "🚶", note: "", habits: [] },
        { id: "d8", label: "Dinner", start: "20:00", end: "21:00", color: "sand", emoji: "🍽️", note: "", habits: [] },
        { id: "d9", label: "Free time", start: "21:00", end: "23:00", color: "lilac", emoji: "🎧", note: "", habits: [] }
      ]
    },
    week: { notes: [], slices: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
      { id: "w" + i, label: d, title: "", color: ["violet","pink","sky","orange","red","leaf","sun"][i], emoji: "🌟", items: [] })) },
    month: { notes: [], slices: ["Week 1","Week 2","Week 3","Week 4","Days 29+"].map((d, i) => (
      { id: "m" + i, label: d, title: "", color: ["mint","sky","lilac","peach","sun"][i], emoji: "🎯", items: [] })) },
    year: { notes: [], slices: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((d, i) => (
      { id: "y" + i, label: d, title: "", color: ["sky","red","lilac","pink","orange","violet","teal","mint","leaf","sand","peach","sun"][i], emoji: "🌟", items: [] })) }
  }
};
