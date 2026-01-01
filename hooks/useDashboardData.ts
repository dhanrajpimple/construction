import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectSummary {
  projectId: string;
  projectName: string;
  totalCredits: number;
  totalDebits: number;
  profit: number;
}

interface DashboardData {
  totalPortfolioBalance: number;
  totalProjects: number;
  projectsSummary: ProjectSummary[];
  dailyStats: { date: string; credits: number; debits: number }[];
  weeklyStats: { week: string; credits: number; debits: number }[];
  monthlyStats: { month: string; credits: number; debits: number }[];
}

export function useDashboardData() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalPortfolioBalance: 0,
    totalProjects: 0,
    projectsSummary: [],
    dailyStats: [],
    weeklyStats: [],
    monthlyStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id);

        if (projectsError) throw projectsError;

        if (!projects || projects.length === 0) {
          setData({
            totalPortfolioBalance: 0,
            totalProjects: 0,
            projectsSummary: [],
            dailyStats: [],
            weeklyStats: [],
            monthlyStats: [],
          });
          setLoading(false);
          return;
        }

        const projectIds = projects.map((p) => p.id);

        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .in('project_id', projectIds);

        if (transactionsError) throw transactionsError;

        const projectsSummary: ProjectSummary[] = projects.map((project) => {
          const projectTransactions = transactions?.filter(
            (t) => t.project_id === project.id
          ) || [];

          const totalCredits = projectTransactions
            .filter((t) => t.type === 'credit')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          const totalDebits = projectTransactions
            .filter((t) => t.type === 'debit')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          return {
            projectId: project.id,
            projectName: project.name,
            totalCredits,
            totalDebits,
            profit: totalCredits - totalDebits,
          };
        });

        const totalPortfolioBalance = projectsSummary.reduce(
          (sum, p) => sum + p.profit,
          0
        );

        const now = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const dailyStats = last7Days.map((date) => {
          const dayTransactions = transactions?.filter(
            (t) => t.transaction_date === date
          ) || [];

          const credits = dayTransactions
            .filter((t) => t.type === 'credit')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          const debits = dayTransactions
            .filter((t) => t.type === 'debit')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          return { date, credits, debits };
        });

        setData({
          totalPortfolioBalance,
          totalProjects: projects.length,
          projectsSummary,
          dailyStats,
          weeklyStats: [],
          monthlyStats: [],
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const subscription = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        fetchData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        fetchData
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { data, loading, error };
}
