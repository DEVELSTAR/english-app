import React from 'react';
import { Navigate } from 'react-router-dom';

export default function TopicsPage() {
  return <Navigate to="/lessons?category=grammar-foundations" replace />;
}
