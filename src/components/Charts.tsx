import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Transaction, PeriodType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface ChartsProps {
  transactions: Transaction[];
  period: PeriodType;
  currentDate: Date;
}

const CATEGORY_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B', // Slate
];

export const Charts: React.FC<ChartsProps> = ({ transactions, period, currentDate }) => {
  if (period === 'Day') return null; // Hidden for Day view per requirements

  // 1. Category breakdown for DEBIT transactions
  const expenseTransactions = transactions.filter((t) => t.type === 'DEBIT');

  const categoryMap: { [cat: string]: number } = {};
  expenseTransactions.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  // 2. Trend Data Calculation
  let trendData: { label: string; Expense: number; Income: number }[] = [];

  if (period === 'Month') {
    // Days 1 .. daysInMonth
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const daysMap: { [day: number]: { Expense: number; Income: number } } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      daysMap[d] = { Expense: 0, Income: 0 };
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        if (daysMap[dayNum]) {
          if (t.type === 'DEBIT') {
            daysMap[dayNum].Expense += t.amount;
          } else {
            daysMap[dayNum].Income += t.amount;
          }
        }
      }
    });

    trendData = Object.entries(daysMap).map(([day, val]) => ({
      label: `Day ${day}`,
      Expense: Math.round(val.Expense * 100) / 100,
      Income: Math.round(val.Income * 100) / 100,
    }));
  } else if (period === 'Year') {
    // Months Jan .. Dec
    const year = currentDate.getFullYear();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthMap: { [m: number]: { Expense: number; Income: number } } = {};
    for (let m = 0; m < 12; m++) {
      monthMap[m] = { Expense: 0, Income: 0 };
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year) {
        const m = d.getMonth();
        if (monthMap[m]) {
          if (t.type === 'DEBIT') {
            monthMap[m].Expense += t.amount;
          } else {
            monthMap[m].Income += t.amount;
          }
        }
      }
    });

    trendData = monthNames.map((name, idx) => ({
      label: name,
      Expense: Math.round(monthMap[idx].Expense * 100) / 100,
      Income: Math.round(monthMap[idx].Income * 100) / 100,
    }));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Category Breakdown (Pie/Donut) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center space-x-2 mb-4">
          <PieIcon className="w-5 h-5 text-indigo-600" />
          <h4 className="font-bold text-slate-800 text-sm sm:text-base">
            Expense Category Breakdown ({period})
          </h4>
        </div>

        {pieData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-400 text-xs italic">
            No expense records available for this period.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Trend Chart (Bar/Area) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h4 className="font-bold text-slate-800 text-sm sm:text-base">
            {period === 'Month' ? 'Daily Spending & Income Trend' : 'Monthly Income vs Expense Trend'}
          </h4>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <RechartsTooltip
                formatter={(value: any) => [formatCurrency(Number(value)), '']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expense" />
              <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
