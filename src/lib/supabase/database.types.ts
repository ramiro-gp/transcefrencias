export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_display_name: string
          actor_id: string | null
          created_at: string
          details: Json | null
          event_id: string
          expense_id: string | null
          id: string
          summary: string
        }
        Insert: {
          action: string
          actor_display_name: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          event_id: string
          expense_id?: string | null
          id?: string
          summary: string
        }
        Update: {
          action?: string
          actor_display_name?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          event_id?: string
          expense_id?: string | null
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
        ]
      }
      event_members: {
        Row: {
          event_id: string
          joined_at: string
          left_at: string | null
          profile_id: string
          rejoin_blocked_at: string | null
          role: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          left_at?: string | null
          profile_id: string
          rejoin_blocked_at?: string | null
          role?: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          left_at?: string | null
          profile_id?: string
          rejoin_blocked_at?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_members_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: string
          last_activity_at: string
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_at?: string
          name: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_at?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expense_participants: {
        Row: {
          event_id: string
          expense_id: string
          participant_id: string
        }
        Insert: {
          event_id: string
          expense_id: string
          participant_id: string
        }
        Update: {
          event_id?: string
          expense_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_participants_expense_fk'
            columns: ['event_id', 'expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['event_id', 'id']
          },
          {
            foreignKeyName: 'expense_participants_participant_fk'
            columns: ['event_id', 'participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['event_id', 'id']
          },
        ]
      }
      expense_payers: {
        Row: {
          amount: number
          event_id: string
          expense_id: string
          participant_id: string
        }
        Insert: {
          amount: number
          event_id: string
          expense_id: string
          participant_id: string
        }
        Update: {
          amount?: number
          event_id?: string
          expense_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_payers_event_id_expense_id_fkey'
            columns: ['event_id', 'expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['event_id', 'id']
          },
          {
            foreignKeyName: 'expense_payers_event_id_participant_id_fkey'
            columns: ['event_id', 'participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['event_id', 'id']
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          concept: string
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          event_id: string
          id: string
          revision: number
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          concept: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          event_id: string
          id?: string
          revision?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          concept?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          event_id?: string
          id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      participants: {
        Row: {
          active: boolean
          created_at: string
          deactivated_at: string | null
          display_name: string
          event_id: string
          id: string
          merged_into_id: string | null
          profile_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          deactivated_at?: string | null
          display_name: string
          event_id: string
          id?: string
          merged_into_id?: string | null
          profile_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          deactivated_at?: string | null
          display_name?: string
          event_id?: string
          id?: string
          merged_into_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'participants_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participants_merged_into_id_fkey'
            columns: ['merged_into_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participants_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          nickname: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          nickname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_event_rejoin: {
        Args: { target_event_id: string; target_profile_id: string }
        Returns: undefined
      }
      create_event: { Args: { event_name: string }; Returns: Json }
      create_expense: {
        Args: {
          expense_amount: number
          expense_category: string
          expense_concept: string
          expense_participant_ids: string[]
          expense_payer_amounts: number[]
          expense_payer_ids: string[]
          target_event_id: string
        }
        Returns: string
      }
      create_manual_participant: {
        Args: { participant_name: string; target_event_id: string }
        Returns: string
      }
      deactivate_participant: {
        Args: { target_participant_id: string }
        Returns: undefined
      }
      delete_expense: {
        Args: { expected_revision: number; target_expense_id: string }
        Returns: undefined
      }
      expel_event_member: {
        Args: { target_event_id: string; target_profile_id: string }
        Returns: undefined
      }
      get_event_invitation: { Args: { target_event_id: string }; Returns: Json }
      get_invitation_preview: {
        Args: { invitation_id: string; invitation_secret: string }
        Returns: Json
      }
      join_event: {
        Args: { invitation_id: string; invitation_secret: string }
        Returns: string
      }
      leave_event: { Args: { target_event_id: string }; Returns: undefined }
      link_manual_participant: {
        Args: { target_participant_id: string; target_profile_id: string }
        Returns: undefined
      }
      rename_event: {
        Args: { event_name: string; target_event_id: string }
        Returns: undefined
      }
      reopen_event_expenses: {
        Args: { expected_status: string; target_event_id: string }
        Returns: string
      }
      rotate_event_invitation: {
        Args: { revoke_only?: boolean; target_event_id: string }
        Returns: Json
      }
      set_coadmin: {
        Args: {
          make_coadmin: boolean
          target_event_id: string
          target_profile_id: string
        }
        Returns: undefined
      }
      transition_event_to_paying: {
        Args: { expected_status: string; target_event_id: string }
        Returns: string
      }
      update_expense: {
        Args: {
          expected_revision: number
          expense_amount: number
          expense_category: string
          expense_concept: string
          expense_participant_ids: string[]
          expense_payer_amounts: number[]
          expense_payer_ids: string[]
          target_expense_id: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
