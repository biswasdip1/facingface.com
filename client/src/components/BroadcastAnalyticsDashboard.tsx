import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Mail, Eye, MousePointerClick } from "lucide-react";

interface BroadcastAnalyticsDashboardProps {
  broadcasts: any[];
}

export default function BroadcastAnalyticsDashboard({
  broadcasts,
}: BroadcastAnalyticsDashboardProps) {
  const stats = useMemo(() => {
    if (!broadcasts.length) {
      return {
        totalBroadcasts: 0,
        totalRecipients: 0,
        totalDelivered: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
      };
    }

    let totalRecipients = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalClicks = 0;

    broadcasts.forEach((broadcast) => {
      if (broadcast.analytics) {
        totalRecipients += broadcast.analytics.totalRecipients || 0;
        totalDelivered += broadcast.analytics.deliveredCount || 0;
        totalRead += broadcast.analytics.readCount || 0;
        totalClicks += broadcast.analytics.clickCount || 0;
      }
    });

    const avgOpenRate =
      totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : 0;
    const avgClickRate =
      totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : 0;

    return {
      totalBroadcasts: broadcasts.length,
      totalRecipients,
      totalDelivered,
      avgOpenRate: parseFloat(String(avgOpenRate)),
      avgClickRate: parseFloat(String(avgClickRate)),
    };
  }, [broadcasts]);

  // Prepare data for charts
  const broadcastChartData = useMemo(() => {
    return broadcasts
      .filter((b) => b.analytics)
      .map((b) => ({
        name: b.title.substring(0, 15),
        recipients: b.analytics.totalRecipients,
        delivered: b.analytics.deliveredCount,
        read: b.analytics.readCount,
        clicks: b.analytics.clickCount,
      }))
      .slice(-10); // Last 10 broadcasts
  }, [broadcasts]);

  const engagementData = useMemo(() => {
    const totalDelivered = stats.totalDelivered;
    const totalRead = broadcasts.reduce(
      (sum, b) => sum + (b.analytics?.readCount || 0),
      0
    );
    const totalClicks = broadcasts.reduce(
      (sum, b) => sum + (b.analytics?.clickCount || 0),
      0
    );
    const unread = totalDelivered - totalRead;

    return [
      { name: "Read", value: totalRead, fill: "#10b981" },
      { name: "Unread", value: unread, fill: "#6b7280" },
    ];
  }, [broadcasts, stats]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit,
  }: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    unit?: string;
  }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {value}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
        <Icon size={24} className="text-[var(--its-red)] opacity-70" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Mail}
          label="Total Broadcasts"
          value={stats.totalBroadcasts}
        />
        <StatCard
          icon={Users}
          label="Total Recipients"
          value={stats.totalRecipients}
        />
        <StatCard
          icon={Mail}
          label="Delivered"
          value={stats.totalDelivered}
        />
        <StatCard
          icon={Eye}
          label="Avg Open Rate"
          value={stats.avgOpenRate}
          unit="%"
        />
        <StatCard
          icon={MousePointerClick}
          label="Avg Click Rate"
          value={stats.avgClickRate}
          unit="%"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast Performance */}
        {broadcastChartData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={16} />
              Recent Broadcast Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={broadcastChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--its-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--its-bg-secondary)",
                    border: "1px solid var(--its-border)",
                  }}
                />
                <Legend />
                <Bar dataKey="delivered" fill="#3b82f6" />
                <Bar dataKey="read" fill="#10b981" />
                <Bar dataKey="clicks" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Engagement Pie Chart */}
        {engagementData[0].value + engagementData[1].value > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Eye size={16} />
              Overall Engagement
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Table */}
      {broadcasts.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold mb-4">All Broadcasts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-bold">Title</th>
                  <th className="text-right py-2 px-3 font-bold">Recipients</th>
                  <th className="text-right py-2 px-3 font-bold">Delivered</th>
                  <th className="text-right py-2 px-3 font-bold">Read</th>
                  <th className="text-right py-2 px-3 font-bold">Clicks</th>
                  <th className="text-right py-2 px-3 font-bold">Open Rate</th>
                  <th className="text-right py-2 px-3 font-bold">CTR</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts
                  .filter((b) => b.analytics)
                  .map((broadcast) => (
                    <tr
                      key={broadcast.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-2 px-3 truncate">{broadcast.title}</td>
                      <td className="text-right py-2 px-3">
                        {broadcast.analytics.totalRecipients}
                      </td>
                      <td className="text-right py-2 px-3">
                        {broadcast.analytics.deliveredCount}
                      </td>
                      <td className="text-right py-2 px-3">
                        {broadcast.analytics.readCount}
                      </td>
                      <td className="text-right py-2 px-3">
                        {broadcast.analytics.clickCount}
                      </td>
                      <td className="text-right py-2 px-3">
                        {broadcast.analytics.openRate.toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-3">
                        {broadcast.analytics.clickRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
