import React from 'react';
import { useNavigate } from 'react-router';
import Footer from '../components/common/Footer';
import Bento from '../components/home/Bento';
import Hero from '../components/home/Hero';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Hero onGetStarted={() => navigate('/auth')} />
      <Bento />
      <Footer />
    </div>
  );
};

export default Home;
