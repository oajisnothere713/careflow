import dayjs from "dayjs";

export const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

export const getAvatarColor = (name) => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-cyan-500",
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
};

export const formatTime = (time) => {
  if (!time) return "—";
  if (time.includes("T")) {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (time.includes(":")) {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const display = h % 12 || 12;
    return `${display}:${String(m).padStart(2, "0")} ${period}`;
  }
  return time;
};

export function fmt(date) {
  if (!date) return "—";
  return dayjs(date).format("MMM D, YYYY");
}

export function fmtTime(time) {
  return formatTime(time);
}
