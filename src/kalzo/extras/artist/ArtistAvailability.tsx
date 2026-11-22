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
    setBusyDay(day.weekday);
    setErr("");
    const res = await api.availability.setDay({
      weekday: day.weekday,
      day: day.day.toLowerCase(),
      isActive,
    });
    setBusyDay(null);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    await load();
  };

  return (
    <section className="ka-availability">
      <div className="ka-section-title">
        <CalendarDays size={26} />
        <h2>Weekly availability</h2>
      </div>
      <p className="kl-note">
        Recurring weekly schedule — days marked available are bookable by customers across all future dates.
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
              <th scope="col">Available</th>
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
                    {d.isActive ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td>
                  <div className="ka-availability-switch">
                    <Switch
                      checked={d.isActive}
                      disabled={busyDay === d.weekday}
                      aria-label={`${d.day} ${d.isActive ? "available" : "unavailable"}`}
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
