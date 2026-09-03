import { createContext, useContext, useEffect, useState } from "react";
import { wordCount, type Note } from "./notes";

const TICK_MS = 1000;

type DashboardValue = {
  readonly notes: readonly Note[];
  readonly nowMs: number;
};

const DashboardContext = createContext<DashboardValue | null>(null);

const useDashboard = (): DashboardValue => {
  const value = useContext(DashboardContext);
  if (value === null)
    throw new Error("useDashboard used outside the dashboard");
  return value;
};

export type TagTotal = {
  readonly tag: string;
  readonly notes: number;
  readonly words: number;
};

export const tagTotals = (notes: readonly Note[]): readonly TagTotal[] => {
  const tags = [...new Set(notes.flatMap((note) => note.tags))].sort();
  return tags.map((tag) => {
    const tagged = notes.filter((note) => note.tags.includes(tag));
    return {
      tag,
      notes: tagged.length,
      words: tagged.reduce((total, note) => total + wordCount(note), 0),
    };
  });
};

const SessionClock = () => {
  const { nowMs } = useDashboard();
  return <p>Live at {new Date(nowMs).toISOString().slice(11, 19)}</p>;
};

const TagBreakdown = () => {
  const { notes } = useDashboard();
  return (
    <ul>
      {tagTotals(notes).map((total) => (
        <li key={total.tag}>
          {total.tag} — {total.notes} notes, {total.words} words
        </li>
      ))}
    </ul>
  );
};

type DashboardProps = {
  readonly notes: readonly Note[];
};

export const Dashboard = ({ notes }: DashboardProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <DashboardContext.Provider value={{ notes, nowMs }}>
      <section>
        <h1>Team dashboard</h1>
        <SessionClock />
        <TagBreakdown />
      </section>
    </DashboardContext.Provider>
  );
};
