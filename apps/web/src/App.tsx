import { Routes, Route } from "react-router-dom";
import { Landing } from "./screens/Landing";
import { CreateIncident } from "./screens/CreateIncident";
import { IncidentCanvas } from "./screens/IncidentCanvas";
import { PresentMode } from "./screens/PresentMode";
import { Postmortem } from "./screens/Postmortem";
import { RequireAuth } from "./components/RequireAuth";
import { CreateProject } from "./screens/CreateProject";
import { ProjectOverview } from "./screens/ProjectOverview";
import { TaskBoard } from "./screens/TaskBoard";
import { Whiteboard } from "./screens/Whiteboard";
import { PlanningDoc } from "./screens/PlanningDoc";
import { ProjectsDashboard } from "./screens/ProjectsDashboard";
import { Account } from "./screens/Account";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/projects" element={<RequireAuth><ProjectsDashboard /></RequireAuth>} />
      <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
      <Route path="/projects/new" element={<RequireAuth><CreateProject /></RequireAuth>} />
      <Route path="/projects/:id/overview" element={<RequireAuth><ProjectOverview /></RequireAuth>} />
      <Route path="/projects/:id/plan" element={<RequireAuth><PlanningDoc /></RequireAuth>} />
      <Route path="/projects/:id/tasks" element={<RequireAuth><TaskBoard /></RequireAuth>} />
      <Route path="/projects/:id/whiteboard" element={<RequireAuth><Whiteboard /></RequireAuth>} />
      <Route
        path="/incidents/new"
        element={
          <RequireAuth>
            <CreateIncident />
          </RequireAuth>
        }
      />
      <Route
        path="/incidents/:id"
        element={
          <RequireAuth>
            <IncidentCanvas />
          </RequireAuth>
        }
      />
      <Route
        path="/incidents/:id/postmortem"
        element={
          <RequireAuth>
            <Postmortem />
          </RequireAuth>
        }
      />
      <Route path="/present/:joinCode" element={<PresentMode />} />
    </Routes>
  );
}
