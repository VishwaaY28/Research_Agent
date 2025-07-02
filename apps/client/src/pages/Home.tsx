import React from 'react';
import Footer from '../components/common/Footer';
import Bento from '../components/home/Bento';
import Hero from '../components/home/Hero';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Hero />
      <Bento />
      <Footer />
    </div>
  );
};

export default Home;
