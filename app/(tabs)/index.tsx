import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, TrendingDown, DollarSign, FolderKanban } from 'lucide-react-native';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useState } from 'react';

const { width } = Dimensions.get('window');
const CARD_PADDING = 24;
const CHART_WIDTH = width - CARD_PADDING * 4;

export default function DashboardScreen() {
  const { data, loading, error } = useDashboardData();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const isPositive = data.totalPortfolioBalance >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Portfolio Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, isPositive ? styles.positive : styles.negative]}>
              ${Math.abs(data.totalPortfolioBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {isPositive ? (
              <TrendingUp size={32} color="#10b981" strokeWidth={2.5} />
            ) : (
              <TrendingDown size={32} color="#ef4444" strokeWidth={2.5} />
            )}
          </View>
          <Text style={styles.balanceSubtext}>
            Across {data.totalProjects} project{data.totalProjects !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <FolderKanban size={24} color="#2563eb" strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{data.totalProjects}</Text>
            <Text style={styles.statLabel}>Active Projects</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <DollarSign size={24} color="#10b981" strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>
              ${data.projectsSummary.reduce((sum, p) => sum + p.totalCredits, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days Activity</Text>
          <View style={styles.chartCard}>
            {data.dailyStats.length > 0 ? (
              <View style={styles.barChart}>
                {data.dailyStats.map((stat, index) => {
                  const maxValue = Math.max(
                    ...data.dailyStats.map((s) => Math.max(s.credits, s.debits)),
                    1
                  );
                  const creditHeight = (stat.credits / maxValue) * 120;
                  const debitHeight = (stat.debits / maxValue) * 120;

                  return (
                    <View key={stat.date} style={styles.barGroup}>
                      <View style={styles.barPair}>
                        <View style={[styles.bar, styles.creditBar, { height: creditHeight || 4 }]} />
                        <View style={[styles.bar, styles.debitBar, { height: debitHeight || 4 }]} />
                      </View>
                      <Text style={styles.barLabel}>
                        {new Date(stat.date).getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>No transactions yet</Text>
            )}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Expenses</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Performance</Text>
          {data.projectsSummary.length > 0 ? (
            data.projectsSummary.map((project) => {
              const profit = project.profit;
              const isProfit = profit >= 0;

              return (
                <TouchableOpacity
                  key={project.projectId}
                  style={styles.projectCard}
                  onPress={() => router.push(`/project/${project.projectId}`)}
                >
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectName}>{project.projectName}</Text>
                    <Text style={[styles.projectProfit, isProfit ? styles.positive : styles.negative]}>
                      {isProfit ? '+' : ''}${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.projectStats}>
                    <View style={styles.projectStat}>
                      <Text style={styles.projectStatLabel}>Income</Text>
                      <Text style={[styles.projectStatValue, { color: '#10b981' }]}>
                        ${project.totalCredits.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                    <View style={styles.projectStat}>
                      <Text style={styles.projectStatLabel}>Expenses</Text>
                      <Text style={[styles.projectStatValue, { color: '#ef4444' }]}>
                        ${project.totalDebits.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <FolderKanban size={48} color="#d1d5db" strokeWidth={1.5} />
              <Text style={styles.emptyStateText}>No projects yet</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/projects')}
              >
                <Text style={styles.createButtonText}>Create Your First Project</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginRight: 12,
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: 16,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barPair: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 4,
  },
  creditBar: {
    backgroundColor: '#10b981',
  },
  debitBar: {
    backgroundColor: '#ef4444',
  },
  barLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  projectProfit: {
    fontSize: 18,
    fontWeight: '700',
  },
  projectStats: {
    flexDirection: 'row',
    gap: 24,
  },
  projectStat: {
    flex: 1,
  },
  projectStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  projectStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
});
