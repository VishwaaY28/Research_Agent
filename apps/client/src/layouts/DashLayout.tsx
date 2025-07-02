import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from "../components/dashboard/Sidebar";

const DashLayout: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default DashLayout;