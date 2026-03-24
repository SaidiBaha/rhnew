// src/modules/dashboard/utils/week.ts
function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function toYmd(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Lundi -> Dimanche
export function getWeekRangeFrom(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const day = d.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day + 6) % 7; // Monday=0
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
}

export function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function addWeeks(date: Date, weeks: number) {
    return addDays(date, weeks * 7);
}

export function buildWeekDays(monday: Date) {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(monday, i));
    return days;
}

export function dayLabelFR(d: Date) {
    const names = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return names[d.getDay()];
}