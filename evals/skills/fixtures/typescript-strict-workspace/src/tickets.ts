export type Priority = "low" | "normal" | "high";

export type Ticket = {
  readonly id: string;
  readonly title: string;
  readonly priority: Priority;
  readonly status: "open" | "closed";
  readonly openedAt: string;
};

export const openTicket = (tickets: ReadonlyArray<Ticket>, ticket: Ticket): ReadonlyArray<Ticket> => [
  ...tickets,
  ticket,
];

export const closeTicket = (tickets: ReadonlyArray<Ticket>, id: string): ReadonlyArray<Ticket> =>
  tickets.map((ticket) => (ticket.id === id ? { ...ticket, status: "closed" } : ticket));

export const findTicket = (tickets: ReadonlyArray<Ticket>, id: string): Ticket | undefined =>
  tickets.find((ticket) => ticket.id === id);

export const openCount = (tickets: ReadonlyArray<Ticket>): number =>
  tickets.filter((ticket) => ticket.status === "open").length;
