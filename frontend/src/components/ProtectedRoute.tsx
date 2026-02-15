import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type ProtectedRouteProps = {
  token: string | null;
  children: ReactNode;
};

const ProtectedRoute = ({ token, children }: ProtectedRouteProps): JSX.Element => {
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
