/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { FiArrowRight, FiLock, FiMail, FiUser } from 'react-icons/fi';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const { login, register, error } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginSchema = z.object({
      email: z.string().email({ message: 'Invalid email address' }),
      password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
    });

    const registerSchema = z
      .object({
        name: z.string().min(1, { message: 'Name is required' }),
        email: z.string().email({ message: 'Invalid email address' }),
        password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });

    try {
      setLoading(true);
      if (isLogin) {
        loginSchema.parse({ email: formData.email, password: formData.password });
        await login(formData.email, formData.password);
      } else {
        registerSchema.parse(formData);
        await register(formData.name, formData.email, formData.password);
      }
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      if (err instanceof z.ZodError) {
        alert(err.errors[0]?.message || 'Validation error');
        return;
      }
      alert('An unexpected error occurred');
      return;
    }
  };

  return (
    <main className="relative w-screen h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-60 -z-10" />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[80px] opacity-70 -z-10" />
      <div className="absolute top-1/2 -right-24 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl -z-10" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl -z-10" />

      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
            {isLogin ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="text-gray-600">
            {isLogin
              ? 'Sign in to your account to continue creating winning proposals'
              : 'Create your account and start crafting professional proposals'}
          </p>
        </div>

        <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200"
                      placeholder="Confirm your password"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary-dark transition duration-200"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <div className="text-red-500 text-sm text-center">{error}</div>}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg font-medium shadow-lg shadow-primary/25 hover:bg-primary-dark transition duration-300"
                disabled={loading}
              >
                {loading
                  ? isLogin
                    ? 'Signing In...'
                    : 'Creating Account...'
                  : isLogin
                    ? 'Sign In'
                    : 'Create Account'}
                <FiArrowRight className="ml-2 w-5 h-5" />
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:text-primary-dark font-medium transition duration-200"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </main>
  );
};

export default Auth;
