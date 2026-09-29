"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import dayjs from "dayjs";
import api from "@/lib/api";
import useStore from "@/lib/store";

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const STATUS_COLORS = {
  blue: { bg: "#E3F2FD", border: "#2196F3", text: "#1565C0" },
  green: { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32" },
  red: { bg: "#FFEBEE", border: "#F44336", text: "#C62828" },
  grey: { bg: "#F5F5F5", border: "#9E9E9E", text: "#616161" },
};

const VIEW_MODES = [
  { key: "day", label: "Day", days: 1 },
  { key: "work_week", label: "Work week", days: 5 },
  { key: "week", label: "Week", days: 7 },
];

function getWeekStart(date, mode) {
  if (mode === "day") return date;
  const d = dayjs(date);
  const day = d.day();
  if (mode === "work_week") {
    return d.subtract(day === 0 ? 6 : day - 1, "day");
  }
  return d.subtract(day, "day");
}

function getDates(startDate, mode) {
  const count = VIEW_MODES.find((v) => v.key === mode)?.days || 5;
  const start = getWeekStart(startDate, mode);
  return Array.from({ length: count }, (_, i) => start.add(i, "day"));
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function CalendarView() {
  const router = useRouter();
  const selectedDoctor = useStore((s) => s.selectedDoctor);
  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef(null);

  const dates = useMemo(
    () => getDates(currentDate, viewMode),
    [currentDate, viewMode],
  );

  useEffect(() => {
    if (!selectedDoctor?._id) return;
    setLoading(true);
    const startDate = dates[0].format("YYYY-MM-DD");
    const endDate = dates[dates.length - 1].format("YYYY-MM-DD");
    api
      .get(`/appointments/doctor/${selectedDoctor._id}/calendar`, {
        params: { startDate, endDate },
      })
      .then((res) => {
        setAppointments(res.data?.appointments || []);
      })
      .catch(() => {
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  }, [
    selectedDoctor?._id,
    dates[0]?.format("YYYY-MM-DD"),
    dates[dates.length - 1]?.format("YYYY-MM-DD"),
  ]);

  // Scroll to current time on mount
  useEffect(() => {
    if (gridRef.current) {
      const now = dayjs();
      const minutesSinceStart = (now.hour() - START_HOUR) * 60 + now.minute();
      const scrollTo = (minutesSinceStart / 60) * HOUR_HEIGHT - 100;
      gridRef.current.scrollTop = Math.max(0, scrollTo);
    }
  }, []);

  // Default to Day view on mobile screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("day");
    }
  }, []);

  const navigate = (dir) => {
    const days = VIEW_MODES.find((v) => v.key === viewMode)?.days || 5;
    setCurrentDate((prev) => prev.add(dir * days, "day"));
  };

  const goToday = () => setCurrentDate(dayjs());

  if (!selectedDoctor) {
    return (
      <div className="p-6 text-gray-400">
        Select a doctor from the sidebar to view the calendar.
      </div>
    );
  }

  const today = dayjs().format("YYYY-MM-DD");

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            style={{ borderColor: "var(--border)" }}
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiChevronRight size={20} />
          </button>
          <h3 className="text-lg font-semibold ml-2">
            {dates[0].format("MMMM YYYY")}
            {dates.length > 1 &&
              dates[0].month() !== dates[dates.length - 1].month() &&
              ` — ${dates[dates.length - 1].format("MMMM YYYY")}`}
          </h3>
        </div>
        <div
          className="flex border rounded-md overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setViewMode(m.key)}
              className="px-3 py-1.5 text-sm"
              style={{
                background: viewMode === m.key ? "var(--primary)" : "white",
                color: viewMode === m.key ? "white" : "#555",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontally scrollable: column headers + grid */}
      <div className="flex-1 overflow-x-auto flex flex-col min-h-0">
        <div className="min-w-125 flex-1 flex flex-col">
          {/* Column headers */}
          <div
            className="flex border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-16 shrink-0" />
            {dates.map((d) => {
              const isToday = d.format("YYYY-MM-DD") === today;
              return (
                <div
                  key={d.format()}
                  className="flex-1 text-center py-2 border-l"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="text-xs text-gray-500 uppercase">
                    {d.format("ddd")}
                  </div>
                  <div
                    className={`text-lg font-semibold ${isToday ? "text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}
                    style={isToday ? { background: "var(--primary)" } : {}}
                  >
                    {d.format("D")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto relative" ref={gridRef}>
            <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {/* Time labels */}
              <div className="w-16 shrink-0 relative">
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute text-xs text-gray-400 right-2"
                    style={{ top: i * HOUR_HEIGHT - 6 }}
                  >
                    {dayjs()
                      .hour(START_HOUR + i)
                      .minute(0)
                      .format("h A")}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {dates.map((d) => {
                const dateStr = d.format("YYYY-MM-DD");
                const dayAppts = appointments.filter((a) => {
                  const apptDate = dayjs(a.date).format("YYYY-MM-DD");
                  return apptDate === dateStr;
                });

                return (
                  <div
                    key={dateStr}
                    className="flex-1 relative border-l"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Hour gridlines */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-t"
                        style={{
                          top: i * HOUR_HEIGHT,
                          borderColor: "#f0f0f0",
                        }}
                      />
                    ))}
                    {/* Half-hour gridlines */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute w-full border-t border-dashed"
                        style={{
                          top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                          borderColor: "#f5f5f5",
                        }}
                      />
                    ))}

                    {/* Appointments */}
                    {dayAppts.map((a) => {
                      const mins = timeToMinutes(a.time);
                      const topOffset =
                        ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                      const duration = 58;
                      const height = (duration / 60) * HOUR_HEIGHT;
                      const STATUS_COLOR_MAP = {
                        booked: "blue",
                        scheduled: "blue",
                        completed: "green",
                        cancelled: "red",
                      };

                      // then in the appointment render:
                      const colorKey = STATUS_COLOR_MAP[a.status] || "blue";
                      const colors = STATUS_COLORS[colorKey];

                      return (
                        <button
                          key={a._id}
                          onClick={() => router.push(`/appointments/${a._id}`)}
                          className="absolute left-1 right-1 rounded px-2 py-1 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
                          style={{
                            top: Math.max(0, topOffset),
                            height: Math.max(20, height),
                            background: colors.bg,
                            borderLeft: `3px solid ${colors.border}`,
                            color: colors.text,
                            zIndex: 10,
                          }}
                        >
                          {/* Top Row: Name + Badge */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="text-xs font-medium truncate">
                              {a.patient?.name || "Patient"}
                            </div>

                            {a.visit_type === "follow_up" && height > 25 && (
                              <span
                                className="flex-shrink-0 inline-flex items-center px-1 py-[1px] rounded-full text-white font-semibold"
                                style={{
                                  fontSize: "7px",
                                  background: "#7B1FA2",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                Follow Up
                              </span>
                            )}
                          </div>

                          {/* Bottom Row: Show only if enough height */}
                          {height > 35 && (
                            <div className="text-[10px] truncate opacity-75 mt-[2px]">
                              {a.reason || a.time}
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Current time red line */}
                    {dateStr === today && <CurrentTimeLine />}
                  </div>
                );
              })}
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="text-gray-400">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTimeLine() {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const mins = now.hour() * 60 + now.minute();
  const top = ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top }}
    >
      <div className="relative">
        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
        <div className="w-full h-0.5 bg-red-500" />
      </div>
    </div>
  );
}
