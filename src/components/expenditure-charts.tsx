
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, BarChart } from "lucide-react";
import { Pie, Cell, ResponsiveContainer, PieChart as RechartsPieChart, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";

type Expenditure = {
    item: string;
    date: string;
    amount: number;
    category: string;
};

const ExpenditureCharts = ({ data }: { data: Expenditure[] }) => {
    const categoryData = useMemo(() => {
        const categoryTotals = data.reduce((acc, curr) => {
            if (!acc[curr.category]) {
                acc[curr.category] = 0;
            }
            acc[curr.category] += curr.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    }, [data]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    return (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><PieChart/> Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full h-[250px]">
                         <ResponsiveContainer>
                            <RechartsPieChart>
                                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                     {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip/>
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><BarChart/> Spending by Item</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="w-full h-[250px]">
                        <ResponsiveContainer>
                            <RechartsBarChart data={data} layout="vertical" margin={{ left: 30, right: 10 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="item" width={100} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default ExpenditureCharts;

    