import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { AuthService, SavedCredential } from './services/mockBackend';
import AdminDashboard from './components/AdminDashboard';
import OwnerDashboard from './components/OwnerDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import { Lock, Mail, User as UserIcon, Scissors, ChevronRight, X, Phone, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loginMode, setLoginMode] = useState<'customer' | 'owner' | 'admin'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [salonId, setSalonId] = useState('');
  
  // Saved Credentials
  const [savedCreds, setSavedCreds] = useState<SavedCredential[]>([]);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) setUser(currentUser);
    refreshSavedCreds();
  }, []);

  // Clear inputs and errors when switching modes
  useEffect(() => {
    setErrorMessage('');
    setEmail('');
    setPassword('');
    setSalonId('');
  }, [loginMode]);

  const refreshSavedCreds = () => {
    setSavedCreds(AuthService.getSavedCredentials());
  };

  const currentViewSavedCreds = loginMode === 'admin' 
    ? [] 
    : savedCreds.filter(c => c.role === loginMode);

  const performLogin = async (mode: string, emailInput: string, passInput: string, salonIdInput: string) => {
    setIsLoading(true);
    setErrorMessage('');
    let loggedUser: User | null = null;
    try {
        if (mode === 'admin') {
          loggedUser = await AuthService.loginAdmin(emailInput, passInput);
          if (!loggedUser) setErrorMessage('Invalid Admin Credentials. Please check your username and password.');
        } else if (mode === 'owner') {
          loggedUser = await AuthService.loginOwner(salonIdInput, emailInput, passInput);
          if (!loggedUser) setErrorMessage('Invalid Credentials. Please check Salon ID, Phone, and Password.');
        } else {
          if (emailInput.includes('@')) {
              loggedUser = await AuthService.loginCustomer(emailInput);
          } else {
              setErrorMessage('Please enter a valid email address.');
          }
        }

        if (loggedUser) {
          setUser(loggedUser);
          setEmail(''); setPassword(''); setSalonId('');
          refreshSavedCreds();
        }
    } catch (e) {
        console.error(e);
        setErrorMessage("Login failed. Please check your connection or credentials.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (loginMode === 'customer') {
      if (!email.trim().endsWith('@gmail.com')) {
        setErrorMessage('Please enter a valid Gmail address (must end with @gmail.com).');
        return;
      }
    }

    if (loginMode === 'owner') {
      // For owner, 'email' state holds the phone number
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(email.trim())) {
        setErrorMessage('Please enter a valid 10-digit phone number.');
        return;
      }
      if (!salonId.trim()) {
        setErrorMessage('Salon ID is required.');
        return;
      }
    }

    if (loginMode !== 'customer' && !password.trim()) {
        setErrorMessage('Password is required.');
        return;
    }

    performLogin(loginMode, email, password, salonId);
  };

  const handleQuickLogin = (cred: SavedCredential) => {
    performLogin(cred.role, cred.email, cred.password || '', cred.salonId || '');
  };

  const removeSavedCred = (e: React.MouseEvent, cred: SavedCredential) => {
    e.stopPropagation();
    AuthService.removeCredential(cred.role, cred.role === 'owner' ? cred.salonId! : cred.email);
    refreshSavedCreds();
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setErrorMessage('');
    refreshSavedCreds();
  };

  const handleUserUpdate = () => {
    const updatedUser = AuthService.getCurrentUser();
    if (updatedUser) {
        setUser(updatedUser);
    }
  };

  if (user) {
    if (user.role === UserRole.ADMIN) return <AdminDashboard onLogout={handleLogout} />;
    if (user.role === UserRole.OWNER) return <OwnerDashboard user={user} onLogout={handleLogout} />;
    if (user.role === UserRole.CUSTOMER) return <CustomerDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?q=80&w=2000&auto=format&fit=crop")'}}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden m-4">
        {/* Login Tab Switcher */}
        <div className="flex border-b">
          <button onClick={() => setLoginMode('customer')} className={`flex-1 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${loginMode === 'customer' ? 'bg-white text-rose-600 border-b-2 border-rose-600' : 'bg-gray-50 text-gray-500'}`}>
            <UserIcon size={16} /> Customer
          </button>
          <button onClick={() => setLoginMode('owner')} className={`flex-1 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${loginMode === 'owner' ? 'bg-white text-rose-600 border-b-2 border-rose-600' : 'bg-gray-50 text-gray-500'}`}>
            <Scissors size={16} /> Owner
          </button>
          <button onClick={() => setLoginMode('admin')} className={`flex-1 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${loginMode === 'admin' ? 'bg-white text-rose-600 border-b-2 border-rose-600' : 'bg-gray-50 text-gray-500'}`}>
            <Lock size={16} /> Admin
          </button>
        </div>

        <div className="p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Welcome to Book My Salon</h1>
                <p className="text-gray-500 mt-2">
                    {loginMode === 'customer' && "Book your next glow up instantly."}
                    {loginMode === 'owner' && "Manage your salon efficiently."}
                    {loginMode === 'admin' && "System Administration."}
                </p>
            </div>

            {/* Quick Login Section */}
            {currentViewSavedCreds.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Recent Logins</p>
                <div className="space-y-3">
                  {currentViewSavedCreds.map((cred, idx) => (
                    <div key={idx} onClick={() => handleQuickLogin(cred)}
                        className="group flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 cursor-pointer transition relative">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                             ${cred.role === 'customer' ? 'bg-blue-400' : cred.role === 'owner' ? 'bg-rose-500' : 'bg-slate-700'}`}>
                             {(cred.name || cred.email).charAt(0).toUpperCase()}
                           </div>
                           <div className="text-left">
                             <p className="font-bold text-sm text-slate-800">{cred.name || cred.email}</p>
                             <p className="text-xs text-gray-500">{cred.role === 'owner' ? `ID: ${cred.salonId}` : cred.email}</p>
                           </div>
                        </div>
                        <div className="flex items-center">
                            <button onClick={(e) => removeSavedCred(e, cred)} className="p-2 text-gray-300 hover:text-red-500 transition mr-1">
                                <X size={14} />
                            </button>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-rose-500 transition"/>
                        </div>
                    </div>
                  ))}
                </div>
                
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium">OR LOGIN MANUALLY</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Error Display */}
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2 text-sm animate-pulse">
                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}
                
                {loginMode === 'owner' && (
                     <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input type="text" placeholder="Salon ID" value={salonId} onChange={e => {setSalonId(e.target.value); setErrorMessage('');}}
                            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition" />
                     </div>
                )}

                <div className="relative">
                    {/* Dynamic Icon and Placeholder based on login mode */}
                    {loginMode === 'owner' ? (
                       <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                    ) : (
                       <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                    )}
                    
                    <input 
                      type={loginMode === 'owner' ? "tel" : "text"}
                      placeholder={
                        loginMode === 'owner' ? "Owner Phone Number" : 
                        (loginMode === 'admin' ? "Username" : "Email Address")
                      } 
                      value={email} 
                      onChange={e => {setEmail(e.target.value); setErrorMessage('');}}
                      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition" 
                    />
                </div>

                {loginMode !== 'customer' && (
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input type="password" placeholder="Password" value={password} onChange={e => {setPassword(e.target.value); setErrorMessage('');}}
                            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition" />
                    </div>
                )}

                <button disabled={isLoading} type="submit" className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700 transition shadow-lg mt-6 flex justify-center disabled:opacity-70 disabled:cursor-not-allowed">
                    {isLoading ? "Logging in..." : (loginMode === 'customer' ? 'Continue with Email' : 'Login')}
                </button>
                
                {loginMode === 'customer' && (
                    <p className="text-xs text-center text-gray-400 mt-4">Simulating Google Login flow.</p>
                )}
            </form>
        </div>
      </div>
    </div>
  );
};

export default App;