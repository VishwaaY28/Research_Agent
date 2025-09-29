import React from 'react';
import { FiArrowRight, FiCheckCircle, FiFileText } from 'react-icons/fi';

const Hero: React.FC<{ onGetStarted?: () => void }> = ({ onGetStarted }) => (
  <section className="relative pt-2 pb-6 md:pt-4 md:pb-8 overflow-hidden">
    <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-60 -z-10" />
    <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[80px] opacity-70 -z-10" />

    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16 items-center">
        <div className="md:col-span-6 max-w-2xl">
          <div className="inline-flex items-center px-3 py-1.5 mb-6 rounded-full bg-primary/10 text-primary font-medium text-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Authoring Tool
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            Create winning Documents with{' '}
            <span className="text-primary relative">
              AI precision
              <span className="absolute bottom-1 left-0 w-full h-3 bg-primary/15 -z-10 rounded"></span>
            </span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            Supercharge your document process with intelligent content reuse, AI-powered drafting,
            and seamless team collaboration—all in one platform.
          </p>

          <button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/25 hover:bg-primary-dark transition duration-300"
          >
            Get Started
            <FiArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>

        <div className="md:col-span-6 relative">
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="flex space-x-2 mr-4">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex items-center bg-white rounded-md px-4 py-1.5 flex-grow border border-gray-200">
                  <FiFileText className="text-primary mr-2" />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    Hexaware Tehnologies - Service Proposal
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Executive Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    This proposal outlines a comprehensive solution for Acme Corp's digital
                    transformation needs, focusing on improved efficiency, scalability, and ROI
                    within the first 6 months of implementation...
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Proposed Approach</h3>
                <div className="space-y-3">
                  {['Discovery & Analysis', 'Solution Design', 'Implementation'].map((phase) => (
                    <div key={phase} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <FiCheckCircle className="text-primary" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700">{phase}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-gray-500">
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                    AI Generated
                  </span>
                </div>
                <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow-md hover:bg-primary-dark transition">
                  Export as DOCX
                </button>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 -right-24 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl -z-10"></div>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
