import React from 'react';
import { BiHighlight } from 'react-icons/bi';
import { FiDownload, FiFolder, FiUpload, FiUsers, FiZap } from 'react-icons/fi';

const features = [
  {
    title: 'Smart Content Reuse',
    icon: <FiUpload className="w-6 h-6 text-primary" />,
    desc: 'Import content from past proposals, PDFs, Word docs, or web pages. No more starting from scratch.',
  },
  {
    title: 'Selective Highlighting',
    icon: <BiHighlight className="w-6 h-6 text-amber-500" />,
    desc: 'Pick only the sections you need. Build your proposal with the best content, fast.',
  },
  {
    title: 'Organized Workspaces',
    icon: <FiFolder className="w-6 h-6 text-blue-600" />,
    desc: 'Keep all your resources, drafts, and references in one place for each proposal.',
  },
  {
    title: 'AI-Powered Drafting',
    icon: <FiZap className="w-6 h-6 text-emerald-500" />,
    desc: 'Let AI generate sections like company intro or solution overview. Just give a prompt.',
  },
  {
    title: 'Effortless Export',
    icon: <FiDownload className="w-6 h-6 text-purple-500" />,
    desc: 'Export your finished proposal as a polished Word document, ready to send.',
  },
  {
    title: 'Collaboration Ready',
    icon: <FiUsers className="w-6 h-6 text-pink-500" />,
    desc: 'Work with your team in real time. Share, review, and refine together.',
  },
];

const Bento: React.FC = () => (
  <section className="py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50/50 relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--color-primary-rgb),0.1),transparent_70%),radial-gradient(ellipse_at_bottom_left,rgba(var(--color-primary-rgb),0.05),transparent_70%)] -z-10" />

    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
        <div className="inline-flex items-center px-3 py-1.5 mb-6 rounded-full bg-primary/10 text-primary font-medium text-sm">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
          Features
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-5">
          Everything you need to <span className="text-primary">craft winning proposals</span>
        </h2>
        <p className="text-lg text-gray-600">
          A complete toolkit that combines AI power with human creativity—designed to help your team
          create consistent, high-quality proposals in less time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className={`
              group relative bg-white rounded-2xl p-8 transition-all duration-300
              border border-gray-100 shadow-lg shadow-gray-200/50
              hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1
              flex flex-col
              ${index === 3 ? 'md:col-span-2 lg:col-span-1' : ''}
              ${index === 4 ? 'md:col-span-2 lg:col-span-2' : ''}
            `}
          >
            <div
              className="w-12 h-12 flex items-center justify-center rounded-xl mb-6
                        bg-gradient-to-br from-gray-50 to-gray-100
                        group-hover:from-primary/5 group-hover:to-primary/10
                        transition-colors duration-300"
            >
              {feature.icon}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-gray-600 mb-6 flex-grow">{feature.desc}</p>

            <div className="mt-auto">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <a href="#" className="inline-flex items-center text-sm font-medium text-primary">
                Learn more
                <svg
                  className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>

            {[3, 4].includes(index) && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent rounded-2xl -z-10"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Bento;
