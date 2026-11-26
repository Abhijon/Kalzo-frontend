import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api, unwrapData } from "@/lib/api";

type Day = {
  id: string;
  weekday: number;
  day: string;
  isActive: boolean;
};

export function ArtistAvailability() {
  const [days, setDays] = useState<Day[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyDay, setBusyDay] = useState<number | null>(null);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.availability.mine();
      if (res.error) {
        setErr(res.error.message);
        return;
      }
      const data = unwrapData(res.data) as { days?: Day[] };
      setDays(Array.isArray(data?.days) ? data.days : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (day: Day, isActive: boolean) => {
    // Optimistic toggle: update UI immediately without reloading or flickering the table
    const prevDays = days;
    setDays((current) =>
      current.map((d) => (d.weekday === day.weekday ? { ...d, isActive } : d)),
    );
    setBusyDay(day.weekday);
    setErr("");

    try {
      const res = await api.availability.setDay({
        weekday: day.weekday,
        day: day.day.toLowerCase(),
        isActive,
      });

      if (res.error) {
        // Revert on error
        setDays(prevDays);
        setErr(res.error.message || "Failed to update availability.");
      }
    } catch (e) {
      // Revert on error
      setDays(prevDays);
      setErr(e instanceof Error ? e.message : "Failed to update availability.");
    } finally {
      setBusyDay(null);
    }
  };

  return (
    <section className="ka-availability">
      <div className="ka-section-title">
        <CalendarDays size={26} />
        <h2>Weekly availability</h2>
      </div>
      <p className="kl-note">
        Recurring weekly schedule — days marked open are bookable by customers across all future dates.
      </p>
      {err && <p className="kl-error">{err}</p>}

      {loading ? (
        <p className="kl-note">Loading your weekly schedule…</p>
      ) : days.length === 0 ? (
        <p className="kl-note">No availability schedule found. Please refresh the page.</p>
      ) : (
        <div className="ka-availability-table-wrap">
        <table className="ka-availability-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Status</th>
              <th scope="col">Availability</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr
                key={d.weekday}
                className={d.isActive ? "ka-weekday-open" : "ka-weekday-closed"}
              >
                <td>
                  <strong>{d.day}</strong>
                </td>
                <td>
                  <span className={d.isActive ? "ka-avail-pill open" : "ka-avail-pill closed"}>
                    {d.isActive ? "Open" : "Booked"}
                  </span>
                </td>
                <td>
                  <div className="ka-availability-switch">
                    <Switch
                      checked={d.isActive}
                      disabled={busyDay === d.weekday}
                      aria-label={`${d.day} ${d.isActive ? "open" : "booked"}`}
                      onCheckedChange={(checked) => void toggle(d, checked)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
