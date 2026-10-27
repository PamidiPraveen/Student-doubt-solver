import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import type { Role } from "./api/types";
import { PublicOnly, RequireRole, RequireSession } from "./components/Guards";
import { Layout } from "./components/Layout";
import Doubts from "./pages/Doubts";
import { Forbidden, NotFound } from "./pages/Errors";
import Landing from "./pages/Landing";
import LibraryItemPage from "./pages/LibraryItemPage";
import LibraryPage from "./pages/LibraryPage";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import QuestionDetail from "./pages/QuestionDetail";
import Register from "./pages/Register";
import Ask from "./pages/student/Ask";
import FacultyHome from "./pages/faculty/FacultyHome";
import Dashboard from "./pages/student/Dashboard";
import MyQuestions from "./pages/student/MyQuestions";

/** Signed in, and (optionally) one of the given roles. */
function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  return (
    <RequireSession>
      <RequireRole roles={roles}>{children}</RequireRole>
    </RequireSession>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/forbidden" element={<Protected><Forbidden /></Protected>} />

        <Route path="/app" element={<Protected roles={["student"]}><Dashboard /></Protected>} />
        <Route path="/app/ask" element={<Protected roles={["student"]}><Ask /></Protected>} />
        <Route path="/app/questions" element={<Protected roles={["student"]}><MyQuestions /></Protected>} />
        <Route path="/faculty" element={<Protected roles={["faculty"]}><FacultyHome /></Protected>} />
        <Route path="/doubts" element={<Protected><Doubts /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/questions/:id" element={<Protected><QuestionDetail /></Protected>} />
        <Route path="/library" element={<Protected><LibraryPage /></Protected>} />
        <Route path="/library/:id" element={<Protected><LibraryItemPage /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
