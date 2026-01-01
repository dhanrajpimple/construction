export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          location: string
          project_type: string
          base_contract_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          location: string
          project_type: string
          base_contract_amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          location?: string
          project_type?: string
          base_contract_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          project_id: string
          type: 'credit' | 'debit'
          amount: number
          description: string
          transaction_date: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'credit' | 'debit'
          amount: number
          description: string
          transaction_date?: string
          category?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'credit' | 'debit'
          amount?: number
          description?: string
          transaction_date?: string
          category?: string
          created_at?: string
        }
      }
    }
  }
}
