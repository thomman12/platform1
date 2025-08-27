export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
export type Visibility = 'public' | 'restricted' | 'private';


export interface Database {
  public: {
    Tables: {
      communities: {
        Row: {
          creator_id: string;
          visibility: Visibility;
          id: string;
          name: string;
          description: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string | null;
        };
      };

      posts: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          title: string;
          content: string | null;
          visibility: 'public' | 'private';
          created_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
          title: string;
          content?: string | null;
          visibility?: 'public' | 'private';
          created_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          user_id?: string;
          title?: string;
          content?: string | null;
          visibility?: 'public' | 'private';
          created_at?: string;
        };
      };

       profiles: {
        Row: {
          id: string
          username: string
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string
        }
      }


        post_votes: {
  Row: {
    id: string;
    post_id: string;
    profile_id: string;
    vote_type: 'upvote' | 'downvote';
    created_at: string;
  };
  Insert: {
    post_id: string;
    profile_id: string;
    vote_type: 'upvote' | 'downvote';
  };
  
};

post_chats: {
        Row: {
          id: string;
          pc_post_id: string;
          sender_id: string;
          message: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          pc_post_id: string;
          sender_id: string;
          message: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          pc_post_id?: string;
          sender_id?: string;
          message?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_chats_pc_post_id_fkey';
            columns: ['pc_post_id'];
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_chats_sender_id_fkey';
            columns: ['sender_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
  
      
      audio_rooms: {
  Row: {
    id: string;
    ar_post_id: string | null;
    created_by: string | null;
    created_at: string | null;
  };
  Insert: {
    id?: string;
    ar_post_id?: string | null;
    created_by?: string | null;
    created_at?: string | null;
  };
  Update: {
    id?: string;
    ar_post_id?: string | null;
    created_by?: string | null;
    created_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "audio_rooms_ar_post_id_fkey";
      columns: ["ar_post_id"];
      referencedRelation: "posts";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "audio_rooms_created_by_fkey";
      columns: ["created_by"];
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
};

audio_participants: {
  Row: {
    id: string;
    room_id: string | null;
    ap_profile_id: string | null;
    role: string | null;         // 'listener' | 'speaker'
    joined_at: string | null;
  };
  Insert: {
    id?: string;
    room_id?: string | null;
    ap_profile_id?: string | null;
    role?: string | null;
    joined_at?: string | null;
  };
  Update: {
    id?: string;
    room_id?: string | null;
    ap_profile_id?: string | null;
    role?: string | null;
    joined_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "audio_participants_room_id_fkey";
      columns: ["room_id"];
      referencedRelation: "audio_rooms";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "audio_participants_ap_profile_id_fkey";
      columns: ["ap_profile_id"];
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    }
  ];
};


      // Add more tables here if needed
    };
    Views: {};
    Functions: {};
  };
}
