'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    MapIcon,
    CubeIcon,
    ChartBarIcon,
    Cog6ToothIcon
} from '@/components/Icons';

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Room Map', href: '/rooms', icon: MapIcon },
    { name: 'Assets', href: '/assets', icon: CubeIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 text-white flex flex-col shadow-2xl">
            <div className="p-6 border-b border-blue-800/30">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-bold">BT</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            BLE Tracker
                        </h1>
                        <p className="text-blue-300 text-xs">Asset Monitoring</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`
                                flex items-center px-4 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                                    : 'text-blue-200 hover:bg-white/10 hover:text-white hover:scale-102'
                                }
                            `}
                        >
                            <item.icon className="h-5 w-5 mr-3" />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-blue-800/30 bg-black/20">
                <div className="text-xs text-blue-300">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>System Online</span>
                    </div>
                    <div className="text-blue-400/60">Version 1.0.0</div>
                </div>
            </div>
        </div>
    );
}
