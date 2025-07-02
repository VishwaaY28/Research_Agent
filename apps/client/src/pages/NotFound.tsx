import { FiSearch } from 'react-icons/fi';

const NotFound: React.FC = () => (
  <main className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white">
    <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center border border-gray-100">
      <FiSearch className="w-12 h-12 text-primary mb-4" />
      <h1 className="text-3xl font-bold text-black mb-2">Page Not Found</h1>
      <p className="text-neutral-600 mb-6">
        Sorry, we couldn't find the page you were looking for.
      </p>
      <a
        href="/"
        className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
      >
        Go Home
      </a>
    </div>
  </main>
);

export default NotFound;
