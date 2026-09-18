import { useAuth } from './auth/AuthContext'
import AuthScreen from './components/AuthScreen'
import ReservationsScreen from './components/ReservationsScreen'
import './App.css'

function App() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <ReservationsScreen /> : <AuthScreen />
}

export default App
