import { pgTable, uuid, text, timestamp, integer, primaryKey, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  githubLogin: text("github_login").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").notNull(),
    joinCode: text("join_code").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameCheck: check("projects_name_check", sql`length(trim(${table.name})) > 0`),
  })
);

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
    roleCheck: check("project_members_role_check", sql`${table.role} in ('owner', 'editor', 'viewer')`),
  })
);

export const projectInvites = pgTable("project_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  role: text("role").notNull().default("editor"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("backlog"),
    position: integer("position").notNull().default(0),
    assigneeId: uuid("assignee_id"),
    dueLabel: text("due_label"),
    githubUrl: text("github_url"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCheck: check("tasks_status_check", sql`${table.status} in ('backlog', 'doing', 'blocked', 'done')`),
  })
);
