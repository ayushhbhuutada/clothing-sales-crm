import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  Sparkles,
  Award,
  Calendar,
  AlertCircle,
  Clock,
  Cake,
  Heart,
  Phone,
  MessageCircle,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { KpiData, RepPerformance, Customer } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsDashboardProps {
  onOpenCustomerProfile: (customerId: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  onOpenCustomerProfile
}) => {
  const { currentBranch } = useAuth();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [reps, setReps] = useState<RepPerformance[]>([]);
  const [trends, setTrends] = useState<{
    categories: { category: string; count: number; total_revenue: number }[];
    sizes: { size: string; count: number }[];
    colors: { color: string; count: number }[];
    fabrics: { fabric: string; count: number }[];
    topSpenders: Customer[];
  } | null>(null);

  const [radar, setRadar] = useState<{
    scheduledFollowUps: any[];
    lapsedCustomers: any[];
    upcomingCelebrations: any[];
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [kpiRes, repRes, trendRes, radarRes] = await Promise.all([
        api.getKpis(currentBranch?.id),
        api.getRepPerformance(currentBranch?.id),
        api.getTrends(),
        api.getRemindersAndLapsed()
      ]);
      setKpis(kpiRes);
      setReps(repRes);
      setTrends(trendRes);
      setRadar(radarRes);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentBranch?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Dashboard Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold font-serif text-stone-900">
            Store Performance & Retention Radar
          </h1>
          <p className="text-xs text-stone-500">
            Conversion funnel, sales stylist leaderboards, inventory demand signals, and lapsed VIP customer re-engagement.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="text-xs text-stone-500 hover:text-stone-900 self-start sm:self-auto"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
              <span>Conversion Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
              {kpis.conversionRate}%
            </div>
            <div className="text-xs text-stone-500">
              {kpis.closedSaleLeads} sales from {kpis.totalLeads} assigned leads
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
              <span>Total Store Revenue</span>
              <ShoppingBag className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
              ₹{(kpis.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-stone-500">
              Avg Order Value: ₹{(kpis.avgOrderValue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
              <span>Footfall & Walk-ins</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
              {kpis.totalVisits}
            </div>
            <div className="text-xs text-stone-500">
              Across {kpis.totalCustomers} registered customer profiles
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
              <span>Live Floor Leads</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
              {kpis.activeLeads} Active
            </div>
            <div className="text-xs text-stone-500">
              Currently engaging in trial & fitting rooms
            </div>
          </div>

        </div>
      )}

      {/* Sales Rep Leaderboard (Spec 4.10) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Sales Stylist Performance Leaderboard
            </h2>
          </div>
          <span className="text-xs text-stone-400">Sorted by closed conversions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Sales Representative</th>
                <th className="py-3 px-4">Specialty</th>
                <th className="py-3 px-4 text-center">Leads Handled</th>
                <th className="py-3 px-4 text-center text-emerald-700">Sales Closed</th>
                <th className="py-3 px-4 text-center">Conversion %</th>
                <th className="py-3 px-4 text-right">Attributed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reps.map((rep, idx) => (
                <tr key={rep.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3.5 px-4 flex items-center space-x-3">
                    <span className={`w-5 text-center font-bold font-mono text-xs ${idx === 0 ? 'text-amber-500' : 'text-stone-400'}`}>
                      #{idx + 1}
                    </span>
                    <img
                      src={rep.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                      alt={rep.name}
                      className="w-8 h-8 rounded-full object-cover shadow-2xs"
                    />
                    <div>
                      <div className="font-bold text-stone-900">{rep.name}</div>
                      <div className="text-[10px] text-stone-400">{rep.status}</div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-stone-600 font-medium">{rep.specialty_category || 'Stylist'}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-stone-800">{rep.total_leads}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700">{rep.sales_closed}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold bg-stone-100 px-2 py-0.5 rounded-full text-stone-800">
                      {rep.conversion_rate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-brand-700 font-mono">
                    ₹{(rep.total_lead_revenue || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends & Fashion Signals (Spec 4.10) */}
      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Top Categories */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Top Clothing Categories
            </h3>
            <div className="space-y-2">
              {trends.categories.map(c => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-800">{c.category}</span>
                  <span className="font-bold text-brand-700 font-mono">₹{c.total_revenue.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Sizes In Demand */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Top Sizes Requested
            </h3>
            <div className="flex flex-wrap gap-2">
              {trends.sizes.map(s => (
                <div key={s.size} className="bg-stone-50 border border-stone-200 p-2 rounded-xl text-xs flex items-center space-x-2">
                  <span className="font-bold text-stone-900">{s.size}</span>
                  <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded font-bold">
                    {s.count} billed
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Colors Liked */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Popular Color Palettes
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {trends.colors.map(col => (
                <span key={col.color} className="text-xs bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-xl text-stone-800 font-medium flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <span>{col.color}</span>
                </span>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Retention Radar: Lapsed Customers & Celebrations */}
      {radar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Lapsed Regular Spenders */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Lapsed Regular VIPs (&gt;30-45 Days Inactive)
                </h3>
              </div>
              <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                {radar.lapsedCustomers.length} VIPs
              </span>
            </div>

            <p className="text-xs text-stone-500">
              High-value customers who haven't visited recently. Reach out with new collection alerts.
            </p>

            <div className="space-y-2.5">
              {radar.lapsedCustomers.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => onOpenCustomerProfile(c.id)}
                  className="p-3 bg-stone-50 hover:bg-brand-50/50 rounded-2xl border border-stone-200 hover:border-brand-300 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-stone-900">{c.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 flex items-center space-x-2">
                      <span className="font-mono">+91 {c.phone_number}</span>
                      <span>•</span>
                      <span>Last: {c.last_visit_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-brand-700 font-mono">
                      ₹{(c.total_spend || 0).toLocaleString('en-IN')}
                    </span>
                    <a
                      href={`https://wa.me/91${c.phone_number}?text=Hello%20${encodeURIComponent(c.name)},%20we%20miss%20you%20at%20Aura%20Couture!%20Check%20out%20our%20new%20festive%20collection.`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
                      title="Send WhatsApp invite"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Celebrations & Follow-ups */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cake className="w-4 h-4 text-purple-500" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Upcoming Birthdays & Anniversaries
                </h3>
              </div>
              <span className="text-xs bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                Personalized Offers
              </span>
            </div>

            <p className="text-xs text-stone-500">
              Customers with upcoming special occasions. Send exclusive anniversary/birthday discounts.
            </p>

            <div className="space-y-2.5">
              {radar.upcomingCelebrations.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => onOpenCustomerProfile(c.id)}
                  className="p-3 bg-stone-50 hover:bg-purple-50/50 rounded-2xl border border-stone-200 hover:border-purple-300 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-stone-900">{c.name}</div>
                    <div className="text-[11px] text-purple-700 font-medium mt-0.5">
                      {c.dob ? `🎂 Birthday: ${c.dob}` : ''} {c.anniversary ? `💍 Anniversary: ${c.anniversary}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={`https://wa.me/91${c.phone_number}?text=Happy%20Celebrations%20${encodeURIComponent(c.name)}!%20Enjoy%20an%20exclusive%2015%%20anniversary%20curation%20at%20Aura%20Couture.`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
                      title="Send WhatsApp Greeting"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
