"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import { useUserStore } from "@/store/userStore";
import { User, CreditCard, Key, Zap, Eye, EyeOff, RotateCcw, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ProfileTab = () => {
    const { displayName, email, avatar } = useUserStore();
    return (
        <div className="space-y-8 max-w-2xl text-left">
            <div className="flex items-center gap-6 p-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-card">
                <div className="relative group cursor-pointer">
                    <div className="w-20 h-20 rounded-full border-2 border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-[var(--text-muted)] p-3" />}
                    </div>
                </div>
                <div className="space-y-1 text-left">
                    <h3 className="text-xl font-jakarta font-bold text-[var(--text-primary)]">{displayName || "User Name"}</h3>
                    <p className="text-[var(--text-muted)] font-inter text-sm">{email}</p>
                </div>
            </div>

            <div className="space-y-4 text-left">
                <div className="space-y-2">
                    <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Display Name</label>
                    <input
                        defaultValue={displayName || ""}
                        className="input"
                    />
                </div>
                <button className="btn-primary">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

const BillingTab = () => {
    const { credits, plan, topUpCredits } = useUserStore();
    return (
        <div className="space-y-8 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-card space-y-3">
                    <label className="text-sm font-jakarta font-bold text-[var(--text-muted)]">Current Plan</label>
                    <h3 className="text-3xl font-jakarta font-extrabold text-[var(--text-primary)] uppercase tracking-tight">{plan}</h3>
                    <p className="text-[var(--text-muted)] text-sm font-inter">Active since May 2024</p>
                </div>
                <div className="p-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-card space-y-3 flex flex-col justify-between">
                    <label className="text-sm font-jakarta font-bold text-[var(--text-muted)]">Credits Remaining</label>
                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-jakarta font-extrabold text-[#F97316]">{credits}</span>
                            <Zap className="w-6 h-6 text-[#F97316] fill-[#F97316]" />
                        </div>
                        <button
                            onClick={() => topUpCredits(10)}
                            className="btn-primary text-sm py-2"
                        >
                            Buy Credits
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">Usage History</label>
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-card">
                    <table className="w-full text-left text-sm font-inter">
                        <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4 text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            <tr className="hover:bg-[rgba(249,115,22,0.06)] transition-colors">
                                <td className="px-6 py-4 text-[var(--text-primary)] font-medium">May 15, 2024</td>
                                <td className="px-6 py-4 text-[var(--text-secondary)]">Generated Pitch: Neon Protocol</td>
                                <td className="px-6 py-4 text-[#EF4444] font-bold text-right">-1</td>
                            </tr>
                            <tr className="hover:bg-[rgba(249,115,22,0.06)] transition-colors">
                                <td className="px-6 py-4 text-[var(--text-primary)] font-medium">May 12, 2024</td>
                                <td className="px-6 py-4 text-[var(--text-secondary)]">Generated Image: Void Gate</td>
                                <td className="px-6 py-4 text-[#EF4444] font-bold text-right">-1</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ApiTab = () => {
    const [showKey, setShowKey] = useState(false);
    return (
        <div className="space-y-8 max-w-2xl">
            <div className="p-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-card space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-jakarta font-bold text-[var(--text-primary)]">API Secret Key</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-12 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 flex items-center font-inter text-sm tracking-wide text-[var(--text-primary)] overflow-hidden">
                            {showKey ? "pf_live_728349281039485721034" : "••••••••••••••••••••••••••••••••"}
                        </div>
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="w-12 h-12 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[rgba(249,115,22,0.35)] transition-colors"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex-1 h-11 btn-primary text-sm">
                        Copy Key
                    </button>
                    <button className="flex items-center gap-2 h-11 px-5 border border-[var(--border)] text-[var(--text-muted)] font-inter text-sm rounded-xl hover:text-[var(--text-primary)] hover:border-[rgba(249,115,22,0.4)] hover:bg-[rgba(249,115,22,0.08)] transition-all">
                        <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'api'>('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'api', label: 'API Access', icon: Key },
    ] as const;

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-jakarta font-extrabold text-[var(--text-primary)] tracking-tight">Settings</h1>
                    <p className="text-[var(--text-muted)] font-inter text-base">Manage your account and subscription.</p>
                </div>

                <div className="space-y-8">
                    <div className="flex border-b border-[var(--border)] gap-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "pb-4 text-sm font-jakarta font-bold transition-all relative",
                                    activeTab === tab.id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[linear-gradient(135deg,#EF4444,#F97316)] rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="pt-2">
                        {activeTab === 'profile' && <ProfileTab />}
                        {activeTab === 'billing' && <BillingTab />}
                        {activeTab === 'api' && <ApiTab />}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
