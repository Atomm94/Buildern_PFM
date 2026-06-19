import { Navigate } from "react-router-dom";

// Landing redirect for authenticated users.
export default function Dashboard() {
    return <Navigate to="/projects" replace />;
}
