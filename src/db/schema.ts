import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const electionSettings = pgTable("election_settings", {
  id: integer("id").primaryKey().default(1),
  schoolName: text("school_name").notNull().default("Rosmini Secondary School"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  administrationEmail: text("administration_email").notNull().default("administration@rosmini.sc.ug"),
  notificationSent: boolean("notification_sent").notNull().default(false),
  notificationSentAt: timestamp("notification_sent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  position: text("position").notNull(),
  name: text("name").notNull(),
  className: text("class_name").notNull(),
  tagline: text("tagline").notNull(),
  manifesto: text("manifesto").notNull(),
  accent: text("accent").notNull().default("#2a6fdb"),
  initials: text("initials").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    studentId: text("student_id").notNull(),
    candidateId: integer("candidate_id").notNull().references(() => candidates.id),
    position: text("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentPositionUnique: uniqueIndex("votes_student_position_idx").on(table.studentId, table.position),
  }),
);

export type ElectionSettings = typeof electionSettings.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Vote = typeof votes.$inferSelect;
