import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type Project = Database['public']['Tables']['projects']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id as string)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!projectData) {
        Alert.alert('Error', 'Project not found');
        router.back();
        return;
      }

      setProject(projectData);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('project_id', id as string)
        .order('transaction_date', { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load project data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel('project-transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `project_id=eq.${id}` },
        fetchData
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateTransaction = async () => {
    if (!formData.amount || !formData.description) {
      Alert.alert('Error', 'Please fill in amount and description');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        project_id: id as string,
        type: transactionType,
        amount,
        description: formData.description,
        category: formData.category,
        transaction_date: formData.transaction_date,
      });

      if (error) throw error;

      setModalVisible(false);
      setFormData({
        amount: '',
        description: '',
        category: '',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create transaction');
    } finally {
      setCreating(false);
    }
  };

  const openModal = (type: 'credit' | 'debit') => {
    setTransactionType(type);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </View>
    );
  }

  if (!project) return null;

  const totalCredits = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDebits = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const currentProfit = totalCredits - totalDebits;
  const isProfit = currentProfit >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.name}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current Profit/Loss</Text>
          <View style={styles.profitRow}>
            <Text style={[styles.profitAmount, isProfit ? styles.positive : styles.negative]}>
              {isProfit ? '+' : ''}$
              {Math.abs(currentProfit).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            {isProfit ? (
              <TrendingUp size={28} color="#10b981" strokeWidth={2.5} />
            ) : (
              <TrendingDown size={28} color="#ef4444" strokeWidth={2.5} />
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                $
                {totalCredits.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>
                $
                {totalDebits.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.creditButton]}
            onPress={() => openModal('credit')}
          >
            <ArrowUpCircle size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Add Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.debitButton]}
            onPress={() => openModal('debit')}
          >
            <ArrowDownCircle size={20} color="#fff" strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length > 0 ? (
            transactions.map((transaction) => {
              const isCredit = transaction.type === 'credit';
              return (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View
                    style={[
                      styles.transactionIcon,
                      isCredit ? styles.creditIcon : styles.debitIcon,
                    ]}
                  >
                    {isCredit ? (
                      <ArrowUpCircle size={20} color="#10b981" strokeWidth={2} />
                    ) : (
                      <ArrowDownCircle size={20} color="#ef4444" strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    {transaction.category && (
                      <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    )}
                    <View style={styles.transactionMeta}>
                      <Calendar size={12} color="#9ca3af" strokeWidth={2} />
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      isCredit ? styles.positive : styles.negative,
                    ]}
                  >
                    {isCredit ? '+' : '-'}$
                    {Number(transaction.amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first income or expense to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {transactionType === 'credit' ? 'Income' : 'Expense'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#6b7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Materials purchase, Labor payment"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Materials, Labor, Equipment"
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.transaction_date}
                  onChangeText={(text) =>
                    setFormData({ ...formData, transaction_date: text })
                  }
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  transactionType === 'credit' ? styles.creditButton : styles.debitButton,
                  creating && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateTransaction}
                disabled={creating}
              >
                <Text style={styles.submitButtonText}>
                  {creating ? 'Adding...' : `Add ${transactionType === 'credit' ? 'Income' : 'Expense'}`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profitAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 12,
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  creditButton: {
    backgroundColor: '#10b981',
  },
  debitButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creditIcon: {
    backgroundColor: '#d1fae5',
  },
  debitIcon: {
    backgroundColor: '#fee2e2',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1a1a1a',
  },
  submitButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
