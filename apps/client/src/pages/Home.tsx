import React from 'react';
import { useNavigate } from 'react-router';
import logo from '../assets/HexawareBlueLogo 2.png';
import Footer from '../components/common/Footer';
import Bento from '../components/home/Bento';
import Hero from '../components/home/Hero';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex pt-10 pb-4">
        <img src={logo} alt="Logo" className="h-10 w-auto pl-10" />
      </div>
      <Hero onGetStarted={() => navigate('/auth')} />
      <Bento />
      <Footer />
    </div>
  );
};

export default Home;
