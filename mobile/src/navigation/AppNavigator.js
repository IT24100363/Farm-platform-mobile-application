import React from 'react';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import AdminNavigator from './AdminNavigator';
import CustomerNavigator from './CustomerNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import FarmerNavigator from './FarmerNavigator';
import GuestNavigator from './GuestNavigator';
import SplashScreen from '../screens/SplashScreen';

export default function AppNavigator() {
  const { booting, user, isAuthenticated } = useAuth();

  if (booting) return <SplashScreen />;
  if (!isAuthenticated) return <GuestNavigator />;
  if (user?.role === 'admin') return <AdminNavigator />;
  if (user?.role === 'farmer') return <FarmerNavigator />;
  if (user?.role === 'delivery') return <DeliveryNavigator />;
  return <CustomerNavigator />;
}
