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
import { useRouter } from 'expo-router';
import { Plus, FolderKanban, MapPin, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/types/database.types';

type Project = Database['public']['Tables']['projects']['Row'];

export default function ProjectsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    project_type: '',
    base_contract_amount: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    const subscription = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        fetchProjects
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const handleCreateProject = async () => {
    if (!formData.name || !formData.location || !formData.project_type || !formData.base_contract_amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(formData.base_contract_amount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid contract amount');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('projects').insert({
        user_id: user!.id,
        name: formData.name,
        location: formData.location,
        project_type: formData.project_type,
        base_contract_amount: amount,
      });

      if (error) throw error;

      setModalVisible(false);
      setFormData({
        name: '',
        location: '',
        project_type: '',
        base_contract_amount: '',
      });
      fetchProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Projects</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {projects.length > 0 ? (
          projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              onPress={() => router.push(`/project/${project.id}`)}
            >
              <View style={styles.projectIconContainer}>
                <FolderKanban size={24} color="#2563eb" strokeWidth={2} />
              </View>
              <View style={styles.projectDetails}>
                <Text style={styles.projectName}>{project.name}</Text>
                <View style={styles.projectMeta}>
                  <MapPin size={14} color="#6b7280" strokeWidth={2} />
                  <Text style={styles.projectLocation}>{project.location}</Text>
                </View>
                <View style={styles.projectFooter}>
                  <Text style={styles.projectType}>{project.project_type}</Text>
                  <Text style={styles.projectContract}>
                    ${Number(project.base_contract_amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FolderKanban size={64} color="#d1d5db" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Projects Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first project to start tracking expenses and income
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.createButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        )}
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
              <Text style={styles.modalTitle}>New Project</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#6b7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Project Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Downtown Office Building"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 123 Main St, City"
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Project Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Commercial, Residential"
                  value={formData.project_type}
                  onChangeText={(text) => setFormData({ ...formData, project_type: text })}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Base Contract Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={formData.base_contract_amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, base_contract_amount: text })
                  }
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateProject}
                disabled={creating}
              >
                <Text style={styles.submitButtonText}>
                  {creating ? 'Creating...' : 'Create Project'}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  projectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  projectDetails: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectType: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  projectContract: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  createButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#2563eb',
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
