"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Landmark, 
  TrendingUp,
  XCircle
} from "lucide-react";
import { Contract } from "@/lib/types";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Sector
} from "recharts";

interface FundingOverviewProps {
  contracts: Contract[];
  selectedChannel: string;
  onSelectChannel: (channel: string) => void;
}

export function FundingOverview({ contracts, selectedChannel, onSelectChannel }: FundingOverviewProps) {
  const stats = useMemo(() => {
    const channelMap: Record<string, { name: string; totalBudget: number; totalPaid: number; contractCount: number }> = {};
    let globalBudget = 0;
    let globalPaid = 0;

    contracts.forEach(contract => {
      const channel = contract.fundingChannel;
      const displayPrice = contract.settlementAuditPrice || (contract.contractPrice || 0) + (contract.supplementaryAmount || 0);
      const paid = contract.totalPaid || 0;

      if (!channelMap[channel]) {
        channelMap[channel] = {
          name: channel,
          totalBudget: 0,
          totalPaid: 0,
          contractCount: 0,
        };
      }
      
      channelMap[channel].totalBudget += displayPrice;
      channelMap[channel].totalPaid += paid;
      channelMap[channel].contractCount += 1;

      globalBudget += displayPrice;
      globalPaid += paid;
    });

    // 关键逻辑：过滤掉已 100% 支付完成的经费渠道
    // 只要待付余额大于 0.01 元，就被视为“活跃”渠道显示在看板中
    const activeChannels = Object.values(channelMap).filter(ch => {
      const remaining = ch.totalBudget - ch.totalPaid;
      return remaining > 0.01;
    }).sort((a, b) => b.totalBudget - a.totalBudget);

    return {
      channels: activeChannels,
      globalBudget,
      globalPaid,
      globalProgress: globalBudget > 0 ? (globalPaid / globalBudget) * 100 : 0
    };
  }, [contracts]);

  const chartData = useMemo(() => {
    return stats.channels.map(channel => ({
      name: channel.name,
      value: 1, // 强制等分，Recharts 会自动根据数组长度平分 360 度
      paid: channel.totalPaid,
      budget: channel.totalBudget,
      contractCount: channel.contractCount
    }));
  }, [stats.channels]);

  const selectedData = useMemo(() => {
    if (selectedChannel === "all") return null;
    return chartData.find(d => d.name === selectedChannel);
  }, [chartData, selectedChannel]);

  // 高饱和度糖果色系
  const COLORS = [
    '#FF3D71', // 活力红粉
    '#00E096', // 极光绿
    '#FFAB00', // 琥珀金
    '#0095FF', // 电光蓝
    '#7367F0', // 幻彩紫
    '#FF9F43', // 珊瑚橙
    '#28C76F', // 翠玉绿
    '#826BF8', // 熏衣紫
  ];

  const handleChartClick = (data: any) => {
    if (data && data.name) {
      onSelectChannel(data.name === selectedChannel ? "all" : data.name);
    }
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-[10px] font-black pointer-events-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
      >
        {name.length > 4 ? name.substring(0, 4) + '...' : name}
      </text>
    );
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 12}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 15}
          outerRadius={outerRadius + 17}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2 text-primary uppercase">
          <Landmark className="w-5 h-5" />
          经费渠道看板
        </h2>
        {selectedChannel !== "all" && (
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-destructive/5 text-destructive border-destructive/20 font-black text-[10px] uppercase gap-1 bg-white/50 backdrop-blur-sm"
            onClick={() => onSelectChannel("all")}
          >
            <XCircle className="w-3 h-3" /> 重置筛选
          </Badge>
        )}
      </div>

      <Card className="border-none bg-gradient-to-br from-indigo-50/50 via-white to-rose-50/50 p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-100/40 backdrop-blur-2xl overflow-hidden min-h-[320px] flex flex-col justify-center ring-1 ring-white/60">
        <div className="relative h-[240px] w-full">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {selectedChannel === "all" ? "全局执行率" : "本项进度"}
            </span>
            <span className="text-4xl font-black text-slate-800 tracking-tighter drop-shadow-sm">
              {selectedData 
                ? (selectedData.budget > 0 ? ((selectedData.paid / selectedData.budget) * 100).toFixed(0) : 0)
                : stats.globalProgress.toFixed(0)}%
            </span>
            {stats.channels.length === 0 && (
              <span className="text-[10px] font-black text-emerald-500 uppercase mt-2">
                所有项目已结清
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={stats.channels.length > 1 ? 3 : 0}
                dataKey="value"
                onClick={handleChartClick}
                stroke="none"
                activeShape={renderActiveShape}
                activeIndex={chartData.findIndex(d => d.name === selectedChannel)}
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    style={{ 
                      cursor: 'pointer',
                      filter: selectedChannel !== "all" && selectedChannel !== entry.name ? 'grayscale(0.6) opacity(0.2)' : 'none',
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  />
                ))}
              </Pie>
              <RechartsTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-xl border border-white/50 p-4 rounded-3xl shadow-2xl space-y-2 ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                        <div className="font-black text-xs text-slate-800 uppercase flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].fill }}></div>
                          {data.name}
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          <p className="text-[10px] font-bold text-slate-500">涉及合同：{data.contractCount} 份</p>
                          <div className="h-px bg-slate-100/50 my-1" />
                          <p className="text-[10px] font-black text-blue-600">总预算：¥{data.budget.toLocaleString()}</p>
                          <p className="text-[10px] font-black text-emerald-600">已支付：¥{data.paid.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {selectedData && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-bottom-2 duration-500">
            <div className="p-5 bg-white/80 rounded-[2rem] border border-white shadow-xl shadow-indigo-500/5 space-y-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-blue-200">
                     <TrendingUp className="w-4 h-4 text-white" />
                   </div>
                   <span className="text-xs font-black text-slate-800 uppercase tracking-tight">渠道实时财务名片</span>
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[10px] py-1 px-3 rounded-full">{selectedData.contractCount} 份合同</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">审定总预算</span>
                  <span className="text-sm font-black text-slate-800">¥{selectedData.budget.toLocaleString()}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">累计已拨付</span>
                  <span className="text-sm font-black text-emerald-600">¥{selectedData.paid.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black">
                  <span className="text-slate-400 uppercase tracking-widest">预算执行率</span>
                  <span className="text-indigo-600">{((selectedData.paid / selectedData.budget) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(selectedData.paid / selectedData.budget) * 100} className="h-2 bg-slate-100 shadow-inner" />
                <p className="text-[10px] font-black text-rose-500 text-right mt-1.5 flex items-center justify-end gap-1">
                  待付余额：¥{Math.max(0, selectedData.budget - selectedData.paid).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
