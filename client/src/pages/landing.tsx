import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";

import whspr_white from "@assets/whspr_white.png";

import whspr_white__1_ from "@assets/whspr_white (1).png";

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-300 to-dark-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-2xl">
            <img 
              src={whspr_white__1_} 
              alt="Whspr Logo" 
              className="w-12 h-12"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Whspr
          </h1>
          <p className="text-gray-400 mt-2">Personalized sleep music & affirmations</p>
        </div>

        {/* Auth Form */}
        <GlassmorphismCard className="p-6 animate-slide-up">
          <div className="mb-6">
            <div className="flex bg-dark-600 rounded-lg p-1 mb-6">
              <Button
                onClick={() => setIsLogin(true)}
                variant={isLogin ? "default" : "ghost"}
                className={`flex-1 ${isLogin ? "bg-primary-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Sign In
              </Button>
              <Button
                onClick={() => setIsLogin(false)}
                variant={!isLogin ? "default" : "ghost"}
                className={`flex-1 ${!isLogin ? "bg-primary-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Register
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={() => window.location.href = '/api/login'}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>

            <div className="mt-6">
              <a href="#" className="text-primary-400 hover:text-primary-300 text-sm">
                Forgot password?
              </a>
            </div>
          </div>
        </GlassmorphismCard>
      </div>
    </div>
  );
}
