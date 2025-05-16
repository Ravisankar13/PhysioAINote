import { Navigate, Outlet } from 'react-router-dom';

const RouteProtection = () => {
  const token = localStorage.getItem('jwtToken');
  return token ? <Outlet /> : <Navigate to="/" replace />;
};

export default RouteProtection;