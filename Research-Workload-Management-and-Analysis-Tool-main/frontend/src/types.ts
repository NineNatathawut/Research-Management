export interface User {
  id: number;
  email: string;
  name_en?: string;
  name_th?: string;
  department?: string;
  position?: string;
  scholar_id?: string;
  scopus_id?: string;
}

export interface PaperAuthor {
  author_entry_id?: number;
  paper_id?: number;
  user_id?: number;
  contribution_percent?: number;
  is_first_author?: boolean;
  is_co_first_author?: boolean;
  is_corresponding?: boolean;
  is_co_corresponding?: boolean;
  author_order?: number;
  status?: 'PENDING' | 'CONFIRMED';
  confirmed_at?: string;
  name?: string;
  author_name?: string;
  affiliation?: string;
}

export interface AuthorFormItem {
  role: string;
  name: string;
  affiliation: string;
  _author_order?: number;
  _is_first_author?: boolean;
  _is_co_first_author?: boolean;
  _is_corresponding?: boolean;
  _is_co_corresponding?: boolean;
}

export interface ParticipantsInfo {
  description?: string;
  sample_size?: string;
}

export interface Paper {
  paper_id: number;
  title: string;
  publish_year?: number;
  publish_date?: string;
  authors_raw?: string;
  authors?: string | (string | PaperAuthor)[];
  paper_authors?: string | (string | PaperAuthor)[];
  author_name?: string;
  cited_by?: number;
  citations?: number;
  scholar_url?: string;
  source?: 'scholar' | 'manual';
  paper_status?: 'DRAFT_AUTO' | 'PENDING_CO_AUTHOR' | 'COMPLETED';
  author_entry?: PaperAuthor;
  totalPercent?: number;
  contribution_percent?: number;
  is_first_author?: boolean;
  is_corresponding?: boolean;
  author_status?: 'PENDING' | 'CONFIRMED';
  study_design?: string;
  participants?: ParticipantsInfo;
  volume?: string;
  issue?: string;
  pages?: string;
  abstract?: string;
  keywords?: string;
  doi?: string;
  journal?: string;
  publication_level?: string;
}

export interface MetadataForm {
  title: string;
  publish_date: string;
  doi: string;
  journal: string;
  publication_level: string;
  authors: AuthorFormItem[];
  volume: string;
  issue: string;
  pages: string;
  abstract: string;
  keywords: string;
  study_design: string;
  participants: ParticipantsInfo;
}

export interface ParsedPosition {
  specialRoles: string[];
  academicRank: string;
}

export interface ConfirmPaperResponse {
  message: string;
  author: PaperAuthor;
  paperStatus: 'COMPLETED' | 'PENDING_CO_AUTHOR';
  totalPercent: number;
}

export interface SyncScholarResponse {
  message: string;
  data: {
    created: Array<{ id: number; title: string }>;
    linked: Array<{ id: number; title: string }>;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
