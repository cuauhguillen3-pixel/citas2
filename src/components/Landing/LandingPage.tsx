import { ArrowRight, Calendar, Users, TrendingUp, Shield, Clock, Star, Menu } from 'lucide-react';
import { useState } from 'react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export default function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-pink-600">
                SalonManager
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={onLogin}
                className="text-gray-600 hover:text-rose-600 font-medium transition-colors px-4 py-2"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={onRegister}
                className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-2 rounded-full font-medium hover:from-rose-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
              >
                Registrarse
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 py-4 px-4 flex flex-col gap-4">
            <button
              onClick={onLogin}
              className="w-full text-left px-4 py-2 text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={onRegister}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Registrarse
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-rose-50 to-pink-100 overflow-hidden pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Gestiona tu Salón de Belleza con <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">Elegancia</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              La solución integral para estilistas y dueños de salones. 
              Controla citas, ventas y clientes en una sola plataforma intuitiva y moderna.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onRegister}
                className="group bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Comenzar Gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLogin}
                className="px-8 py-4 rounded-full text-lg font-semibold text-rose-600 bg-white border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30">
          <div className="absolute top-10 left-10 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-10 right-10 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-10 left-1/2 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que necesitas</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Herramientas diseñadas específicamente para potenciar tu negocio de belleza
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Calendar className="w-8 h-8 text-rose-500" />}
              title="Gestión de Citas"
              description="Agenda inteligente con recordatorios automáticos y prevención de conflictos."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-pink-500" />}
              title="Base de Clientes"
              description="Historial detallado, preferencias y seguimiento personalizado de cada cliente."
            />
            <FeatureCard 
              icon={<TrendingUp className="w-8 h-8 text-rose-600" />}
              title="Control Financiero"
              description="Reportes de ventas, comisiones y rendimiento del negocio en tiempo real."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-pink-600" />}
              title="Seguridad Total"
              description="Tus datos están encriptados y protegidos con los más altos estándares."
            />
            <FeatureCard 
              icon={<Clock className="w-8 h-8 text-rose-400" />}
              title="Ahorro de Tiempo"
              description="Automatiza tareas repetitivas y dedícate a lo que mejor sabes hacer."
            />
            <FeatureCard 
              icon={<Star className="w-8 h-8 text-pink-400" />}
              title="Experiencia Premium"
              description="Una interfaz hermosa y fácil de usar que encantará a tu equipo."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>© 2024 Salon Manager. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 bg-rose-50 w-16 h-16 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
